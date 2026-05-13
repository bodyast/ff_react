import type {
  FormStructure,
  FormDependency,
  DependencyCondition,
  DependencyAction,
  FieldState,
} from "../types/form";
import { applyJsonLogic, isTruthy } from "./jsonLogic";

const isDev =
  typeof globalThis !== "undefined" &&
  (globalThis as Record<string, unknown>)["process"] !== undefined
    ? ((globalThis as Record<string, unknown>)["process"] as { env?: { NODE_ENV?: string } })
        ?.env?.NODE_ENV !== "production"
    : true;

const MAX_DEPTH = 10;

// ---------------------------------------------------------------------------
// Flutter-compatible evaluation context
// ---------------------------------------------------------------------------

/**
 * Mirrors Flutter's `_toLogicObject` / `_createEvaluationContext`.
 *
 * Rules:
 *  - Scalars (string, number, bool, null) → { value: v }
 *  - Arrays → each element is recursively processed
 *  - Objects (Maps) → each value is recursively processed
 *
 * This means JSON Logic conditions from the backend work identically in React
 * and Flutter:
 *   {"var": "field_id.value"} → actual field value
 *   {"var": "field_id"}       → {value: actualValue} (truthy when value exists)
 *   {"var": "donors.0.data.first_name.value"} → string value in a subform entry
 */
function toLogicObject(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(toLogicObject);
  if (v !== null && typeof v === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      result[k] = toLogicObject(val);
    }
    return result;
  }
  return { value: v };
}

/**
 * Detect NormalizedSubformEntry: { form_version_uuid, submitted_at, data }.
 * These are the backend format for subform entries. For JSON Logic evaluation
 * the rules access fields FLAT (e.g. `current.collection_status.value`), so
 * we need to unwrap `.data` to the top level before wrapping in toLogicObject.
 */
function isNormalizedEntry(v: unknown): v is { data: Record<string, unknown> } {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "data" in (v as object) &&
    "form_version_uuid" in (v as object)
  );
}

/**
 * For arrays that contain NormalizedSubformEntry objects, extract .data so that
 * JSON Logic rules can access fields directly (e.g. `current.collection_status`).
 */
function flattenSubformArrays(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && isNormalizedEntry(value[0])) {
      result[key] = value.map((entry) =>
        isNormalizedEntry(entry) ? entry.data : entry
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function buildEvaluationContext(data: Record<string, unknown>): Record<string, unknown> {
  return toLogicObject(flattenSubformArrays(data)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type EvaluateDependenciesParams = {
  schema: FormStructure;
  data: Record<string, unknown>;
  /** Limit evaluation to deps triggered by this field (undefined = all) */
  changedFieldId?: string;
  /** Existing states to start from (updated in place, returned as new object) */
  currentStates?: Record<string, Partial<FieldState>>;
};

export type EvaluateDependenciesResult = {
  /** FieldState overrides: hidden / disabled / readonly / required */
  stateOverrides: Record<string, Partial<FieldState>>;
  /** Computed value overrides: fieldId → new value */
  dataOverrides: Record<string, unknown>;
};

/**
 * Full dependency evaluation with JSON Logic, wildcards, and cascading.
 * Returns both FieldState overrides and computed data (value) overrides.
 */
export function evaluateDependencies(
  params: EvaluateDependenciesParams
): EvaluateDependenciesResult {
  const { schema, data: initialData, changedFieldId } = params;
  if (!schema.dependencies?.length) return { stateOverrides: {}, dataOverrides: {} };

  const stateOverrides: Record<string, Partial<FieldState>> = {
    ...(params.currentStates ?? {}),
  };
  const dataOverrides: Record<string, unknown> = {};
  // workingData merges initial data + any value overrides applied so far (for cascading)
  let workingData = initialData;
  const processed = new Set<string>();

  const allFieldIds = collectAllFieldIds(schema);

  function recurse(fieldId: string | undefined, depth: number): void {
    if (depth > MAX_DEPTH) return;

    const triggerKey = fieldId ?? "__all__";
    if (processed.has(triggerKey)) return;
    processed.add(triggerKey);

    const depsToCheck = fieldId
      ? schema.dependencies!.filter((d) => isTriggeredBy(d, fieldId))
      : schema.dependencies!;

    const affectedFields = new Set<string>();

    for (const dep of depsToCheck) {
      try {
        const condMet = evaluateConditions(dep, workingData, stateOverrides, allFieldIds);
        if (!condMet) continue;

        for (const action of dep.actions ?? []) {
          const targets = resolveTargets(action, workingData, allFieldIds);
          for (const target of targets) {
            if (action.property === "value") {
              // Compute the new value and update workingData for cascading
              const val = resolveActionValue(action, workingData, stateOverrides);
              dataOverrides[target] = val;
              workingData = { ...workingData, [target]: val };
            } else {
              applyAction(action, target, workingData, stateOverrides, allFieldIds);
            }
            affectedFields.add(target.split(".")[0]); // top-level field
          }
        }
      } catch (err) {
        if (isDev) {
          console.warn("[ff-forms] dependency error", dep, err);
        }
      }
    }

    // Cascade: evaluate deps of affected fields
    for (const affected of affectedFields) {
      recurse(affected, depth + 1);
    }
  }

  recurse(changedFieldId, 0);
  return { stateOverrides, dataOverrides };
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function evaluateConditions(
  dep: FormDependency,
  data: Record<string, unknown>,
  _overrides: Record<string, Partial<FieldState>>,
  allFieldIds: string[]
): boolean {
  // Collect all conditions (support both .condition and .conditions)
  const conditions: DependencyCondition[] = [
    ...(dep.conditions ?? []),
    ...(dep.condition ? [dep.condition] : []),
  ];

  // Legacy single trigger with no conditions → always fire when that field changes
  if (conditions.length === 0 && (dep.trigger || dep.sources?.length)) {
    return true;
  }
  if (conditions.length === 0) return true;

  const op = dep.conditionOperator ?? "and";
  const results = conditions.map((c) =>
    evaluateSingleCondition(c, data, _overrides, allFieldIds)
  );

  return op === "or" ? results.some(Boolean) : results.every(Boolean);
}

function evaluateSingleCondition(
  condition: DependencyCondition,
  data: Record<string, unknown>,
  _overrides: Record<string, Partial<FieldState>>,
  _allFieldIds: string[]
): boolean {
  // JSON Logic condition — use Flutter-compatible wrapped context
  if (condition.type === "logic" || (condition.value && typeof condition.value === "object")) {
    const ctx = buildEvaluationContext(data);
    const result = applyJsonLogic(condition.value, ctx);
    return isTruthy(result);
  }

  // Field-based condition (compare another field's state/value)
  if (condition.type === "field" && condition.field) {
    const sourceVal = condition.value;
    const fieldVal = data[condition.field];
    return fieldVal == sourceVal;
  }

  // Legacy operator-based condition
  if (condition.field && condition.operator) {
    const fieldVal = data[condition.field];
    return evaluateLegacyOperator(condition.operator, fieldVal, condition.value);
  }

  // Bare value — treat as JSON Logic
  if (condition.value !== undefined) {
    const ctx = buildEvaluationContext(data);
    const result = applyJsonLogic(condition.value, ctx);
    return isTruthy(result);
  }

  return true;
}

function evaluateLegacyOperator(
  op: string,
  fieldValue: unknown,
  condValue: unknown
): boolean {
  switch (op) {
    case "eq":   return fieldValue == condValue;
    case "neq":  return fieldValue != condValue;
    case "gt":   return Number(fieldValue) > Number(condValue);
    case "lt":   return Number(fieldValue) < Number(condValue);
    case "gte":  return Number(fieldValue) >= Number(condValue);
    case "lte":  return Number(fieldValue) <= Number(condValue);
    case "in":   return Array.isArray(condValue) ? condValue.includes(fieldValue) : false;
    case "nin":  return Array.isArray(condValue) ? !condValue.includes(fieldValue) : true;
    case "empty":
      return fieldValue === undefined || fieldValue === null || fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0);
    case "not_empty":
      return !(fieldValue === undefined || fieldValue === null || fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0));
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Target resolution (wildcard support)
// ---------------------------------------------------------------------------

/**
 * Expand wildcard targets like "subform_id.*.child_field"
 * into ["subform_id.0.child_field", "subform_id.1.child_field", ...]
 */
function resolveTargets(
  action: DependencyAction,
  data: Record<string, unknown>,
  allFieldIds: string[]
): string[] {
  const rawTarget = action.target ?? action.field ?? "";
  if (!rawTarget) return [];

  if (!rawTarget.includes(".*")) return [rawTarget];

  // Pattern: subformField.*.childField
  const parts = rawTarget.split(".*.");
  if (parts.length !== 2) return [rawTarget];

  const [parentId, childId] = parts;
  const instances = data[parentId];

  if (Array.isArray(instances)) {
    return instances.map((_, i) => `${parentId}.${i}.${childId}`);
  }

  // No instances yet — collect from known static field ids
  return allFieldIds
    .filter((id) => id.startsWith(`${parentId}.`) && id.endsWith(`.${childId}`));
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

function applyAction(
  action: DependencyAction,
  target: string,
  data: Record<string, unknown>,
  _overrides: Record<string, Partial<FieldState>>,
  _allFieldIds: string[]
): void {
  const property = action.property;

  // "value" is handled by the caller (stored in dataOverrides)
  if (property === "value") return;

  const stateProps: (keyof FieldState)[] = ["hidden", "disabled", "readonly", "required"];
  if (!stateProps.includes(property as keyof FieldState)) {
    if (isDev) {
      console.warn(`[ff-forms] unknown dependency property: ${property}`);
    }
    return;
  }

  const resolved = resolveActionValue(action, data, _overrides);
  _overrides[target] = {
    ..._overrides[target],
    [property]: Boolean(resolved),
  };
}

function resolveActionValue(
  action: DependencyAction,
  data: Record<string, unknown>,
  overrides: Record<string, Partial<FieldState>>
): unknown {
  const vr = action.valueResolver;

  if (!vr) {
    // Legacy direct value
    return action.value;
  }

  switch (vr.type) {
    case "raw":
      return vr.value;

    case "field": {
      const sourceId = String(vr.value ?? "");
      const sourceProp = vr.sourceProperty ?? "value";
      if (sourceProp === "value") return data[sourceId];
      // Property from field state
      return (overrides[sourceId] as Record<string, unknown> | undefined)?.[sourceProp];
    }

    case "logic": {
      const ctx = buildEvaluationContext(data);
      // Return raw computed value — callers wrap in Boolean() for state props,
      // or store as-is for value props.
      return applyJsonLogic(vr.value, ctx);
    }

    case "list":
      // Lookup list mapping — return raw; consumer resolves
      return vr.value;

    default:
      return vr.value;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTriggeredBy(dep: FormDependency, fieldId: string): boolean {
  if (dep.trigger === fieldId) return true;
  if (dep.sources) {
    for (const src of dep.sources) {
      if (src === fieldId) return true;
      // Wildcard pattern: "donors.*.collection_status" is triggered when "donors" changes
      if (src.includes(".*")) {
        const parent = src.split(".*")[0];
        if (fieldId === parent || fieldId.startsWith(parent + ".")) return true;
      }
    }
  }
  return false;
}

function collectAllFieldIds(schema: FormStructure): string[] {
  const ids: string[] = [];
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        ids.push(field.id);
      }
    }
  }
  return ids;
}
