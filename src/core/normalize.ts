import type { FormStructure, NormalizedSubformEntry } from "../types/form";

export type NormalizeParams = { schema: FormStructure; data: Record<string, unknown>; submittedAt?: string };

export function normalizeSubmissionData(params: NormalizeParams): Record<string, unknown> {
  const { schema, data, submittedAt = new Date().toISOString() } = params;
  const result: Record<string, unknown> = {};
  for (const page of schema.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const value = data[field.id];
        if (field.type === "subform") {
          const allowMany = Boolean(field.settings?.allowMany ?? field.settings?.allow_many ?? field.settings?.isMultiple ?? field.settings?.is_multiple);
          result[field.id] = normalizeSubform(field.settings?.id as string | undefined, value, schema, submittedAt, allowMany);
        } else {
          result[field.id] = value;
        }
      }
    }
  }
  return result;
}

function isNormalizedEntry(e: unknown): e is NormalizedSubformEntry {
  return (
    e !== null &&
    typeof e === "object" &&
    !Array.isArray(e) &&
    "data" in (e as object) &&
    "form_version_uuid" in (e as object)
  );
}

function extractData(e: unknown): Record<string, unknown> {
  if (isNormalizedEntry(e)) return e.data;
  return e as Record<string, unknown>;
}

function normalizeSubform(key: string | undefined, value: unknown, parentSchema: FormStructure, ts: string, allowMany?: boolean): NormalizedSubformEntry | NormalizedSubformEntry[] | undefined {
  const uuid = key ? (parentSchema.subforms?.[key]?.uuid ?? "") : "";
  if (allowMany) {
    const arr = Array.isArray(value) ? value : [];
    return arr.map((e) => ({ form_version_uuid: uuid, submitted_at: ts, data: extractData(e) }));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { form_version_uuid: uuid, submitted_at: ts, data: extractData(value) };
  }
  return undefined;
}
