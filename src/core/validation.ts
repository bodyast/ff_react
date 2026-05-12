import type { FormStructure, FormField, FieldState, ValidationErrors } from "../types/form";

export type ValidateFormParams = {
  schema: FormStructure;
  data: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
};

export function validateForm(params: ValidateFormParams): ValidationErrors {
  const { schema, data, fieldStates } = params;
  const errors: ValidationErrors = {};
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

function validateField(field: FormField, value: unknown, state: FieldState | undefined): string[] {
  const errors: string[] = [];
  const s = field.settings ?? {};
  const isRequired = state?.required ?? s.required ?? false;
  const label = field.label ?? field.title ?? field.id;
  const empty = isEmpty(value, field.type);

  if (isRequired && empty) { errors.push(`${label} is required`); return errors; }
  if (empty) return errors;

  if (field.type === "number" || field.type === "integer") {
    const n = Number(value);
    if (isNaN(n)) { errors.push(`${label} must be a number`); }
    else {
      if (s.min !== undefined && n < Number(s.min)) errors.push(`${label} must be at least ${s.min}`);
      if (s.max !== undefined && n > Number(s.max)) errors.push(`${label} must be at most ${s.max}`);
    }
  }
  if (field.type === "text" || field.type === "textarea") {
    const str = String(value);
    if (s.min !== undefined && str.length < Number(s.min)) errors.push(`${label} must be at least ${s.min} characters`);
    if (s.max !== undefined && str.length > Number(s.max)) errors.push(`${label} must be at most ${s.max} characters`);
  }
  if (field.type === "file" || field.type === "image" || field.type === "media") {
    const files = Array.isArray(value) ? value : [];
    if (s.minFiles !== undefined && files.length < s.minFiles) errors.push(`${label} requires at least ${s.minFiles} file(s)`);
    if (s.maxFiles !== undefined && files.length > s.maxFiles) errors.push(`${label} allows at most ${s.maxFiles} file(s)`);
  }
  return errors;
}

function isEmpty(value: unknown, type: string): boolean {
  if (value === undefined || value === null || value === "") return true;
  if ((type === "file" || type === "image" || type === "media") && Array.isArray(value)) return value.length === 0;
  return false;
}
