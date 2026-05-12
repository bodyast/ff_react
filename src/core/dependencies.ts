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

/**
 * Full dependency evaluation with JSON Logic, wildcards, and cascading.
 * Returns fieldId → FieldState overrides.
 */
export function evaluateDependencies(
  params: EvaluateDependenciesParams
): Record<string, Partial<FieldState>> {
  const { schema, data, changedFieldId } = params;
  if (!schema.dependencies?.length) return {};

  const overrides: Record<string, Partial<FieldState>> = {
    ...(params.currentStates ?? {}),
  };
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
        const condMet = evaluateConditions(dep, data, overrides, allFieldIds);
        if (!condMet) continue;

        for (const action of dep.actions ?? []) {
          const targets = resolveTargets(action, data, allFieldIds);
          for (const target of targets) {
            applyAction(action, target, data, overrides, allFieldIds);
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
  return overrides;
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
  // JSON Logic condition
  if (condition.type === "logic" || (condition.value && typeof condition.value === "object")) {
    const result = applyJsonLogic(condition.value, data);
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
    const result = applyJsonLogic(condition.value, data);
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

  if (property === "value") {
    // Value changes are not tracked in FieldState — engine handles data separately
    return;
  }

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

    case "logic":
      return isTruthy(applyJsonLogic(vr.value, data));

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
  if (dep.sources?.includes(fieldId)) return true;
  if (dep.trigger === fieldId) return true;
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
