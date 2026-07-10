// src/react/FFForm.tsx
import { useState as useState7, useMemo as useMemo2 } from "react";

// src/react/useFFForm.ts
import { useCallback, useEffect, useReducer, useRef } from "react";

// src/core/defaults.ts
function applyDefaultValues(schema, data) {
  const result = { ...data };
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const hasValue = result[field.id] !== void 0 && result[field.id] !== null;
        const def = field.settings?.defaultValue ?? field.settings?.default_value;
        if (!hasValue && def !== void 0) result[field.id] = def;
      }
    }
  }
  return result;
}

// src/core/jsonLogic.ts
function applyJsonLogic(rule, data) {
  try {
    return _apply(rule, data);
  } catch {
    return null;
  }
}
function _apply(rule, data) {
  if (rule === null || rule === void 0) return rule;
  if (typeof rule !== "object" || Array.isArray(rule)) return rule;
  const obj = rule;
  const keys = Object.keys(obj);
  if (keys.length === 0) return obj;
  const op = keys[0];
  const rawArgs = obj[op];
  const a = Array.isArray(rawArgs) ? rawArgs.map((arg) => _apply(arg, data)) : [_apply(rawArgs, data)];
  switch (op) {
    // -----------------------------------------------------------------------
    // Variable access
    // -----------------------------------------------------------------------
    case "var": {
      const path = a[0];
      if (path === "" || path === null || path === void 0) {
        return "" in data ? data[""] : data;
      }
      const parts = String(path).split(".");
      let cur = data;
      for (const part of parts) {
        if (cur === null || cur === void 0) return a[1] ?? null;
        cur = cur[part];
      }
      if ((cur === null || cur === void 0) && String(path).endsWith(".value")) {
        const shorterPath = String(path).slice(0, -6);
        let cur2 = data;
        for (const part of shorterPath.split(".")) {
          if (cur2 === null || cur2 === void 0) return a[1] ?? null;
          cur2 = cur2[part];
        }
        return cur2 ?? a[1] ?? null;
      }
      return cur ?? a[1] ?? null;
    }
    // -----------------------------------------------------------------------
    // Equality
    // -----------------------------------------------------------------------
    case "==":
      return a[0] == a[1];
    // intentional loose
    case "===":
      return a[0] === a[1];
    case "!=":
      return a[0] != a[1];
    case "!==":
      return a[0] !== a[1];
    // -----------------------------------------------------------------------
    // Comparison
    // -----------------------------------------------------------------------
    case "<":
      return a.length === 3 ? a[0] < a[1] && a[1] < a[2] : a[0] < a[1];
    case "<=":
      return a.length === 3 ? a[0] <= a[1] && a[1] <= a[2] : a[0] <= a[1];
    case ">":
      return a.length === 3 ? a[0] > a[1] && a[1] > a[2] : a[0] > a[1];
    case ">=":
      return a.length === 3 ? a[0] >= a[1] && a[1] >= a[2] : a[0] >= a[1];
    // -----------------------------------------------------------------------
    // Logic
    // -----------------------------------------------------------------------
    case "!":
      return !a[0];
    case "!!":
      return !!a[0];
    case "and": {
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      let last = true;
      for (const arg of arr) {
        last = _apply(arg, data);
        if (!last) return last;
      }
      return last;
    }
    case "or": {
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      let last = false;
      for (const arg of arr) {
        last = _apply(arg, data);
        if (last) return last;
      }
      return last;
    }
    case "if":
    case "?:": {
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      for (let i = 0; i < arr.length - 1; i += 2) {
        if (_apply(arr[i], data)) return _apply(arr[i + 1], data);
      }
      return arr.length % 2 === 1 ? _apply(arr[arr.length - 1], data) : null;
    }
    // -----------------------------------------------------------------------
    // Array / membership
    // -----------------------------------------------------------------------
    case "in": {
      const [needle, haystack] = a;
      if (typeof haystack === "string") return haystack.includes(String(needle));
      if (Array.isArray(haystack)) return haystack.includes(needle);
      return false;
    }
    case "some": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return false;
      return list.some(
        (item) => _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "all": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return false;
      if (list.length === 0) return false;
      return list.every(
        (item) => _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "filter": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return [];
      return list.filter(
        (item) => _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "map": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return [];
      return list.map(
        (item) => _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "reduce": {
      const [arr2, subRule, initial] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return _apply(initial, data);
      return list.reduce(
        (acc, cur) => _apply(subRule, { ...data, accumulator: acc, current: cur }),
        _apply(initial, data)
      );
    }
    case "merge":
      return a.reduce(
        (acc, val) => Array.isArray(val) ? [...acc, ...val] : [...acc, val],
        []
      );
    case "count":
      return Array.isArray(a[0]) ? a[0].length : 0;
    // -----------------------------------------------------------------------
    // Arithmetic
    // -----------------------------------------------------------------------
    case "+":
      return a.reduce((s, v) => s + (Number(v) || 0), 0);
    case "-":
      return a.length === 1 ? -a[0] : a[0] - a[1];
    case "*":
      return a.reduce((p, v) => p * (Number(v) || 0), 1);
    case "/":
      return a[0] / a[1];
    case "%":
      return a[0] % a[1];
    case "min":
      return Math.min(...a);
    case "max":
      return Math.max(...a);
    case "abs":
      return Math.abs(a[0]);
    // -----------------------------------------------------------------------
    // String
    // -----------------------------------------------------------------------
    case "cat":
      return a.map(String).join("");
    case "substr": {
      const str = String(a[0] ?? "");
      const start = Number(a[1]) || 0;
      const len = a[2] !== void 0 ? Number(a[2]) : void 0;
      return len !== void 0 ? str.substr(start, len) : str.substr(start);
    }
    case "log":
      return a[0];
    // -----------------------------------------------------------------------
    // Missing
    // -----------------------------------------------------------------------
    case "missing": {
      const keys2 = Array.isArray(a[0]) ? a[0] : a;
      return keys2.filter((k) => {
        const val = _apply({ var: k }, data);
        return val === null || val === void 0 || val === "";
      });
    }
    case "missing_some": {
      const [min, keys2] = a;
      const missing = keys2.filter((k) => {
        const val = _apply({ var: k }, data);
        return val === null || val === void 0 || val === "";
      });
      return missing.length >= min ? missing : [];
    }
    // -----------------------------------------------------------------------
    // Fallback
    // -----------------------------------------------------------------------
    default:
      return null;
  }
}
function isTruthy(value) {
  if (value === false || value === 0 || value === "" || value === null || value === void 0) {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// src/core/dependencies.ts
var isDev = typeof globalThis !== "undefined" && globalThis["process"] !== void 0 ? globalThis["process"]?.env?.NODE_ENV !== "production" : true;
var MAX_DEPTH = 10;
function toLogicObject(v) {
  if (Array.isArray(v)) return v.map(toLogicObject);
  if (v !== null && typeof v === "object") {
    const result = {};
    for (const [k, val] of Object.entries(v)) {
      result[k] = toLogicObject(val);
    }
    return result;
  }
  return { value: v };
}
function isNormalizedEntry(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && "data" in v && "form_version_uuid" in v;
}
function flattenSubformArrays(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && isNormalizedEntry(value[0])) {
      result[key] = value.map(
        (entry) => isNormalizedEntry(entry) ? entry.data : entry
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
function buildEvaluationContext(data) {
  return toLogicObject(flattenSubformArrays(data));
}
function evaluateDependencies(params) {
  const { schema, data: initialData, changedFieldId } = params;
  if (!schema.dependencies?.length) return { stateOverrides: {}, dataOverrides: {} };
  const stateOverrides = {
    ...params.currentStates ?? {}
  };
  const dataOverrides = {};
  let workingData = initialData;
  const processed = /* @__PURE__ */ new Set();
  const allFieldIds = collectAllFieldIds(schema);
  function recurse(fieldId, depth) {
    if (depth > MAX_DEPTH) return;
    const triggerKey = fieldId ?? "__all__";
    if (processed.has(triggerKey)) return;
    processed.add(triggerKey);
    const depsToCheck = fieldId ? schema.dependencies.filter((d) => isTriggeredBy(d, fieldId)) : schema.dependencies;
    const affectedFields = /* @__PURE__ */ new Set();
    for (const dep of depsToCheck) {
      try {
        const condMet = evaluateConditions(dep, workingData, stateOverrides, allFieldIds);
        if (!condMet) continue;
        for (const action of dep.actions ?? []) {
          const targets = resolveTargets(action, workingData, allFieldIds);
          for (const target of targets) {
            if (action.property === "value") {
              const val = resolveActionValue(action, workingData, stateOverrides);
              dataOverrides[target] = val;
              workingData = { ...workingData, [target]: val };
            } else {
              applyAction(action, target, workingData, stateOverrides, allFieldIds);
            }
            affectedFields.add(target.split(".")[0]);
          }
        }
      } catch (err) {
        if (isDev) {
          console.warn("[ff-forms] dependency error", dep, err);
        }
      }
    }
    for (const affected of affectedFields) {
      recurse(affected, depth + 1);
    }
  }
  recurse(changedFieldId, 0);
  return { stateOverrides, dataOverrides };
}
function evaluateConditions(dep, data, _overrides, allFieldIds) {
  const conditions = [
    ...dep.conditions ?? [],
    ...dep.condition ? [dep.condition] : []
  ];
  if (conditions.length === 0 && (dep.trigger || dep.sources?.length)) {
    return true;
  }
  if (conditions.length === 0) return true;
  const op = dep.conditionOperator ?? "and";
  const results = conditions.map(
    (c) => evaluateSingleCondition(c, data, _overrides, allFieldIds)
  );
  return op === "or" ? results.some(Boolean) : results.every(Boolean);
}
function evaluateSingleCondition(condition, data, _overrides, _allFieldIds) {
  if (condition.type === "logic" || condition.value && typeof condition.value === "object") {
    const ctx = buildEvaluationContext(data);
    const result = applyJsonLogic(condition.value, ctx);
    return isTruthy(result);
  }
  if (condition.type === "field" && condition.field) {
    const sourceVal = condition.value;
    const fieldVal = data[condition.field];
    return fieldVal == sourceVal;
  }
  if (condition.field && condition.operator) {
    const fieldVal = data[condition.field];
    return evaluateLegacyOperator(condition.operator, fieldVal, condition.value);
  }
  if (condition.value !== void 0) {
    const ctx = buildEvaluationContext(data);
    const result = applyJsonLogic(condition.value, ctx);
    return isTruthy(result);
  }
  return true;
}
function evaluateLegacyOperator(op, fieldValue, condValue) {
  switch (op) {
    case "eq":
      return fieldValue == condValue;
    case "neq":
      return fieldValue != condValue;
    case "gt":
      return Number(fieldValue) > Number(condValue);
    case "lt":
      return Number(fieldValue) < Number(condValue);
    case "gte":
      return Number(fieldValue) >= Number(condValue);
    case "lte":
      return Number(fieldValue) <= Number(condValue);
    case "in":
      return Array.isArray(condValue) ? condValue.includes(fieldValue) : false;
    case "nin":
      return Array.isArray(condValue) ? !condValue.includes(fieldValue) : true;
    case "empty":
      return fieldValue === void 0 || fieldValue === null || fieldValue === "" || Array.isArray(fieldValue) && fieldValue.length === 0;
    case "not_empty":
      return !(fieldValue === void 0 || fieldValue === null || fieldValue === "" || Array.isArray(fieldValue) && fieldValue.length === 0);
    default:
      return false;
  }
}
function resolveTargets(action, data, allFieldIds) {
  const rawTarget = action.target ?? action.field ?? "";
  if (!rawTarget) return [];
  if (!rawTarget.includes(".*")) return [rawTarget];
  const parts = rawTarget.split(".*.");
  if (parts.length !== 2) return [rawTarget];
  const [parentId, childId] = parts;
  const instances = data[parentId];
  if (Array.isArray(instances)) {
    return instances.map((_, i) => `${parentId}.${i}.${childId}`);
  }
  return allFieldIds.filter((id) => id.startsWith(`${parentId}.`) && id.endsWith(`.${childId}`));
}
function applyAction(action, target, data, _overrides, _allFieldIds) {
  const property = action.property;
  if (property === "value") return;
  const stateProps = ["hidden", "disabled", "readonly", "required"];
  if (!stateProps.includes(property)) {
    if (isDev) {
      console.warn(`[ff-forms] unknown dependency property: ${property}`);
    }
    return;
  }
  const resolved = resolveActionValue(action, data, _overrides);
  _overrides[target] = {
    ..._overrides[target],
    [property]: Boolean(resolved)
  };
}
function resolveActionValue(action, data, overrides) {
  const vr = action.valueResolver;
  if (!vr) {
    return action.value;
  }
  switch (vr.type) {
    case "raw":
      return vr.value;
    case "field": {
      const sourceId = String(vr.value ?? "");
      const sourceProp = vr.sourceProperty ?? "value";
      if (sourceProp === "value") return data[sourceId];
      return overrides[sourceId]?.[sourceProp];
    }
    case "logic": {
      const ctx = buildEvaluationContext(data);
      return applyJsonLogic(vr.value, ctx);
    }
    case "list":
      return vr.value;
    default:
      return vr.value;
  }
}
function isTriggeredBy(dep, fieldId) {
  if (dep.trigger === fieldId) return true;
  if (dep.sources) {
    for (const src of dep.sources) {
      if (src === fieldId) return true;
      if (src.includes(".*")) {
        const parent = src.split(".*")[0];
        if (fieldId === parent || fieldId.startsWith(parent + ".")) return true;
      }
    }
  }
  return false;
}
function collectAllFieldIds(schema) {
  const ids = [];
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        ids.push(field.id);
      }
    }
  }
  return ids;
}

// src/core/validation.ts
function validateForm(params) {
  const { schema, data, fieldStates } = params;
  const errors = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        if (fieldStates[field.id]?.hidden) continue;
        const errs = validateField(field, data[field.id], fieldStates[field.id]);
        if (errs.length) errors[field.id] = errs;
      }
    }
  }
  return errors;
}
function validateField(field, value, state) {
  const errors = [];
  const s = field.settings ?? {};
  const isRequired = state?.required ?? s.required ?? false;
  const label = field.label ?? field.title ?? field.id;
  const empty = isEmpty(value, field.type);
  if (isRequired && empty) {
    errors.push(`${label} is required`);
    return errors;
  }
  if (empty) return errors;
  if (field.type === "number" || field.type === "integer") {
    const n = Number(value);
    if (isNaN(n)) {
      errors.push(`${label} must be a number`);
    } else {
      if (s.min !== void 0 && s.min != null && n < Number(s.min)) errors.push(`${label} must be at least ${s.min}`);
      if (s.max !== void 0 && s.max != null && n > Number(s.max)) errors.push(`${label} must be at most ${s.max}`);
    }
  }
  if (field.type === "text" || field.type === "textarea") {
    const str = String(value);
    if (s.min !== void 0 && str.length < Number(s.min)) errors.push(`${label} must be at least ${s.min} characters`);
    if (s.max !== void 0 && str.length > Number(s.max)) errors.push(`${label} must be at most ${s.max} characters`);
  }
  if (field.type === "file" || field.type === "image" || field.type === "media") {
    const files = Array.isArray(value) ? value : [];
    if (s.minFiles !== void 0 && files.length < s.minFiles) errors.push(`${label} requires at least ${s.minFiles} file(s)`);
    if (s.maxFiles !== void 0 && files.length > s.maxFiles) errors.push(`${label} allows at most ${s.maxFiles} file(s)`);
  }
  return errors;
}
function isEmpty(value, type) {
  if (value === void 0 || value === null || value === "") return true;
  if ((type === "file" || type === "image" || type === "media") && Array.isArray(value)) return value.length === 0;
  return false;
}

// src/core/normalize.ts
function normalizeSubmissionData(params) {
  const { schema, data, submittedAt = (/* @__PURE__ */ new Date()).toISOString() } = params;
  const result = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const value = data[field.id];
        if (field.type === "subform") {
          const allowMany = Boolean(field.settings?.allowMany ?? field.settings?.allow_many ?? field.settings?.isMultiple ?? field.settings?.is_multiple);
          result[field.id] = normalizeSubform(field.settings?.id, value, schema, submittedAt, allowMany);
        } else {
          result[field.id] = value;
        }
      }
    }
  }
  return result;
}
function isNormalizedEntry2(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && "data" in e && "form_version_uuid" in e;
}
function extractData(e) {
  if (isNormalizedEntry2(e)) return e.data;
  return e;
}
function normalizeSubform(key, value, parentSchema, ts, allowMany) {
  const uuid = key ? parentSchema.subforms?.[key]?.uuid ?? "" : "";
  if (allowMany) {
    const arr = Array.isArray(value) ? value : [];
    return arr.map((e) => ({ form_version_uuid: uuid, submitted_at: ts, data: extractData(e) }));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { form_version_uuid: uuid, submitted_at: ts, data: extractData(value) };
  }
  return void 0;
}

// src/core/payload.ts
function buildSubmissionPayload(params) {
  const { schema, data, submissionId, formVersionUuid, isFinal, metadata = {} } = params;
  const submittedAt = (/* @__PURE__ */ new Date()).toISOString();
  const normalizedData = normalizeSubmissionData({ schema, data, submittedAt });
  const payload = {
    formVersionUuid: formVersionUuid ?? schema.uuid,
    submittedAt: isFinal ? submittedAt : "",
    data: normalizedData,
    metadata
  };
  if (submissionId) payload.uuid = submissionId;
  return payload;
}

// src/core/engine.ts
var DEFAULT_STATE = { hidden: false, disabled: false, readonly: false, required: false };
function createFormEngine(params) {
  const { schema, initialData = {}, submissionId, formVersionUuid } = params;
  let data = applyDefaultValues(schema, initialData);
  let fieldStates = computeStates(schema, data);
  const listeners = /* @__PURE__ */ new Set();
  function notify() {
    listeners.forEach((l) => l());
  }
  function recompute() {
    const { stateOverrides, dataOverrides } = evaluateDependencies({ schema, data });
    if (Object.keys(dataOverrides).length > 0) {
      data = { ...data, ...dataOverrides };
    }
    fieldStates = buildFieldStates(schema, stateOverrides);
  }
  return {
    changeField(fieldId, value) {
      data = { ...data, [fieldId]: value };
      recompute();
      notify();
    },
    getData() {
      return { ...data };
    },
    getFieldState(fieldId) {
      return fieldStates[fieldId] ?? { ...DEFAULT_STATE };
    },
    getAllFieldStates() {
      return { ...fieldStates };
    },
    validate() {
      return validateForm({ schema, data, fieldStates });
    },
    buildPayload({ isFinal }) {
      return buildSubmissionPayload({ schema, data, submissionId, formVersionUuid: formVersionUuid ?? schema.uuid, isFinal });
    },
    reset() {
      data = applyDefaultValues(schema, initialData);
      recompute();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
function buildFieldStates(schema, stateOverrides) {
  const states = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      const sectionOv = stateOverrides[section.id] ?? {};
      states[section.id] = {
        hidden: sectionOv.hidden ?? Boolean(section.settings?.hidden),
        disabled: sectionOv.disabled ?? false,
        readonly: sectionOv.readonly ?? false,
        required: sectionOv.required ?? false
      };
      for (const field of section.fields) {
        const schemaState = {
          hidden: Boolean(field.settings?.hidden),
          disabled: Boolean(field.settings?.disabled),
          readonly: Boolean(field.settings?.readonly),
          required: Boolean(field.settings?.required)
        };
        const ov = stateOverrides[field.id] ?? {};
        states[field.id] = {
          hidden: ov.hidden ?? schemaState.hidden,
          disabled: ov.disabled ?? schemaState.disabled,
          readonly: ov.readonly ?? schemaState.readonly,
          required: ov.required ?? schemaState.required
        };
      }
    }
  }
  return states;
}
function computeStates(schema, data) {
  const { stateOverrides } = evaluateDependencies({ schema, data });
  return buildFieldStates(schema, stateOverrides);
}

// src/api/client.ts
var ENDPOINTS = {
  formStructure: (id) => `v1/form_flex/proxy/forms/${id}`,
  submission: (id) => `v1/form_flex/proxy/submissions/${id}`,
  submissions: () => `v1/form_flex/proxy/submissions`,
  media: (sid) => `v1/form_flex/proxy/submissions/${sid}/media`,
  mediaItem: (sid, mid) => `v1/form_flex/proxy/submissions/${sid}/media/${mid}`,
  lookup: (id) => `v1/form_flex/proxy/lookup-lists/${id}`
};
function buildUrl(base, proxy, path) {
  return `${(proxy ?? base ?? "").replace(/\/$/, "")}/${path}`;
}
function authHeaders(key) {
  const base = { "Content-Type": "application/json", "Accept": "application/json" };
  if (!key) return base;
  return { ...base, Authorization: `Bearer ${key}` };
}
function createDefaultAdapter(config = {}) {
  const doFetch = config.fetchFn ?? globalThis.fetch.bind(globalThis);
  const extraInit = config.requestInit ?? {};
  const proxy = config.proxyPath;
  async function req(url, opts) {
    const init = { ...extraInit, ...opts, headers: { ...extraInit.headers, ...opts.headers } };
    const res = await doFetch(url, init);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${t}`);
    }
    return res.json();
  }
  function u(base, path) {
    return buildUrl(base, proxy, path);
  }
  function unwrap(raw) {
    return raw && typeof raw === "object" && "data" in raw && raw.data !== void 0 ? raw.data : raw;
  }
  return {
    async fetchFormStructure({ apiBaseUrl, apiKey, formVersionUuid }) {
      return unwrap(await req(u(apiBaseUrl, ENDPOINTS.formStructure(formVersionUuid)), { method: "GET", headers: authHeaders(apiKey) }));
    },
    async fetchSubmission({ apiBaseUrl, apiKey, submissionId }) {
      return unwrap(await req(u(apiBaseUrl, ENDPOINTS.submission(submissionId)), { method: "GET", headers: authHeaders(apiKey) }));
    },
    async createSubmission({ apiBaseUrl, apiKey, payload }) {
      return unwrap(await req(u(apiBaseUrl, ENDPOINTS.submissions()), { method: "POST", headers: authHeaders(apiKey), body: JSON.stringify(payload) }));
    },
    async updateSubmission({ apiBaseUrl, apiKey, submissionId, payload }) {
      return unwrap(await req(u(apiBaseUrl, ENDPOINTS.submission(submissionId)), { method: "PUT", headers: authHeaders(apiKey), body: JSON.stringify(payload) }));
    },
    async submitForm({ apiBaseUrl, apiKey, payload, isFinal }) {
      const hasUuid = Boolean(payload.uuid);
      return req(hasUuid ? u(apiBaseUrl, ENDPOINTS.submission(payload.uuid)) : u(apiBaseUrl, ENDPOINTS.submissions()), { method: hasUuid ? "PUT" : "POST", headers: authHeaders(apiKey), body: JSON.stringify({ ...payload, isFinal }) });
    },
    async uploadMedia({ apiBaseUrl, apiKey, submissionId, fieldId, file }) {
      const form = new FormData();
      form.append("file", file);
      form.append("fieldId", fieldId);
      const headers = { "Accept": "application/json", ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {} };
      const path = submissionId ? ENDPOINTS.media(submissionId) : ENDPOINTS.submissions();
      const res = await doFetch(u(apiBaseUrl, path), { ...extraInit, method: "POST", headers: { ...extraInit.headers, ...headers }, body: form });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Upload failed HTTP ${res.status}: ${t}`);
      }
      const json = await res.json();
      const uuid = json.data?.uuid ?? json.uuid;
      if (!uuid) throw new Error("Upload response missing uuid");
      return { uuid };
    },
    async deleteMedia({ apiBaseUrl, apiKey, submissionId, mediaUuid }) {
      if (!submissionId) throw new Error("submissionId required");
      await doFetch(u(apiBaseUrl, ENDPOINTS.mediaItem(submissionId, mediaUuid)), { ...extraInit, method: "DELETE", headers: { ...extraInit.headers, ...authHeaders(apiKey) } });
    },
    async fetchLookupList({ apiBaseUrl, apiKey, listId }) {
      return unwrap(await req(u(apiBaseUrl, ENDPOINTS.lookup(listId)), { method: "GET", headers: authHeaders(apiKey) }));
    }
  };
}
var defaultApiAdapter = createDefaultAdapter();
function resolveAdapter(partial) {
  const base = partial?.fetchFn || partial?.requestInit || partial?.proxyPath ? createDefaultAdapter({ fetchFn: partial.fetchFn, requestInit: partial.requestInit, proxyPath: partial.proxyPath }) : defaultApiAdapter;
  if (!partial) return base;
  return {
    fetchFormStructure: partial.fetchFormStructure ?? base.fetchFormStructure,
    fetchSubmission: partial.fetchSubmission ?? base.fetchSubmission,
    createSubmission: partial.createSubmission ?? base.createSubmission,
    updateSubmission: partial.updateSubmission ?? base.updateSubmission,
    submitForm: partial.submitForm ?? base.submitForm,
    uploadMedia: partial.uploadMedia ?? base.uploadMedia,
    deleteMedia: partial.deleteMedia ?? base.deleteMedia,
    fetchLookupList: partial.fetchLookupList ?? base.fetchLookupList
  };
}
async function resolveEffectiveApiKey(apiKey, getApiKey) {
  if (getApiKey) {
    const r = await getApiKey();
    return r ?? null;
  }
  return apiKey ?? null;
}

// src/react/useFFForm.ts
var initialState = { loading: false, error: null, schema: null, data: {}, fieldStates: {}, validationErrors: {} };
function reducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, error: null, schema: action.schema, data: action.data, fieldStates: action.fieldStates };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "ENGINE_UPDATE":
      return { ...state, data: action.data, fieldStates: action.fieldStates };
    case "SET_ERRORS":
      return { ...state, validationErrors: action.errors };
    case "CLEAR_ERRORS":
      return { ...state, validationErrors: {} };
    default:
      return state;
  }
}
function useFFForm(props) {
  const {
    apiBaseUrl,
    apiKey,
    getApiKey,
    formId,
    formVersionUuid,
    submissionId,
    schema: schemaProp,
    formData,
    initialData,
    mode = "create",
    autoLoad = true,
    apiAdapter,
    onChange,
    onSubmit,
    onDraftSubmit,
    onFinalSubmit,
    onSubmitSuccess,
    onSubmitError,
    onLoadError,
    onReady,
    onUploadMedia
  } = props;
  const [state, dispatch] = useReducer(reducer, initialState);
  const engineRef = useRef(null);
  const readyFired = useRef(false);
  const adapter = resolveAdapter(apiAdapter);
  const getKey = useCallback(() => resolveEffectiveApiKey(apiKey, getApiKey), [apiKey, getApiKey]);
  const load = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const key = await getKey();
      let schema;
      if (schemaProp) {
        schema = schemaProp;
      } else if (formVersionUuid) {
        schema = await adapter.fetchFormStructure({ apiBaseUrl, apiKey: key, formVersionUuid });
      } else {
        throw new Error("Provide `schema` prop or `formVersionUuid`");
      }
      let submissionData = {};
      if (formData) {
        const isSubmission = formData !== null && typeof formData === "object" && "data" in formData;
        const nested = isSubmission ? formData.data : void 0;
        submissionData = nested ? { ...nested } : { ...formData };
      }
      if (initialData) {
        submissionData = { ...submissionData, ...initialData };
      }
      if ((mode === "edit" || mode === "readonly") && submissionId) {
        const sub = await adapter.fetchSubmission({ apiBaseUrl, apiKey: key, submissionId });
        submissionData = { ...submissionData, ...sub.data ?? {} };
      }
      const engine = createFormEngine({ schema, initialData: submissionData, submissionId, formVersionUuid: formVersionUuid ?? schema.uuid });
      engineRef.current = engine;
      dispatch({ type: "LOAD_SUCCESS", schema, data: engine.getData(), fieldStates: engine.getAllFieldStates() });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      dispatch({ type: "LOAD_ERROR", error });
      onLoadError?.(error);
    }
  }, [adapter, apiBaseUrl, formData, formId, formVersionUuid, getKey, initialData, mode, onLoadError, schemaProp, submissionId]);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    return engine.subscribe(() => {
      const data = engine.getData();
      dispatch({ type: "ENGINE_UPDATE", data, fieldStates: engine.getAllFieldStates() });
      onChange?.(data);
    });
  }, [state.schema, onChange]);
  useEffect(() => {
    if (!state.schema || readyFired.current) return;
    readyFired.current = true;
    onReady?.({
      data: engineRef.current?.getData() ?? {},
      fieldStates: engineRef.current?.getAllFieldStates() ?? {},
      validationErrors: {},
      schema: state.schema,
      changeField,
      submitDraft,
      submitFinal,
      reset,
      reload
    });
  }, [state.schema]);
  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.type === "submit") {
        doSubmit(true).then((r) => {
          console.log("submit success", r);
        });
      }
    };
    document.addEventListener("ff-forms:action", handler);
    return () => {
      document.removeEventListener("ff-forms:action", handler);
    };
  }, []);
  useEffect(() => {
    if (autoLoad) void load();
  }, []);
  const changeField = useCallback((fieldId, value) => {
    engineRef.current?.changeField(fieldId, value);
  }, []);
  const isVisible = useCallback((id) => !state.fieldStates[id]?.hidden, [state.fieldStates]);
  const isDisabled = useCallback((id) => state.fieldStates[id]?.disabled ?? false, [state.fieldStates]);
  const isReadonly = useCallback((id) => mode === "readonly" || (state.fieldStates[id]?.readonly ?? false), [mode, state.fieldStates]);
  const isRequired = useCallback((id) => state.fieldStates[id]?.required ?? false, [state.fieldStates]);
  const doSubmit = useCallback(async (isFinal) => {
    const engine = engineRef.current;
    if (!engine) return;
    dispatch({ type: "CLEAR_ERRORS" });
    if (isFinal) {
      const errors = engine.validate();
      if (Object.keys(errors).length) {
        dispatch({ type: "SET_ERRORS", errors });
        onSubmitError?.(new Error("Validation failed"));
        return;
      }
    }
    const payload = engine.buildPayload({ isFinal });
    try {
      if (onSubmit) {
        const result = await onSubmit(payload);
        onSubmitSuccess?.(result ?? payload);
      } else {
        if (isFinal) await onFinalSubmit?.(payload);
        else await onDraftSubmit?.(payload);
        const key = await getKey();
        const result = await adapter.submitForm({ apiBaseUrl, apiKey: key, payload, isFinal });
        onSubmitSuccess?.(result);
      }
    } catch (err) {
      onSubmitError?.(err);
    }
  }, [adapter, apiBaseUrl, getKey, onSubmit, onDraftSubmit, onFinalSubmit, onSubmitError, onSubmitSuccess]);
  const submitDraft = useCallback(() => doSubmit(false), [doSubmit]);
  const submitFinal = useCallback(() => doSubmit(true), [doSubmit]);
  const reset = useCallback(() => {
    engineRef.current?.reset();
    dispatch({ type: "CLEAR_ERRORS" });
  }, []);
  const reload = useCallback(() => load(), [load]);
  const uploadMediaForField = useCallback(async (fieldId, file) => {
    if (onUploadMedia) {
      return onUploadMedia(file, fieldId);
    }
    const key = await getKey();
    return adapter.uploadMedia({ apiBaseUrl, apiKey: key, submissionId, fieldId, file });
  }, [adapter, apiBaseUrl, getKey, onUploadMedia, submissionId]);
  const deleteMediaItem = useCallback(async (mediaUuid) => {
    const key = await getKey();
    return adapter.deleteMedia({ apiBaseUrl, apiKey: key, submissionId, mediaUuid });
  }, [adapter, apiBaseUrl, getKey, submissionId]);
  const fetchLookupList = useCallback(async (listId) => {
    const key = await getKey();
    return adapter.fetchLookupList({ apiBaseUrl, apiKey: key, listId });
  }, [adapter, apiBaseUrl, getKey]);
  return {
    loading: state.loading,
    error: state.error,
    schema: state.schema,
    data: state.data,
    fieldStates: state.fieldStates,
    validationErrors: state.validationErrors,
    changeField,
    submitDraft,
    submitFinal,
    reset,
    reload,
    isVisible,
    isDisabled,
    isReadonly,
    isRequired,
    uploadMediaForField,
    deleteMediaItem,
    fetchLookupList
  };
}

// src/react/PageListView.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function PageListView({
  pages,
  fieldStates,
  validationErrors,
  data,
  onSelectPage
}) {
  function pageErrorCount(page) {
    return page.sections.flatMap((s) => s.fields).filter(
      (f) => validationErrors[f.id]?.length
    ).length;
  }
  function pageMissingCount(page) {
    return page.sections.flatMap((s) => s.fields).filter((f) => {
      const state = fieldStates[f.id];
      if (state?.hidden) return false;
      return state?.required && !data[f.id];
    }).length;
  }
  function pageFieldCount(page) {
    return page.sections.flatMap(
      (s) => s.fields.filter((f) => !fieldStates[f.id]?.hidden)
    ).length;
  }
  return /* @__PURE__ */ jsx("div", { className: "ff-form__page-list", children: pages.map((page, idx) => {
    const errors = pageErrorCount(page);
    const missing = pageMissingCount(page);
    const total = pageFieldCount(page);
    return /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: [
          "ff-form__page-card",
          errors > 0 ? "ff-form__page-card--error" : ""
        ].filter(Boolean).join(" "),
        onClick: () => onSelectPage(page.id),
        children: [
          /* @__PURE__ */ jsx("span", { className: "ff-form__page-card-number", children: idx + 1 }),
          /* @__PURE__ */ jsxs("span", { className: "ff-form__page-card-info", children: [
            /* @__PURE__ */ jsx("span", { className: "ff-form__page-card-title", children: page.title ?? `Page ${idx + 1}` }),
            page.description && /* @__PURE__ */ jsx("span", { className: "ff-form__page-card-desc", children: page.description }),
            /* @__PURE__ */ jsxs("span", { className: "ff-form__page-card-meta", children: [
              total,
              " field",
              total !== 1 ? "s" : "",
              page.sections.length > 1 && ` \xB7 ${page.sections.length} sections`
            ] })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "ff-form__page-card-right", children: [
            errors > 0 ? /* @__PURE__ */ jsxs("span", { className: "ff-form__page-card-badge ff-form__page-card-badge--error", children: [
              errors,
              " error",
              errors !== 1 ? "s" : ""
            ] }) : missing > 0 ? /* @__PURE__ */ jsxs("span", { className: "ff-form__page-card-badge ff-form__page-card-badge--warn", children: [
              missing,
              " required"
            ] }) : null,
            /* @__PURE__ */ jsx("span", { className: "ff-form__page-card-arrow", "aria-hidden": "true", children: "\u203A" })
          ] })
        ]
      },
      page.id
    );
  }) });
}

// src/react/SectionAccordion.tsx
import { useState as useState6 } from "react";

// src/react/fields/TextField.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function TextField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange
}) {
  const settings = field.settings ?? {};
  const sizeType = settings.type;
  const rows = sizeType === "small" ? 1 : sizeType === "big" ? 5 : 3;
  const commonProps = {
    id: field.id,
    className: "ff-form__input",
    value: typeof value === "string" ? value : "",
    placeholder: field.placeholder ?? "",
    disabled,
    readOnly: readonly,
    required,
    "aria-required": required
  };
  if (rows === 1) {
    return /* @__PURE__ */ jsx2(
      "input",
      {
        type: "text",
        ...commonProps,
        onChange: (e) => onChange(e.target.value)
      }
    );
  }
  return /* @__PURE__ */ jsx2(
    "textarea",
    {
      ...commonProps,
      className: "ff-form__textarea",
      rows,
      onChange: (e) => onChange(e.target.value)
    }
  );
}

// src/react/fields/TextAreaField.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function TextAreaField({ field, value, disabled, readonly, required, onChange }) {
  const rows = field.settings?.rows ?? 4;
  return /* @__PURE__ */ jsx3(
    "textarea",
    {
      id: field.id,
      className: "ff-form__textarea",
      value: typeof value === "string" ? value : "",
      placeholder: field.placeholder ?? "",
      disabled,
      readOnly: readonly,
      required,
      "aria-required": required,
      rows,
      onChange: (e) => onChange(e.target.value)
    }
  );
}

// src/react/fields/NumberField.tsx
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function NumberField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange
}) {
  const settings = field.settings ?? {};
  const isInteger = field.type === "integer";
  const isCounter = Boolean(settings.isCounter ?? settings.is_counter);
  const step = settings.step !== void 0 ? Number(settings.step) : isInteger ? 1 : void 0;
  const min = settings.min !== void 0 ? Number(settings.min) : void 0;
  const max = settings.max !== void 0 ? Number(settings.max) : void 0;
  const num = value !== void 0 && value !== null && value !== "" ? Number(value) : NaN;
  function parse(raw) {
    if (raw === "") return void 0;
    const n = isInteger ? parseInt(raw, 10) : parseFloat(raw);
    return isNaN(n) ? void 0 : n;
  }
  function increment(delta) {
    const current = isNaN(num) ? 0 : num;
    const next = current + delta * (step ?? 1);
    const clamped = min !== void 0 && next < min ? min : max !== void 0 && next > max ? max : next;
    onChange(isInteger ? Math.round(clamped) : clamped);
  }
  if (isCounter) {
    return /* @__PURE__ */ jsxs2("div", { className: "ff-form__counter", children: [
      /* @__PURE__ */ jsx4(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--counter",
          disabled: disabled || readonly || min !== void 0 && !isNaN(num) && num <= min,
          "aria-label": "Decrease",
          onClick: () => increment(-1),
          children: "\u2212"
        }
      ),
      /* @__PURE__ */ jsx4("span", { className: "ff-form__counter-value", children: isNaN(num) ? min ?? 0 : num }),
      /* @__PURE__ */ jsx4(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--counter",
          disabled: disabled || readonly || max !== void 0 && !isNaN(num) && num >= max,
          "aria-label": "Increase",
          onClick: () => increment(1),
          children: "+"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsx4(
    "input",
    {
      id: field.id,
      type: "number",
      className: "ff-form__input ff-form__input--number",
      value: !isNaN(num) ? num : "",
      placeholder: field.placeholder ?? "",
      disabled,
      readOnly: readonly,
      required,
      "aria-required": required,
      min,
      max,
      step: step ?? "any",
      onChange: (e) => onChange(parse(e.target.value))
    }
  );
}

// src/react/fields/SelectField.tsx
import { useEffect as useEffect2, useState, useRef as useRef2 } from "react";
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function SelectField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  fetchLookupList
}) {
  const settings = field.settings ?? {};
  const isMultiple = Boolean(settings.isMultiple ?? settings.is_multiple ?? settings.allowMany ?? settings.allow_many);
  const staticOptions = (field.options?.length ? field.options : void 0) ?? settings.options ?? [];
  const [options, setOptions] = useState(staticOptions);
  const [lookupLoading, setLookupLoading] = useState(false);
  const fetchedIdRef = useRef2(null);
  useEffect2(() => {
    const source = settings.source;
    const sourceId = source?.id ?? source?.listId;
    if (staticOptions.length > 0 || !sourceId || fetchedIdRef.current === sourceId) return;
    setLookupLoading(true);
    fetchedIdRef.current = sourceId;
    let settled = false;
    if (fetchLookupList) {
      fetchLookupList(sourceId).then((res) => {
        if (settled) return;
        settled = true;
        const items = res?.data?.items || res?.items || [];
        const labelKey = source?.label || "label";
        const valueKey = source?.value || "value";
        const mapped = items.map((item) => ({
          label: String(item[labelKey] ?? ""),
          value: String(item[valueKey] ?? "")
        }));
        setOptions(mapped);
        setLookupLoading(false);
      }).catch(() => {
        if (settled) return;
        settled = true;
        setLookupLoading(false);
      });
      return;
    }
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLookupLoading(false);
      }
    }, 1e4);
    const event = new CustomEvent("ff-forms:fetchLookupList", {
      bubbles: true,
      detail: {
        listId: sourceId,
        fieldId: field.id,
        onResult: (items) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setOptions(items);
          setLookupLoading(false);
        },
        onError: () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setLookupLoading(false);
        }
      }
    });
    document.dispatchEvent(event);
    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, [field.id, settings.source, staticOptions.length, fetchLookupList]);
  const selectedValues = Array.isArray(value) ? value.map(String) : value !== void 0 && value !== null ? [String(value)] : [];
  function handleChange(e) {
    if (isMultiple) {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      onChange(selected);
    } else {
      onChange(e.target.value === "" ? void 0 : e.target.value);
    }
  }
  if (lookupLoading) {
    return /* @__PURE__ */ jsx5("div", { className: "ff-form__select-loading", children: "Loading options\u2026" });
  }
  return /* @__PURE__ */ jsxs3(
    "select",
    {
      id: field.id,
      className: "ff-form__select",
      multiple: isMultiple,
      value: isMultiple ? selectedValues : selectedValues[0] ?? "",
      disabled: disabled || readonly,
      required,
      "aria-required": required,
      onChange: handleChange,
      children: [
        !isMultiple && /* @__PURE__ */ jsx5("option", { value: "", children: field.placeholder ?? "\u2014 Select \u2014" }),
        options.map((opt) => /* @__PURE__ */ jsx5(
          "option",
          {
            value: String(opt.value),
            disabled: Boolean(opt.disabled),
            children: opt.label
          },
          String(opt.value)
        ))
      ]
    }
  );
}

// src/react/fields/CheckboxField.tsx
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
function CheckboxField({
  field,
  value,
  disabled,
  readonly,
  onChange
}) {
  const settings = field.settings ?? {};
  const isSwitch = Boolean(settings.isSwitch ?? settings.is_switch);
  const isMultiple = Boolean(settings.isMultiple ?? settings.is_multiple ?? settings.allowMany ?? settings.allow_many);
  const options = (field.options?.length ? field.options : void 0) ?? settings.options ?? [];
  if (isSwitch) {
    const checked = Boolean(value);
    return /* @__PURE__ */ jsxs4("label", { className: "ff-form__switch-label", children: [
      /* @__PURE__ */ jsx6(
        "input",
        {
          id: field.id,
          type: "checkbox",
          className: "ff-form__switch-input",
          checked,
          disabled: disabled || readonly,
          onChange: (e) => onChange(e.target.checked)
        }
      ),
      /* @__PURE__ */ jsx6("span", { className: "ff-form__switch-track", "aria-hidden": "true", children: /* @__PURE__ */ jsx6("span", { className: "ff-form__switch-thumb" }) }),
      settings.label !== false && (field.label ?? field.title) && /* @__PURE__ */ jsx6("span", { className: "ff-form__switch-text", children: field.label ?? field.title })
    ] });
  }
  if (options.length > 0) {
    let toggle2 = function(optVal) {
      if (disabled || readonly) return;
      const idx = selected.findIndex((v) => String(v) === String(optVal));
      if (isMultiple) {
        const next = idx === -1 ? [...selected, optVal] : selected.filter((v) => String(v) !== String(optVal));
        onChange(next);
      } else {
        onChange(idx === -1 ? optVal : void 0);
      }
    };
    var toggle = toggle2;
    const selected = Array.isArray(value) ? value : value !== void 0 && value !== null ? [value] : [];
    return /* @__PURE__ */ jsx6("div", { className: "ff-form__checkbox-group", role: "group", children: options.map((opt) => {
      const checked = selected.some((v) => String(v) === String(opt.value));
      const id = `${field.id}-${opt.value}`;
      return /* @__PURE__ */ jsxs4("label", { className: "ff-form__checkbox-label", htmlFor: id, children: [
        /* @__PURE__ */ jsx6(
          "input",
          {
            id,
            type: isMultiple ? "checkbox" : "radio",
            name: isMultiple ? void 0 : field.id,
            className: isMultiple ? "ff-form__checkbox" : "ff-form__radio",
            checked,
            disabled: disabled || readonly || Boolean(opt.disabled),
            onChange: () => toggle2(opt.value)
          }
        ),
        /* @__PURE__ */ jsx6("span", { className: "ff-form__checkbox-text", children: opt.label })
      ] }, String(opt.value));
    }) });
  }
  return /* @__PURE__ */ jsxs4("label", { className: "ff-form__checkbox-label", htmlFor: field.id, children: [
    /* @__PURE__ */ jsx6(
      "input",
      {
        id: field.id,
        type: "checkbox",
        className: "ff-form__checkbox",
        checked: Boolean(value),
        disabled: disabled || readonly,
        onChange: (e) => onChange(e.target.checked)
      }
    ),
    settings.label !== false && /* @__PURE__ */ jsx6("span", { className: "ff-form__checkbox-text", children: field.label ?? field.title ?? "" })
  ] });
}

// src/react/fields/DateField.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
function DateField({ field, value, disabled, readonly, required, onChange }) {
  const settings = field.settings ?? {};
  const displayFormat = settings.displayFormat ?? settings.display_format;
  const isTimeOnly = displayFormat === "H:i";
  const includeTime = field.type === "datetime";
  function toInputValue(v) {
    if (!v) return "";
    const s = String(v);
    if (isTimeOnly) return s.length > 5 ? s.slice(11, 16) : s;
    return includeTime ? s.slice(0, 16) : s.slice(0, 10);
  }
  const inputType = isTimeOnly ? "time" : includeTime ? "datetime-local" : "date";
  return /* @__PURE__ */ jsx7(
    "input",
    {
      id: field.id,
      type: inputType,
      className: "ff-form__input ff-form__input--date",
      value: toInputValue(value),
      disabled,
      readOnly: readonly,
      required,
      "aria-required": required,
      onChange: (e) => onChange(e.target.value || void 0)
    }
  );
}

// src/react/fields/MediaField.tsx
import { useEffect as useEffect3, useRef as useRef3, useState as useState2 } from "react";
import { Fragment, jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
function MediaField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  uploadMedia,
  deleteMedia,
  fetchMedia
}) {
  const inputRef = useRef3(null);
  const objectUrlsRef = useRef3([]);
  const requestedFetchesRef = useRef3(/* @__PURE__ */ new Set());
  const [uploadErrors, setUploadErrors] = useState2([]);
  const [fetchErrors, setFetchErrors] = useState2({});
  const [fetchingMedia, setFetchingMedia] = useState2({});
  const [resolvedMedia, setResolvedMedia] = useState2({});
  const [viewerEntry, setViewerEntry] = useState2(null);
  const settings = field.settings ?? {};
  useEffect3(() => {
    return () => {
      objectUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  useEffect3(() => {
    if (!viewerEntry) return;
    function closeOnEscape(event) {
      if (event.key === "Escape") setViewerEntry(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [viewerEntry]);
  const isImage = field.type === "image";
  const maxFiles = settings.maxFiles ?? settings.max_files;
  const allowMany = Boolean(
    settings.allowMany ?? settings.allow_many ?? settings.isMultiple ?? settings.is_multiple ?? (maxFiles !== void 0 && maxFiles > 1)
  );
  const allowedFormats = settings.allowedFormats ?? settings.allowed_formats;
  const entries = normalizeEntries(value);
  useEffect3(() => {
    if (!fetchMedia) return;
    let cancelled = false;
    entries.forEach((entry) => {
      if (!entry.uuid || entry.url || requestedFetchesRef.current.has(entry.uuid)) return;
      requestedFetchesRef.current.add(entry.uuid);
      setFetchingMedia((prev) => ({ ...prev, [entry.uuid]: true }));
      setFetchErrors((prev) => {
        const next = { ...prev };
        delete next[entry.uuid];
        return next;
      });
      Promise.resolve(fetchMedia(entry.uuid)).then((result) => {
        if (cancelled) return;
        setResolvedMedia((prev) => ({
          ...prev,
          [entry.uuid]: normalizeFetchResult(result, entry)
        }));
      }).catch((err) => {
        if (cancelled) return;
        setFetchErrors((prev) => ({
          ...prev,
          [entry.uuid]: err instanceof Error ? err.message : "Failed to fetch media"
        }));
        setResolvedMedia((prev) => ({ ...prev, [entry.uuid]: {} }));
      }).finally(() => {
        if (cancelled) return;
        setFetchingMedia((prev) => ({ ...prev, [entry.uuid]: false }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [entries, fetchMedia]);
  async function handleFiles(files) {
    if (!files || files.length === 0 || !uploadMedia) return;
    setUploadErrors([]);
    const newEntries = [...entries];
    const errors = [];
    for (const file of Array.from(files)) {
      if (maxFiles !== void 0 && newEntries.length >= maxFiles) break;
      try {
        const result = await uploadMedia(file);
        const mediaId = result.uuid ?? result.url ?? "";
        const objectUrl = result.url ?? URL.createObjectURL(file);
        if (!result.url) objectUrlsRef.current.push(objectUrl);
        newEntries.push({ uuid: mediaId, name: file.name, url: objectUrl, mimeType: file.type });
      } catch (err) {
        errors.push(`Failed to upload "${file.name}": ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
    if (errors.length > 0) setUploadErrors(errors);
    onChange(allowMany ? newEntries : newEntries[0]);
    if (inputRef.current) inputRef.current.value = "";
  }
  async function handleRemove(uuid) {
    if (deleteMedia) {
      try {
        await deleteMedia(uuid);
      } catch {
      }
    }
    const next = entries.filter((e) => e.uuid !== uuid);
    onChange(allowMany ? next : next[0] ?? null);
  }
  const canAdd = !readonly && !disabled && (maxFiles === void 0 || entries.length < maxFiles);
  const accept = allowedFormats ? allowedFormats.map((f) => `.${f}`).join(",") : isImage ? "image/*" : void 0;
  function normalizeEntries(input) {
    const rawEntries = Array.isArray(input) ? input : input ? [input] : [];
    return rawEntries.map((item) => {
      if (typeof item === "string") return item ? { uuid: item } : null;
      if (!item || typeof item !== "object") return null;
      const raw = item;
      const uuid = firstString(
        raw.uuid,
        raw.fileUuid,
        raw.file_uuid,
        raw.mediaUuid,
        raw.media_uuid,
        raw.id,
        raw.url
      );
      if (!uuid) return null;
      return {
        uuid,
        name: firstString(raw.name, raw.fileName, raw.file_name, raw.originalName, raw.original_name),
        url: firstString(raw.url, raw.src, raw.href),
        placeholderUrl: firstString(raw.placeholderUrl, raw.placeholder_url, raw.thumbnailUrl, raw.thumbnail_url),
        mimeType: firstString(raw.mimeType, raw.mime_type),
        contentType: firstString(raw.contentType, raw.content_type),
        type: firstString(raw.type)
      };
    }).filter((entry) => entry !== null);
  }
  function firstString(...values) {
    for (const item of values) {
      if (typeof item === "string" && item.length > 0) return item;
    }
    return void 0;
  }
  function normalizeFetchResult(result, entry) {
    if (!result) return {};
    if (typeof result === "string") return { url: result };
    if (result instanceof Blob) {
      const objectUrl = URL.createObjectURL(result);
      objectUrlsRef.current.push(objectUrl);
      return {
        url: objectUrl,
        name: result instanceof File ? result.name : entry.name,
        mimeType: result.type || getEntryMimeType(entry)
      };
    }
    const blob = result.blob ?? result.file;
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(objectUrl);
      return {
        url: result.url ?? objectUrl,
        name: result.name ?? (blob instanceof File ? blob.name : entry.name),
        mimeType: result.mimeType ?? result.contentType ?? result.type ?? blob.type ?? getEntryMimeType(entry)
      };
    }
    return {
      url: result.url,
      name: result.name,
      mimeType: result.mimeType ?? result.contentType ?? result.type
    };
  }
  function getEntryMimeType(entry) {
    return entry.mimeType ?? entry.contentType ?? (entry.type?.includes("/") ? entry.type : void 0);
  }
  function getDisplayMedia(entry) {
    const resolved = resolvedMedia[entry.uuid];
    const url = entry.url ?? resolved?.url;
    const thumbUrl = entry.placeholderUrl ?? url;
    const name = entry.name ?? resolved?.name ?? entry.uuid;
    const mimeType = resolved?.mimeType ?? getEntryMimeType(entry);
    return {
      url,
      thumbUrl,
      name,
      mimeType,
      isImage: isImage || isImageMedia(name, thumbUrl, mimeType),
      isPdf: isPdfMedia(name, url, mimeType),
      isVideo: Boolean(mimeType?.startsWith("video/")),
      isAudio: Boolean(mimeType?.startsWith("audio/"))
    };
  }
  function getExtension(value2) {
    if (!value2) return "";
    const clean = value2.split("?")[0].split("#")[0];
    const index = clean.lastIndexOf(".");
    return index >= 0 ? clean.slice(index + 1).toLowerCase() : "";
  }
  function isImageMedia(name, url, mimeType) {
    if (mimeType?.startsWith("image/")) return true;
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"].includes(
      getExtension(url) || getExtension(name)
    );
  }
  function isPdfMedia(name, url, mimeType) {
    return mimeType === "application/pdf" || getExtension(url) === "pdf" || getExtension(name) === "pdf";
  }
  function renderMediaPreview(entry) {
    const media = getDisplayMedia(entry);
    if (media.isImage && media.thumbUrl) {
      return /* @__PURE__ */ jsx8(
        "img",
        {
          src: media.thumbUrl,
          alt: media.name,
          className: "ff-form__media-preview"
        }
      );
    }
    const label = media.isPdf ? "PDF" : media.isVideo ? "VID" : media.isAudio ? "AUD" : "FILE";
    return /* @__PURE__ */ jsx8("span", { className: "ff-form__media-file-icon", "aria-hidden": "true", children: label });
  }
  return /* @__PURE__ */ jsxs5("div", { className: "ff-form__media-field", children: [
    canAdd && /* @__PURE__ */ jsxs5(Fragment, { children: [
      /* @__PURE__ */ jsx8(
        "input",
        {
          ref: inputRef,
          type: "file",
          id: field.id,
          className: "ff-form__file-input",
          accept,
          multiple: allowMany,
          required: required && entries.length === 0,
          "aria-required": required,
          style: { display: "none" },
          onChange: (e) => void handleFiles(e.target.files)
        }
      ),
      /* @__PURE__ */ jsx8(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--upload",
          onClick: () => inputRef.current?.click(),
          children: isImage ? "Upload image" : "Upload file"
        }
      )
    ] }),
    entries.length > 0 && /* @__PURE__ */ jsx8("ul", { className: "ff-form__media-list", children: entries.map((entry) => {
      const media = getDisplayMedia(entry);
      return /* @__PURE__ */ jsxs5("li", { className: "ff-form__media-item", children: [
        /* @__PURE__ */ jsxs5(
          "button",
          {
            type: "button",
            className: "ff-form__media-open",
            onClick: () => setViewerEntry(entry),
            "aria-label": `Open ${media.name}`,
            children: [
              renderMediaPreview(entry),
              /* @__PURE__ */ jsxs5("span", { className: "ff-form__media-meta", children: [
                /* @__PURE__ */ jsx8("span", { className: "ff-form__media-name", children: media.name }),
                fetchingMedia[entry.uuid] && /* @__PURE__ */ jsx8("span", { className: "ff-form__media-status", children: "Loading media..." }),
                fetchErrors[entry.uuid] && /* @__PURE__ */ jsx8("span", { className: "ff-form__media-status ff-form__media-status--error", children: fetchErrors[entry.uuid] })
              ] })
            ]
          }
        ),
        !readonly && !disabled && /* @__PURE__ */ jsx8(
          "button",
          {
            type: "button",
            className: "ff-form__btn ff-form__btn--remove",
            onClick: () => void handleRemove(entry.uuid),
            "aria-label": `Remove ${entry.name ?? entry.uuid}`,
            children: "\u2715"
          }
        )
      ] }, entry.uuid);
    }) }),
    viewerEntry && /* @__PURE__ */ jsx8(
      "div",
      {
        className: "ff-form__media-viewer",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": getDisplayMedia(viewerEntry).name,
        onMouseDown: (event) => {
          if (event.currentTarget === event.target) setViewerEntry(null);
        },
        children: /* @__PURE__ */ jsxs5("div", { className: "ff-form__media-viewer-panel", children: [
          /* @__PURE__ */ jsxs5("div", { className: "ff-form__media-viewer-header", children: [
            /* @__PURE__ */ jsx8("span", { className: "ff-form__media-viewer-title", children: getDisplayMedia(viewerEntry).name }),
            /* @__PURE__ */ jsx8(
              "button",
              {
                type: "button",
                className: "ff-form__btn ff-form__btn--media-close",
                onClick: () => setViewerEntry(null),
                children: "Close"
              }
            )
          ] }),
          /* @__PURE__ */ jsx8("div", { className: "ff-form__media-viewer-body", children: (() => {
            const media = getDisplayMedia(viewerEntry);
            if (fetchingMedia[viewerEntry.uuid] && !media.url) {
              return /* @__PURE__ */ jsx8("span", { className: "ff-form__media-viewer-empty", children: "Loading media..." });
            }
            if (media.isImage && media.url) {
              return /* @__PURE__ */ jsx8("img", { src: media.url, alt: media.name, className: "ff-form__media-viewer-image" });
            }
            if (media.isPdf && media.url) {
              return /* @__PURE__ */ jsx8("iframe", { src: media.url, title: media.name, className: "ff-form__media-viewer-frame" });
            }
            if (media.isVideo && media.url) {
              return /* @__PURE__ */ jsx8("video", { src: media.url, className: "ff-form__media-viewer-video", controls: true });
            }
            if (media.isAudio && media.url) {
              return /* @__PURE__ */ jsx8("audio", { src: media.url, className: "ff-form__media-viewer-audio", controls: true });
            }
            return /* @__PURE__ */ jsxs5("div", { className: "ff-form__media-viewer-empty", children: [
              /* @__PURE__ */ jsx8("span", { children: fetchErrors[viewerEntry.uuid] ?? "Preview is not available for this file." }),
              media.url && /* @__PURE__ */ jsx8(
                "a",
                {
                  className: "ff-form__media-viewer-link",
                  href: media.url,
                  target: "_blank",
                  rel: "noreferrer",
                  children: "Open file"
                }
              )
            ] });
          })() })
        ] })
      }
    ),
    entries.length === 0 && (readonly || disabled) && /* @__PURE__ */ jsx8("span", { className: "ff-form__media-empty", children: "No files" }),
    uploadErrors.map((msg, i) => /* @__PURE__ */ jsx8("span", { className: "ff-form__error", role: "alert", children: msg }, i))
  ] });
}

// src/react/fields/SubFormField.tsx
import { useMemo, useState as useState3 } from "react";
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
function isNormalized(entry) {
  return entry !== null && typeof entry === "object" && !Array.isArray(entry) && "data" in entry && "form_version_uuid" in entry;
}
function entryData(entry) {
  return isNormalized(entry) ? entry.data : entry;
}
function patchEntry(entry, fieldId, val) {
  if (isNormalized(entry)) {
    return { ...entry, data: { ...entry.data, [fieldId]: val } };
  }
  return { ...entry, [fieldId]: val };
}
function newEntry(subformUuid, existingEntries) {
  const useNormalized = existingEntries.length === 0 || isNormalized(existingEntries[0]);
  if (useNormalized) {
    return { form_version_uuid: subformUuid, submitted_at: null, data: {} };
  }
  return {};
}
function SubFormField({
  field,
  value,
  disabled,
  readonly,
  onChange,
  parentSchema,
  validationErrors = {},
  uploadMediaForField,
  deleteMedia,
  fetchMedia,
  fetchLookupList,
  renderers
}) {
  const settings = field.settings ?? {};
  const allowMany = Boolean(settings.allowMany ?? settings.allow_many ?? settings.isMultiple);
  const textAdd = settings.textAdd ?? settings.text_add ?? `+ Add ${field.label ?? field.title ?? "entry"}`;
  const textRemove = settings.textRemove ?? settings.text_remove ?? "Remove";
  const subformKey = settings.id;
  const subformSchema = subformKey && parentSchema?.subforms ? parentSchema.subforms[subformKey] : void 0;
  console.log("[SubFormField]", {
    fieldId: field.id,
    fieldLabel: field.label,
    settings,
    allowMany,
    subformKey,
    hasParentSchema: !!parentSchema,
    hasSubforms: !!parentSchema?.subforms,
    subformSchemaFound: !!subformSchema,
    valueType: Array.isArray(value) ? `array[${value.length}]` : typeof value
  });
  const rawEntries = useMemo(() => {
    if (allowMany) {
      return Array.isArray(value) ? value : [];
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return [value];
    }
    return [{ form_version_uuid: subformSchema?.uuid ?? "", submitted_at: null, data: {} }];
  }, [allowMany, value, subformSchema?.uuid]);
  const entryFieldStates = useMemo(() => {
    if (!subformSchema) return rawEntries.map(() => ({}));
    return rawEntries.map((e) => computeStates(subformSchema, entryData(e)));
  }, [subformSchema, rawEntries]);
  const [expandedEntries, setExpandedEntries] = useState3(
    () => new Set(rawEntries.length > 0 ? [0] : [])
  );
  function updateEntry(index, fieldId, val) {
    const next = rawEntries.map(
      (e, i) => i === index ? patchEntry(e, fieldId, val) : e
    );
    emit(next);
  }
  function addEntry() {
    const fresh = newEntry(subformSchema?.uuid ?? "", rawEntries);
    const next = [...rawEntries, fresh];
    setExpandedEntries((prev) => /* @__PURE__ */ new Set([...prev, next.length - 1]));
    emit(next);
  }
  function removeEntry(index) {
    const next = rawEntries.filter((_, i) => i !== index);
    setExpandedEntries((prev) => {
      const s = /* @__PURE__ */ new Set();
      prev.forEach((i) => {
        if (i !== index) s.add(i > index ? i - 1 : i);
      });
      return s;
    });
    emit(next);
  }
  function toggleEntry(index) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }
  function emit(next) {
    onChange(allowMany ? next : next[0] ?? {});
  }
  function buildNestedFieldPath(entryIndex, childFieldId) {
    return `${field.id}[${entryIndex}].${childFieldId}`;
  }
  const safeUploadForField = uploadMediaForField ?? (() => Promise.resolve({ uuid: "" }));
  const safeDeleteMedia = deleteMedia ?? (() => Promise.resolve());
  function renderEntryHeader(idx, isOpen) {
    return /* @__PURE__ */ jsxs6(
      "button",
      {
        type: "button",
        className: "ff-form__subform-header",
        onClick: () => toggleEntry(idx),
        "aria-expanded": isOpen,
        children: [
          /* @__PURE__ */ jsxs6("span", { className: "ff-form__subform-header-title", children: [
            field.label ?? field.title ?? "Entry",
            allowMany ? ` ${idx + 1}` : ""
          ] }),
          /* @__PURE__ */ jsxs6("span", { className: "ff-form__subform-header-right", children: [
            !readonly && !disabled && allowMany && /* @__PURE__ */ jsx9(
              "span",
              {
                className: "ff-form__subform-remove",
                role: "button",
                tabIndex: 0,
                onClick: (e) => {
                  e.stopPropagation();
                  removeEntry(idx);
                },
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    removeEntry(idx);
                  }
                },
                children: textRemove
              }
            ),
            /* @__PURE__ */ jsx9("span", { className: "ff-form__section-chevron", "aria-hidden": "true", children: isOpen ? "\u25B2" : "\u25BC" })
          ] })
        ]
      }
    );
  }
  if (subformSchema) {
    const mode = disabled || readonly ? "readonly" : "edit";
    return /* @__PURE__ */ jsxs6("div", { className: "ff-form__subform", children: [
      rawEntries.map((entry, idx) => {
        const isOpen = expandedEntries.has(idx);
        const fieldData = entryData(entry);
        const fieldStatesForEntry = entryFieldStates[idx] ?? {};
        return /* @__PURE__ */ jsxs6("div", { className: "ff-form__subform-entry", children: [
          renderEntryHeader(idx, isOpen),
          isOpen && /* @__PURE__ */ jsx9("div", { className: "ff-form__subform-body", children: /* @__PURE__ */ jsx9(
            SectionAccordion,
            {
              sections: subformSchema.pages.flatMap((p) => p.sections),
              data: fieldData,
              fieldStates: fieldStatesForEntry,
              validationErrors,
              mode,
              renderers,
              parentSchema: subformSchema,
              onFieldChange: (fId, val) => updateEntry(idx, fId, val),
              uploadMediaForField: (fId, file) => safeUploadForField(buildNestedFieldPath(idx, fId), file),
              deleteMediaItem: safeDeleteMedia,
              fetchMedia,
              fetchLookupList
            }
          ) })
        ] }, idx);
      }),
      allowMany && !readonly && !disabled && /* @__PURE__ */ jsx9(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--add",
          onClick: addEntry,
          children: textAdd
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs6("div", { className: "ff-form__subform", children: [
    rawEntries.map((entry, idx) => {
      const isOpen = expandedEntries.has(idx);
      const fieldData = entryData(entry);
      return /* @__PURE__ */ jsxs6("div", { className: "ff-form__subform-entry", children: [
        renderEntryHeader(idx, isOpen),
        isOpen && /* @__PURE__ */ jsx9("div", { className: "ff-form__subform-body", children: Object.entries(fieldData).map(([key, val]) => /* @__PURE__ */ jsxs6("div", { className: "ff-form__field", children: [
          /* @__PURE__ */ jsx9("label", { className: "ff-form__label", children: key }),
          /* @__PURE__ */ jsx9(
            "input",
            {
              type: "text",
              className: "ff-form__input",
              value: typeof val === "string" ? val : JSON.stringify(val),
              disabled,
              readOnly: readonly,
              onChange: (e) => updateEntry(idx, key, e.target.value)
            }
          )
        ] }, key)) })
      ] }, idx);
    }),
    allowMany && !readonly && !disabled && /* @__PURE__ */ jsx9(
      "button",
      {
        type: "button",
        className: "ff-form__btn ff-form__btn--add",
        onClick: addEntry,
        children: textAdd
      }
    )
  ] });
}

// src/react/fields/ChoiceField.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
function ChoiceField({
  field,
  value,
  disabled,
  readonly,
  onChange
}) {
  const settings = field.settings ?? {};
  const isMultiple = Boolean(settings.isMultiple ?? settings.is_multiple ?? settings.allowMany ?? settings.allow_many);
  const options = (field.options?.length ? field.options : void 0) ?? settings.options ?? [];
  const selectedValues = Array.isArray(value) ? value : value !== void 0 && value !== null ? [value] : [];
  function toggle(optVal) {
    if (disabled || readonly) return;
    const strVal = String(optVal);
    if (isMultiple) {
      const next = selectedValues.some((v) => String(v) === strVal) ? selectedValues.filter((v) => String(v) !== strVal) : [...selectedValues, optVal];
      onChange(next);
    } else {
      const alreadySelected = selectedValues.some((v) => String(v) === strVal);
      onChange(alreadySelected ? void 0 : optVal);
    }
  }
  return /* @__PURE__ */ jsx10("div", { className: "ff-form__choice-group", role: "group", "aria-label": field.label ?? field.title, children: options.map((opt) => {
    const isSelected = selectedValues.some((v) => String(v) === String(opt.value));
    return /* @__PURE__ */ jsx10(
      "button",
      {
        type: "button",
        className: [
          "ff-form__choice-btn",
          isSelected ? "ff-form__choice-btn--selected" : "",
          disabled || readonly || Boolean(opt.disabled) ? "ff-form__choice-btn--disabled" : ""
        ].filter(Boolean).join(" "),
        disabled: disabled || readonly || Boolean(opt.disabled),
        "aria-pressed": isSelected,
        onClick: () => toggle(opt.value),
        children: opt.label
      },
      String(opt.value)
    );
  }) });
}

// src/react/fields/PlaceholderField.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
var HEADING_TAGS = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6"
};
function sanitizeHtml(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "").replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"');
}
function PlaceholderField({ field }) {
  const settings = field.settings ?? {};
  const sizeType = settings.type ?? "p";
  const content = settings.content ?? field.label ?? field.title ?? "";
  const Tag = HEADING_TAGS[sizeType] ?? "p";
  return /* @__PURE__ */ jsx11(
    Tag,
    {
      className: `ff-form__placeholder ff-form__placeholder--${sizeType}`,
      dangerouslySetInnerHTML: { __html: sanitizeHtml(content) }
    }
  );
}

// src/react/fields/ButtonField.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
function ButtonField({ field, disabled, readonly }) {
  const settings = field.settings ?? {};
  const action = settings.action;
  function handleClick() {
    if (disabled || readonly) return;
    switch (action?.type) {
      case "submit":
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: { type: "submit", fieldId: field.id }
          })
        );
        break;
      case "page":
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: {
              type: "page",
              direction: action.direction ?? "next",
              pageId: action.pageId,
              fieldId: field.id
            }
          })
        );
        break;
      case "file":
        if (action.url) window.open(action.url, "_blank", "noopener,noreferrer");
        break;
      default:
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: { type: action?.type ?? "unknown", fieldId: field.id }
          })
        );
    }
  }
  return /* @__PURE__ */ jsx12(
    "button",
    {
      id: field.id,
      type: "button",
      className: "ff-form__btn ff-form__btn--field",
      disabled: disabled || readonly,
      onClick: handleClick,
      children: field.label ?? field.title ?? "Button"
    }
  );
}

// src/react/fields/LocationField.tsx
import { useState as useState4 } from "react";
import { jsx as jsx13, jsxs as jsxs7 } from "react/jsx-runtime";
function LocationField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange
}) {
  const [fetching, setFetching] = useState4(false);
  const [geoError, setGeoError] = useState4(null);
  const strValue = typeof value === "string" ? value : value ? String(value) : "";
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setFetching(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChange(`${latitude},${longitude}`);
        setFetching(false);
      },
      (err) => {
        setGeoError(err.message);
        setFetching(false);
      },
      { enableHighAccuracy: true, timeout: 1e4 }
    );
  }
  const [lat, lng] = strValue.split(",").map((s) => s.trim());
  const hasCoords = lat && lng;
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  return /* @__PURE__ */ jsxs7("div", { className: "ff-form__location", children: [
    /* @__PURE__ */ jsxs7("div", { className: "ff-form__location-row", children: [
      /* @__PURE__ */ jsx13(
        "input",
        {
          id: field.id,
          type: "text",
          className: "ff-form__input",
          value: strValue,
          placeholder: field.placeholder ?? "lat,lng (e.g. 48.8566,2.3522)",
          disabled,
          readOnly: readonly,
          required,
          "aria-required": required,
          onChange: (e) => onChange(e.target.value || void 0)
        }
      ),
      !readonly && !disabled && /* @__PURE__ */ jsx13(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--location",
          disabled: fetching,
          onClick: handleGetLocation,
          title: "Use my location",
          children: fetching ? "\u2026" : "\u{1F4CD}"
        }
      )
    ] }),
    geoError && /* @__PURE__ */ jsx13("span", { className: "ff-form__error", children: geoError }),
    hasCoords && mapsUrl && /* @__PURE__ */ jsx13(
      "a",
      {
        href: mapsUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "ff-form__location-link",
        children: "View on map \u2197"
      }
    )
  ] });
}

// src/react/fields/SignatureField.tsx
import { useRef as useRef4, useState as useState5, useEffect as useEffect4 } from "react";
import { jsx as jsx14, jsxs as jsxs8 } from "react/jsx-runtime";
function SignatureField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  uploadMedia,
  fetchMedia
}) {
  const canvasRef = useRef4(null);
  const objectUrlRef = useRef4(null);
  const [isDrawing, setIsDrawing] = useState5(false);
  const [isEmpty2, setIsEmpty] = useState5(true);
  const [signatureUrl, setSignatureUrl] = useState5(null);
  const [isFetching, setIsFetching] = useState5(false);
  useEffect4(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);
  useEffect4(() => {
    let cancelled = false;
    async function resolveUrl() {
      if (!value) {
        setSignatureUrl(null);
        setIsEmpty(true);
        return;
      }
      setIsEmpty(false);
      if (typeof value === "object" && value !== null) {
        const valObj = value;
        if (valObj.url) {
          setSignatureUrl(valObj.url);
          setIsFetching(false);
          return;
        }
      }
      const valStr = typeof value === "string" ? value : value?.uuid || value?.id || String(value);
      if (valStr.startsWith("http") || valStr.startsWith("blob:") || valStr.startsWith("data:")) {
        setSignatureUrl(valStr);
        setIsFetching(false);
        return;
      }
      if (fetchMedia) {
        setIsFetching(true);
        try {
          const result = await Promise.resolve(fetchMedia(valStr));
          if (cancelled) return;
          const resolved = normalizeFetchResult(result);
          if (resolved) setSignatureUrl(resolved);
        } catch (err) {
          console.error("Failed to fetch signature media", err);
        } finally {
          if (!cancelled) setIsFetching(false);
        }
      }
    }
    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [value, fetchMedia]);
  function normalizeFetchResult(result) {
    if (!result) return null;
    if (typeof result === "string") return result;
    if (result instanceof Blob) {
      const url = URL.createObjectURL(result);
      objectUrlRef.current = url;
      return url;
    }
    const blob = result.blob ?? result.file;
    if (blob) {
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      return result.url ?? url;
    }
    return result.url ?? null;
  }
  function startDrawing(e) {
    if (disabled || readonly) return;
    setIsDrawing(true);
    draw(e);
  }
  function stopDrawing() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
    }
  }
  function draw(e) {
    if (!isDrawing || !canvasRef.current || disabled || readonly) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsEmpty(false);
  }
  function clear() {
    setIsEmpty(true);
    setSignatureUrl(null);
    onChange(void 0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty2 || !uploadMedia) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const localUrl = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = localUrl;
      setSignatureUrl(localUrl);
      const file = new File([blob], "signature.png", { type: "image/png" });
      try {
        const result = await uploadMedia(file);
        onChange(result);
      } catch (err) {
        console.error("Failed to upload signature", err);
      }
    }, "image/png");
  }
  if (signatureUrl && !isDrawing) {
    return /* @__PURE__ */ jsxs8("div", { className: "ff-form__signature-preview", children: [
      isFetching ? /* @__PURE__ */ jsx14("div", { className: "ff-form__signature-loading", children: "Loading signature..." }) : /* @__PURE__ */ jsx14("img", { src: signatureUrl, alt: "Signature" }),
      !disabled && !readonly && /* @__PURE__ */ jsx14("div", { className: "ff-form__signature-actions", style: { marginTop: 8 }, children: /* @__PURE__ */ jsx14("button", { type: "button", className: "ff-form__btn ff-form__btn--draft", onClick: clear, children: "Clear & Re-sign" }) })
    ] });
  }
  return /* @__PURE__ */ jsxs8("div", { className: "ff-form__signature-container", children: [
    /* @__PURE__ */ jsx14(
      "canvas",
      {
        ref: canvasRef,
        width: 400,
        height: 200,
        className: "ff-form__signature-canvas",
        onMouseDown: startDrawing,
        onMouseMove: draw,
        onMouseUp: stopDrawing,
        onMouseOut: stopDrawing,
        onTouchStart: startDrawing,
        onTouchMove: draw,
        onTouchEnd: stopDrawing
      }
    ),
    /* @__PURE__ */ jsxs8("div", { className: "ff-form__signature-actions", children: [
      /* @__PURE__ */ jsx14("button", { type: "button", className: "ff-form__btn ff-form__btn--draft", onClick: clear, disabled: disabled || readonly, children: "Clear" }),
      /* @__PURE__ */ jsx14("button", { type: "button", className: "ff-form__btn ff-form__btn--submit", onClick: save, disabled: disabled || readonly || isEmpty2, children: "Save Signature" })
    ] })
  ] });
}

// src/react/FieldRenderer.tsx
import { jsx as jsx15, jsxs as jsxs9 } from "react/jsx-runtime";
var DEFAULT_RENDERERS = {
  text: TextField,
  textarea: TextAreaField,
  number: NumberField,
  integer: NumberField,
  select: SelectField,
  checkbox: CheckboxField,
  date: DateField,
  datetime: DateField,
  file: MediaField,
  image: MediaField,
  media: MediaField,
  signature: SignatureField,
  choice: ChoiceField,
  placeholder: PlaceholderField,
  button: ButtonField,
  location: LocationField,
  subform: SubFormField
};
function FallbackField({ field }) {
  console.warn("[ff-forms] unsupported field type:", field.type, "id:", field.id);
  return /* @__PURE__ */ jsxs9("div", { className: "ff-form__field-unsupported", children: [
    "Unsupported field type: ",
    /* @__PURE__ */ jsx15("code", { children: field.type })
  ] });
}
function FieldRenderer(props) {
  const { field, renderers } = props;
  const registry = {
    ...DEFAULT_RENDERERS,
    ...renderers
  };
  let fieldType = field.type;
  if (fieldType === "media" && field.settings?.type === "signature") {
    fieldType = "signature";
  }
  const Component = registry[fieldType];
  if (!Component) return /* @__PURE__ */ jsx15(FallbackField, { field });
  return /* @__PURE__ */ jsx15(Component, { ...props });
}

// src/react/SectionRenderer.tsx
import { jsx as jsx16, jsxs as jsxs10 } from "react/jsx-runtime";
function SectionRenderer({
  section,
  data,
  fieldStates,
  validationErrors,
  mode,
  renderers,
  parentSchema,
  onFieldChange,
  uploadMediaForField,
  deleteMediaItem,
  fetchMedia,
  fetchLookupList
}) {
  const visibleFields = section.fields.filter(
    (f) => !fieldStates[f.id]?.hidden
  );
  if (visibleFields.length === 0) return null;
  return /* @__PURE__ */ jsx16("div", { className: "ff-form__section-fields", children: visibleFields.map((field) => {
    const state = fieldStates[field.id];
    const isReadonly = mode === "readonly" || (state?.readonly ?? false);
    const isDisabled = state?.disabled ?? false;
    const isRequired = state?.required ?? false;
    const errors = validationErrors[field.id];
    const settings = field.settings ?? {};
    const showLabel = settings.label !== false;
    const isLabelless = field.type === "placeholder" || field.type === "button" || !showLabel;
    return /* @__PURE__ */ jsxs10(
      "div",
      {
        className: [
          "ff-form__field",
          errors?.length ? "ff-form__field--error" : "",
          isLabelless ? "ff-form__field--labelless" : ""
        ].filter(Boolean).join(" "),
        children: [
          !isLabelless && (field.label || field.title) && /* @__PURE__ */ jsxs10("label", { className: "ff-form__label", htmlFor: field.id, children: [
            field.label ?? field.title,
            isRequired && /* @__PURE__ */ jsx16("span", { className: "ff-form__required", "aria-hidden": "true", children: " *" })
          ] }),
          field.description && /* @__PURE__ */ jsx16("p", { className: "ff-form__field-description", children: field.description }),
          /* @__PURE__ */ jsx16(
            FieldRenderer,
            {
              field,
              value: data[field.id],
              error: errors,
              disabled: isDisabled,
              readonly: isReadonly,
              required: isRequired,
              renderers,
              parentSchema,
              validationErrors,
              onChange: (value) => onFieldChange(field.id, value),
              uploadMedia: (file) => uploadMediaForField(field.id, file),
              uploadMediaForField,
              deleteMedia: deleteMediaItem,
              fetchMedia,
              fetchLookupList
            }
          ),
          errors?.map((msg, i) => /* @__PURE__ */ jsx16("span", { className: "ff-form__error", role: "alert", children: msg }, i))
        ]
      },
      field.id
    );
  }) });
}

// src/react/SectionAccordion.tsx
import { jsx as jsx17, jsxs as jsxs11 } from "react/jsx-runtime";
function SectionAccordion({
  sections,
  data,
  fieldStates,
  validationErrors,
  mode,
  renderers,
  parentSchema,
  onFieldChange,
  uploadMediaForField,
  deleteMediaItem,
  fetchMedia,
  fetchLookupList
}) {
  const [, setExpanded] = useState6(
    () => new Set(sections[0] ? [sections[0].id] : [])
  );
  function toggle(sectionId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }
  function sectionErrorCount(section) {
    return section.fields.filter((f) => {
      if (fieldStates[f.id]?.hidden) return false;
      return validationErrors[f.id]?.length;
    }).length;
  }
  function sectionMissingCount(section) {
    return section.fields.filter((f) => {
      const state = fieldStates[f.id];
      if (state?.hidden) return false;
      return state?.required && !data[f.id];
    }).length;
  }
  return /* @__PURE__ */ jsx17("div", { className: "ff-form__sections", children: sections.filter((s) => !fieldStates[s.id]?.hidden).map((section) => {
    const isOpen = true;
    const errors = sectionErrorCount(section);
    const missing = sectionMissingCount(section);
    const hasBadge = errors > 0 || missing > 0;
    return /* @__PURE__ */ jsxs11(
      "div",
      {
        className: [
          "ff-form__section-accordion",
          isOpen ? "ff-form__section-accordion--open" : "",
          errors > 0 ? "ff-form__section-accordion--error" : ""
        ].filter(Boolean).join(" "),
        children: [
          /* @__PURE__ */ jsxs11(
            "button",
            {
              type: "button",
              className: "ff-form__section-header",
              "aria-expanded": isOpen,
              onClick: () => toggle(section.id),
              children: [
                /* @__PURE__ */ jsx17("span", { className: "ff-form__section-header-title", children: section.title ?? "Section" }),
                /* @__PURE__ */ jsx17("span", { className: "ff-form__section-header-right", children: hasBadge && /* @__PURE__ */ jsx17(
                  "span",
                  {
                    className: `ff-form__section-badge ${errors > 0 ? "ff-form__section-badge--error" : "ff-form__section-badge--warn"}`,
                    children: errors > 0 ? errors : missing
                  }
                ) })
              ]
            }
          ),
          isOpen && /* @__PURE__ */ jsxs11("div", { className: "ff-form__section-body", children: [
            section.description && /* @__PURE__ */ jsx17("p", { className: "ff-form__section-description", children: section.description }),
            /* @__PURE__ */ jsx17(
              SectionRenderer,
              {
                section,
                data,
                fieldStates,
                validationErrors,
                mode,
                renderers,
                parentSchema,
                onFieldChange,
                uploadMediaForField,
                deleteMediaItem,
                fetchMedia,
                fetchLookupList
              }
            )
          ] })
        ]
      },
      section.id
    );
  }) });
}

// src/react/PageDetailView.tsx
import { jsx as jsx18, jsxs as jsxs12 } from "react/jsx-runtime";
function PageDetailView({
  page,
  pageIndex,
  totalPages,
  data,
  fieldStates,
  validationErrors,
  mode,
  renderers,
  parentSchema,
  onBack,
  onPrev,
  onNext,
  onFieldChange,
  uploadMediaForField,
  deleteMediaItem,
  fetchMedia,
  fetchLookupList
}) {
  return /* @__PURE__ */ jsxs12("div", { className: "ff-form__page-detail", children: [
    /* @__PURE__ */ jsxs12("div", { className: "ff-form__page-detail-topbar", children: [
      /* @__PURE__ */ jsx18(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--back",
          onClick: onBack,
          "aria-label": "Back to pages",
          children: "\u2039 Back"
        }
      ),
      /* @__PURE__ */ jsxs12("span", { className: "ff-form__page-detail-pager", children: [
        pageIndex + 1,
        " / ",
        totalPages
      ] })
    ] }),
    page.title && /* @__PURE__ */ jsx18("h2", { className: "ff-form__page-title", children: page.title }),
    page.description && /* @__PURE__ */ jsx18("p", { className: "ff-form__page-description", children: page.description }),
    /* @__PURE__ */ jsx18(
      SectionAccordion,
      {
        sections: page.sections,
        data,
        fieldStates,
        validationErrors,
        mode,
        renderers,
        parentSchema,
        onFieldChange,
        uploadMediaForField,
        deleteMediaItem,
        fetchMedia,
        fetchLookupList
      }
    ),
    totalPages > 1 && /* @__PURE__ */ jsxs12("div", { className: "ff-form__page-nav", children: [
      /* @__PURE__ */ jsx18(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--page-nav",
          disabled: pageIndex === 0,
          onClick: onPrev,
          children: "\u2190 Previous"
        }
      ),
      /* @__PURE__ */ jsx18(
        "button",
        {
          type: "button",
          className: "ff-form__btn ff-form__btn--page-nav",
          disabled: pageIndex >= totalPages - 1,
          onClick: onNext,
          children: "Next \u2192"
        }
      )
    ] })
  ] });
}

// src/react/FFForm.tsx
import { jsx as jsx19, jsxs as jsxs13 } from "react/jsx-runtime";
function FFForm(props) {
  const {
    mode = "create",
    submitButtonText = "Submit",
    saveDraftButtonText = "Save draft",
    className,
    style,
    renderers
  } = props;
  const {
    loading,
    error,
    schema,
    data,
    fieldStates,
    validationErrors,
    changeField,
    submitDraft,
    submitFinal,
    uploadMediaForField,
    deleteMediaItem,
    fetchLookupList: internalFetchLookupList
  } = useFFForm(props);
  const [currentPageId, setCurrentPageId] = useState7(null);
  const commonProps = useMemo2(() => ({
    data,
    fieldStates,
    validationErrors,
    mode,
    renderers,
    parentSchema: schema ?? void 0,
    onFieldChange: changeField,
    uploadMediaForField,
    deleteMediaItem,
    fetchMedia: props.onFetchMedia,
    fetchLookupList: props.onFetchLookupList ?? internalFetchLookupList
  }), [
    data,
    fieldStates,
    validationErrors,
    mode,
    renderers,
    schema,
    changeField,
    uploadMediaForField,
    deleteMediaItem,
    props.onFetchMedia,
    props.onFetchLookupList,
    internalFetchLookupList
  ]);
  if (loading) {
    return /* @__PURE__ */ jsx19("div", { className: `ff-form ff-form--loading ${className ?? ""}`, style, children: /* @__PURE__ */ jsx19("div", { className: "ff-form__loading", "aria-live": "polite", "aria-busy": "true", children: "Loading\u2026" }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx19("div", { className: `ff-form ff-form--error ${className ?? ""}`, style, children: /* @__PURE__ */ jsxs13("div", { className: "ff-form__load-error", role: "alert", children: [
      /* @__PURE__ */ jsx19("strong", { children: "Failed to load form:" }),
      " ",
      error.message
    ] }) });
  }
  if (!schema) return null;
  const isReadonlyMode = mode === "readonly";
  const hasGlobalErrors = Object.keys(validationErrors).length > 0;
  const pages = schema.pages;
  const isMultiPage = pages.length > 1;
  const currentPage = currentPageId ? pages.find((p) => p.id === currentPageId) ?? null : null;
  const currentPageIndex = currentPage ? pages.indexOf(currentPage) : -1;
  return /* @__PURE__ */ jsxs13(
    "div",
    {
      className: [
        "ff-form",
        `ff-form--${mode}`,
        className
      ].filter(Boolean).join(" "),
      style,
      children: [
        schema.title && /* @__PURE__ */ jsxs13("div", { className: "ff-form__header", children: [
          /* @__PURE__ */ jsx19("h1", { className: "ff-form__title", children: schema.title }),
          schema.description && /* @__PURE__ */ jsx19("p", { className: "ff-form__description", children: schema.description })
        ] }),
        hasGlobalErrors && /* @__PURE__ */ jsx19("div", { className: "ff-form__validation-banner", role: "alert", children: "Please correct the highlighted errors before submitting." }),
        !isMultiPage && /* @__PURE__ */ jsx19(
          SectionAccordion,
          {
            sections: pages[0]?.sections ?? [],
            ...commonProps
          }
        ),
        isMultiPage && !currentPage && /* @__PURE__ */ jsx19(
          PageListView,
          {
            pages,
            fieldStates,
            validationErrors,
            data,
            onSelectPage: (id) => setCurrentPageId(id)
          }
        ),
        isMultiPage && currentPage && /* @__PURE__ */ jsx19(
          PageDetailView,
          {
            page: currentPage,
            pageIndex: currentPageIndex,
            totalPages: pages.length,
            ...commonProps,
            onBack: () => setCurrentPageId(null),
            onPrev: () => {
              if (currentPageIndex > 0)
                setCurrentPageId(pages[currentPageIndex - 1].id);
            },
            onNext: () => {
              if (currentPageIndex < pages.length - 1)
                setCurrentPageId(pages[currentPageIndex + 1].id);
            }
          }
        ),
        !isReadonlyMode && (!isMultiPage || !currentPage) && /* @__PURE__ */ jsxs13("div", { className: "ff-form__actions", children: [
          /* @__PURE__ */ jsx19(
            "button",
            {
              type: "button",
              className: "ff-form__btn ff-form__btn--draft",
              onClick: () => void submitDraft(),
              children: saveDraftButtonText
            }
          ),
          /* @__PURE__ */ jsx19(
            "button",
            {
              type: "button",
              className: "ff-form__btn ff-form__btn--submit",
              onClick: () => void submitFinal(),
              children: submitButtonText
            }
          )
        ] })
      ]
    }
  );
}
export {
  FFForm,
  applyDefaultValues,
  applyJsonLogic,
  buildSubmissionPayload,
  createDefaultAdapter,
  createFormEngine,
  defaultApiAdapter,
  evaluateDependencies,
  isTruthy,
  normalizeSubmissionData,
  resolveAdapter,
  resolveEffectiveApiKey,
  useFFForm,
  validateForm
};
