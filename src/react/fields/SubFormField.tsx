import { useMemo, useState } from "react";
import type { FieldRendererProps } from "../../types/props";
import type { FormStructure, FieldState } from "../../types/form";
import { computeStates } from "../../core/engine";
import { SectionAccordion } from "../SectionAccordion";

// ---------------------------------------------------------------------------
// NormalizedSubformEntry detection & helpers
// ---------------------------------------------------------------------------

type NormalizedEntry = {
  form_version_uuid: string;
  submitted_at: string | null;
  data: Record<string, unknown>;
};

type RawEntry = NormalizedEntry | Record<string, unknown>;

/** True when the entry came from the server in the NormalizedSubformEntry format */
function isNormalized(entry: unknown): entry is NormalizedEntry {
  return (
    entry !== null &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    "data" in (entry as object) &&
    "form_version_uuid" in (entry as object)
  );
}

/** Extract flat field-value map from any entry shape */
function entryData(entry: RawEntry): Record<string, unknown> {
  return isNormalized(entry) ? entry.data : (entry as Record<string, unknown>);
}

/** Update one field inside an entry, preserving its outer shape */
function patchEntry(entry: RawEntry, fieldId: string, val: unknown): RawEntry {
  if (isNormalized(entry)) {
    return { ...entry, data: { ...entry.data, [fieldId]: val } };
  }
  return { ...(entry as Record<string, unknown>), [fieldId]: val };
}

/** Create a fresh entry in the appropriate format */
function newEntry(subformUuid: string, existingEntries: RawEntry[]): RawEntry {
  // Use the same format as the existing entries, falling back to NormalizedEntry
  const useNormalized = existingEntries.length === 0 || isNormalized(existingEntries[0]);
  if (useNormalized) {
    return { form_version_uuid: subformUuid, submitted_at: null, data: {} };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * `subform` field — renders nested form entries inline.
 *
 * Supports both flat entry format (plain object) and NormalizedSubformEntry
 * format ({form_version_uuid, submitted_at, data: {…}}) from the server.
 * Data is always emitted in the same format it was received.
 */
export function SubFormField({
  field,
  value,
  disabled,
  readonly,
  onChange,
  parentSchema,
  validationErrors = {},
  uploadMediaForField,
  deleteMedia,
  renderers,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const allowMany = Boolean(settings.allowMany ?? settings.allow_many ?? settings.isMultiple);
  const textAdd =
    (settings.textAdd as string | undefined) ??
    (settings.text_add as string | undefined) ??
    `+ Add ${field.label ?? field.title ?? "entry"}`;
  const textRemove =
    (settings.textRemove as string | undefined) ??
    (settings.text_remove as string | undefined) ??
    "Remove";

  // Resolve subform schema from parent
  const subformKey = settings.id as string | undefined;
  const subformSchema: FormStructure | undefined =
    subformKey && parentSchema?.subforms
      ? parentSchema.subforms[subformKey]
      : undefined;

  // DEBUG — remove after diagnosis
  console.log("[SubFormField]", {
    fieldId: field.id,
    fieldLabel: field.label,
    settings,
    allowMany,
    subformKey,
    hasParentSchema: !!parentSchema,
    hasSubforms: !!parentSchema?.subforms,
    subformSchemaFound: !!subformSchema,
    valueType: Array.isArray(value) ? `array[${(value as unknown[]).length}]` : typeof value,
  });

  // ---------------------------------------------------------------------------
  // Normalise incoming value to RawEntry[]
  // Entries keep their original shape (flat or NormalizedSubformEntry) so that
  // we can emit in exactly the same format the parent/server expects.
  // ---------------------------------------------------------------------------
  const rawEntries: RawEntry[] = useMemo(() => {
    if (allowMany) {
      return Array.isArray(value) ? (value as RawEntry[]) : [];
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return [value as RawEntry];
    }
    return [{ form_version_uuid: subformSchema?.uuid ?? "", submitted_at: null, data: {} }];
  }, [allowMany, value, subformSchema?.uuid]);

  // Per-entry field states for intra-subform dependencies
  const entryFieldStates: Record<string, FieldState>[] = useMemo(() => {
    if (!subformSchema) return rawEntries.map(() => ({}));
    return rawEntries.map((e) => computeStates(subformSchema, entryData(e)));
  }, [subformSchema, rawEntries]);

  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    () => new Set(rawEntries.length > 0 ? [0] : [])
  );

  // ---------------------------------------------------------------------------
  // Mutation helpers — preserve the outer entry shape
  // ---------------------------------------------------------------------------

  function updateEntry(index: number, fieldId: string, val: unknown) {
    const next = rawEntries.map((e, i) =>
      i === index ? patchEntry(e, fieldId, val) : e
    );
    emit(next);
  }

  function addEntry() {
    const fresh = newEntry(subformSchema?.uuid ?? "", rawEntries);
    const next = [...rawEntries, fresh];
    setExpandedEntries((prev) => new Set([...prev, next.length - 1]));
    emit(next);
  }

  function removeEntry(index: number) {
    const next = rawEntries.filter((_, i) => i !== index);
    setExpandedEntries((prev) => {
      const s = new Set<number>();
      prev.forEach((i) => {
        if (i !== index) s.add(i > index ? i - 1 : i);
      });
      return s;
    });
    emit(next);
  }

  function toggleEntry(index: number) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  /** Emit change — single subform emits the single entry (not an array) */
  function emit(next: RawEntry[]) {
    onChange(allowMany ? next : (next[0] ?? {}));
  }

  // Fallback handlers so nested media fields don't crash when not provided
  const safeUploadForField =
    uploadMediaForField ?? (() => Promise.resolve({ uuid: "" as string }));
  const safeDeleteMedia = deleteMedia ?? (() => Promise.resolve());

  // ---------------------------------------------------------------------------
  // Render one entry accordion item
  // ---------------------------------------------------------------------------

  function renderEntryHeader(idx: number, isOpen: boolean) {
    return (
      <button
        type="button"
        className="ff-form__subform-header"
        onClick={() => toggleEntry(idx)}
        aria-expanded={isOpen}
      >
        <span className="ff-form__subform-header-title">
          {field.label ?? field.title ?? "Entry"}
          {allowMany ? ` ${idx + 1}` : ""}
        </span>
        <span className="ff-form__subform-header-right">
          {!readonly && !disabled && allowMany && (
            <span
              className="ff-form__subform-remove"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                removeEntry(idx);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  removeEntry(idx);
                }
              }}
            >
              {textRemove}
            </span>
          )}
          <span className="ff-form__section-chevron" aria-hidden="true">
            {isOpen ? "▲" : "▼"}
          </span>
        </span>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Full render when subform schema is available
  // ---------------------------------------------------------------------------

  if (subformSchema) {
    const mode: "create" | "edit" | "readonly" =
      disabled || readonly ? "readonly" : "edit";

    return (
      <div className="ff-form__subform">
        {rawEntries.map((entry, idx) => {
          const isOpen = expandedEntries.has(idx);
          const fieldData = entryData(entry);
          const fieldStatesForEntry = entryFieldStates[idx] ?? {};

          return (
            <div key={idx} className="ff-form__subform-entry">
              {renderEntryHeader(idx, isOpen)}

              {isOpen && (
                <div className="ff-form__subform-body">
                  <SectionAccordion
                    sections={subformSchema.pages.flatMap((p) => p.sections)}
                    data={fieldData}
                    fieldStates={fieldStatesForEntry}
                    validationErrors={validationErrors}
                    mode={mode}
                    renderers={renderers}
                    parentSchema={subformSchema}
                    onFieldChange={(fId, val) => updateEntry(idx, fId, val)}
                    uploadMediaForField={safeUploadForField}
                    deleteMediaItem={safeDeleteMedia}
                  />
                </div>
              )}
            </div>
          );
        })}

        {allowMany && !readonly && !disabled && (
          <button
            type="button"
            className="ff-form__btn ff-form__btn--add"
            onClick={addEntry}
          >
            {textAdd}
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Fallback: raw key/value editor (no subform schema)
  // Shows the actual field values — digs into .data if NormalizedSubformEntry
  // ---------------------------------------------------------------------------

  return (
    <div className="ff-form__subform">
      {rawEntries.map((entry, idx) => {
        const isOpen = expandedEntries.has(idx);
        const fieldData = entryData(entry);

        return (
          <div key={idx} className="ff-form__subform-entry">
            {renderEntryHeader(idx, isOpen)}

            {isOpen && (
              <div className="ff-form__subform-body">
                {Object.entries(fieldData).map(([key, val]) => (
                  <div key={key} className="ff-form__field">
                    <label className="ff-form__label">{key}</label>
                    <input
                      type="text"
                      className="ff-form__input"
                      value={
                        typeof val === "string" ? val : JSON.stringify(val)
                      }
                      disabled={disabled}
                      readOnly={readonly}
                      onChange={(e) => updateEntry(idx, key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {allowMany && !readonly && !disabled && (
        <button
          type="button"
          className="ff-form__btn ff-form__btn--add"
          onClick={addEntry}
        >
          {textAdd}
        </button>
      )}
    </div>
  );
}
