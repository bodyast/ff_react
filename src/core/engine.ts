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
  function recompute() { fieldStates = computeStates(schema, data); }

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

function computeStates(schema: FormStructure, data: Record<string, unknown>): Record<string, FieldState> {
  const overrides = evaluateDependencies({ schema, data });
  const states: Record<string, FieldState> = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const schema_state: FieldState = {
          hidden: Boolean(field.settings?.hidden),
          disabled: Boolean(field.settings?.disabled),
          readonly: Boolean(field.settings?.readonly),
          required: Boolean(field.settings?.required),
        };
        const ov = overrides[field.id] ?? {};
        states[field.id] = {
          hidden: ov.hidden ?? schema_state.hidden,
          disabled: ov.disabled ?? schema_state.disabled,
          readonly: ov.readonly ?? schema_state.readonly,
          required: ov.required ?? schema_state.required,
        };
      }
    }
  }
  return states;
}
