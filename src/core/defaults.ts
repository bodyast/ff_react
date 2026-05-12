import type { FormStructure, FormField } from "../types/form";

export function applyDefaultValues(schema: FormStructure, data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const hasValue = result[field.id] !== undefined && result[field.id] !== null;
        const def = field.settings?.defaultValue;
        if (!hasValue && def !== undefined) result[field.id] = def;
      }
    }
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _unused(_f: FormField) { /* keep import */ }
void _unused;
