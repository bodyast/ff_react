import type { FormStructure, FieldState, ValidationErrors, FormSubmissionPayload } from "../types/form";
import { applyDefaultValues } from "./defaults";
import { evaluateDependencies } from "./dependencies";
import { validateForm } from "./validation";
import { buildSubmissionPayload } from "./payload";

export type FormEngineParams = {
  schema: FormStructure; initialData?: Record<string, unknown>;
  submissionId?: string; formVersionUuid?: string;
};

export type FormEngine = {
  changeField(fieldId: string, value: unknown): void;
  getData(): Record<string, unknown>;
  getFieldState(fieldId: string): FieldState;
  getAllFieldStates(): Record<string, FieldState>;
  validate(): ValidationErrors;
  buildPayload(options: { isFinal: boolean }): FormSubmissionPayload;
  reset(): void;
  subscribe(listener: () => void): () => void;
};

const DEFAULT_STATE: FieldState = { hidden: false, disabled: false, readonly: false, required: false };

export function createFormEngine(params: FormEngineParams): FormEngine {
  const { schema, initialData = {}, submissionId, formVersionUuid } = params;
  let data: Record<string, unknown> = applyDefaultValues(schema, initialData);
  let fieldStates: Record<string, FieldState> = computeStates(schema, data);
  const listeners = new Set<() => void>();

  function notify() { listeners.forEach((l) => l()); }
  function recompute() {
    const { stateOverrides, dataOverrides } = evaluateDependencies({ schema, data });
    // Apply computed value overrides (e.g. total_miles = finish - start)
    if (Object.keys(dataOverrides).length > 0) {
      data = { ...data, ...dataOverrides };
    }
    fieldStates = buildFieldStates(schema, stateOverrides);
  }

  return {
    changeField(fieldId, value) { data = { ...data, [fieldId]: value }; recompute(); notify(); },
    getData() { return { ...data }; },
    getFieldState(fieldId) { return fieldStates[fieldId] ?? { ...DEFAULT_STATE }; },
    getAllFieldStates() { return { ...fieldStates }; },
    validate() { return validateForm({ schema, data, fieldStates }); },
    buildPayload({ isFinal }) { return buildSubmissionPayload({ schema, data, submissionId, formVersionUuid: formVersionUuid ?? schema.uuid, isFinal }); },
    reset() { data = applyDefaultValues(schema, initialData); recompute(); notify(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

/** Build FieldState map from schema defaults + dependency overrides */
function buildFieldStates(
  schema: FormStructure,
  stateOverrides: Record<string, Partial<FieldState>>
): Record<string, FieldState> {
  const states: Record<string, FieldState> = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const schemaState: FieldState = {
          hidden: Boolean(field.settings?.hidden),
          disabled: Boolean(field.settings?.disabled),
          readonly: Boolean(field.settings?.readonly),
          required: Boolean(field.settings?.required),
        };
        const ov = stateOverrides[field.id] ?? {};
        states[field.id] = {
          hidden: ov.hidden ?? schemaState.hidden,
          disabled: ov.disabled ?? schemaState.disabled,
          readonly: ov.readonly ?? schemaState.readonly,
          required: ov.required ?? schemaState.required,
        };
      }
    }
  }
  return states;
}

/** Exported so SubFormField and other composite components can compute field states */
export function computeStates(schema: FormStructure, data: Record<string, unknown>): Record<string, FieldState> {
  const { stateOverrides } = evaluateDependencies({ schema, data });
  return buildFieldStates(schema, stateOverrides);
}
