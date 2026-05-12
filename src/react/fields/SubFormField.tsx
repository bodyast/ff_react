import { useState } from "react";
import type { FieldRendererProps } from "../../types/props";
import { SectionAccordion } from "../SectionAccordion";
import type { FormStructure, FieldState, ValidationErrors } from "../../types/form";

type SubFormEntry = Record<string, unknown>;

type SubFormFieldProps = FieldRendererProps & {
  /** Parent schema — needed to resolve the subform schema */
  parentSchema?: FormStructure;
  fieldStates?: Record<string, FieldState>;
  validationErrors?: ValidationErrors;
  uploadMediaForField?: (fieldId: string, file: File) => Promise<{ uuid: string }>;
  deleteMediaItem?: (mediaUuid: string) => Promise<void>;
};

export function SubFormField({
  field,
  value,
  disabled,
  readonly,
  onChange,
  parentSchema,
  fieldStates = {},
  validationErrors = {},
  uploadMediaForField,
  deleteMediaItem,
}: SubFormFieldProps) {
  const settings = field.settings ?? {};
  const allowMany = Boolean(settings.allowMany ?? settings.isMultiple);
  const textAdd = (settings.textAdd as string | undefined) ?? `+ Add ${field.label ?? field.title ?? "entry"}`;
  const textRemove = (settings.textRemove as string | undefined) ?? "Remove";

  // Resolve subform schema from parent
  const subformKey = settings.id as string | undefined;
  const subformSchema: FormStructure | undefined =
    subformKey && parentSchema?.subforms
      ? parentSchema.subforms[subformKey]
      : undefined;

  // Normalise value to array of entries
  const entries: SubFormEntry[] = allowMany
    ? Array.isArray(value) ? (value as SubFormEntry[]) : []
    : value && typeof value === "object" && !Array.isArray(value)
    ? [value as SubFormEntry]
    : [{}];

  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    () => new Set(entries.length > 0 ? [0] : [])
  );

  function updateEntry(index: number, fieldId: string, val: unknown) {
    const next = entries.map((e, i) =>
      i === index ? { ...e, [fieldId]: val } : e
    );
    emit(next);
  }

  function addEntry() {
    const next = [...entries, {}];
    setExpandedEntries((prev) => new Set([...prev, next.length - 1]));
    emit(next);
  }

  function removeEntry(index: number) {
    const next = entries.filter((_, i) => i !== index);
    setExpandedEntries((prev) => {
      const s = new Set<number>();
      prev.forEach((i) => { if (i !== index) s.add(i > index ? i - 1 : i); });
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

  function emit(next: SubFormEntry[]) {
    onChange(allowMany ? next : next[0] ?? {});
  }

  // --------------------------------------------------------------------------
  // If subform schema is available, render proper field renderers
  // --------------------------------------------------------------------------
  if (subformSchema) {
    return (
      <div className="ff-form__subform">
        {entries.map((entry, idx) => {
          const isOpen = expandedEntries.has(idx);
          return (
            <div key={idx} className="ff-form__subform-entry">
              <button
                type="button"
                className="ff-form__subform-header"
                onClick={() => toggleEntry(idx)}
                aria-expanded={isOpen}
              >
                <span className="ff-form__subform-header-title">
                  {field.label ?? field.title ?? "Entry"}{allowMany ? ` ${idx + 1}` : ""}
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

              {isOpen && (
                <div className="ff-form__subform-body">
                  <SectionAccordion
                    sections={subformSchema.pages.flatMap((p) => p.sections)}
                    data={entry}
                    fieldStates={fieldStates}
                    validationErrors={validationErrors}
                    mode={disabled || readonly ? "readonly" : "edit"}
                    onFieldChange={(fId, val) => updateEntry(idx, fId, val)}
                    uploadMediaForField={
                      uploadMediaForField ?? ((_fId, _f) => Promise.resolve({ uuid: "" }))
                    }
                    deleteMediaItem={deleteMediaItem ?? ((_uuid) => Promise.resolve())}
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

  // --------------------------------------------------------------------------
  // Fallback: raw key/value editing (no subform schema)
  // --------------------------------------------------------------------------
  return (
    <div className="ff-form__subform">
      {entries.map((entry, idx) => {
        const isOpen = expandedEntries.has(idx);
        return (
          <div key={idx} className="ff-form__subform-entry">
            <button
              type="button"
              className="ff-form__subform-header"
              onClick={() => toggleEntry(idx)}
              aria-expanded={isOpen}
            >
              <span className="ff-form__subform-header-title">
                {field.label ?? field.title ?? "Entry"}{allowMany ? ` ${idx + 1}` : ""}
              </span>
              <span className="ff-form__subform-header-right">
                {!readonly && !disabled && allowMany && (
                  <span
                    className="ff-form__subform-remove"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeEntry(idx); }}
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

            {isOpen && (
              <div className="ff-form__subform-body">
                {Object.entries(entry).map(([key, val]) => (
                  <div key={key} className="ff-form__field">
                    <label className="ff-form__label">{key}</label>
                    <input
                      type="text"
                      className="ff-form__input"
                      value={typeof val === "string" ? val : JSON.stringify(val)}
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
