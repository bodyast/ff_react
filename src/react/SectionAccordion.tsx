import { useState } from "react";
import type { FormSection, ValidationErrors, FieldState } from "../types/form";
import type { FieldRenderers } from "../types/props";
import { SectionRenderer } from "./SectionRenderer";

type SectionAccordionProps = {
  sections: FormSection[];
  data: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  validationErrors: ValidationErrors;
  mode: "create" | "edit" | "readonly";
  renderers?: Partial<FieldRenderers>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  uploadMediaForField: (fieldId: string, file: File) => Promise<{ uuid: string }>;
  deleteMediaItem: (mediaUuid: string) => Promise<void>;
};

export function SectionAccordion({
  sections,
  data,
  fieldStates,
  validationErrors,
  mode,
  renderers,
  onFieldChange,
  uploadMediaForField,
  deleteMediaItem,
}: SectionAccordionProps) {
  // First section is expanded by default (matches Flutter behaviour)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(sections[0] ? [sections[0].id] : [])
  );

  function toggle(sectionId: string) {
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

  // Count errors in a section (skip hidden fields)
  function sectionErrorCount(section: FormSection): number {
    return section.fields.filter((f) => {
      if (fieldStates[f.id]?.hidden) return false;
      return validationErrors[f.id]?.length;
    }).length;
  }

  // Count visible required fields without a value in a section
  function sectionMissingCount(section: FormSection): number {
    return section.fields.filter((f) => {
      const state = fieldStates[f.id];
      if (state?.hidden) return false;
      return state?.required && !data[f.id];
    }).length;
  }

  return (
    <div className="ff-form__sections">
      {sections.map((section) => {
        const isOpen = expanded.has(section.id);
        const errors = sectionErrorCount(section);
        const missing = sectionMissingCount(section);
        const hasBadge = errors > 0 || missing > 0;

        return (
          <div
            key={section.id}
            className={[
              "ff-form__section-accordion",
              isOpen ? "ff-form__section-accordion--open" : "",
              errors > 0 ? "ff-form__section-accordion--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <button
              type="button"
              className="ff-form__section-header"
              aria-expanded={isOpen}
              onClick={() => toggle(section.id)}
            >
              <span className="ff-form__section-header-title">
                {section.title ?? "Section"}
              </span>

              <span className="ff-form__section-header-right">
                {hasBadge && (
                  <span
                    className={`ff-form__section-badge ${
                      errors > 0 ? "ff-form__section-badge--error" : "ff-form__section-badge--warn"
                    }`}
                  >
                    {errors > 0 ? errors : missing}
                  </span>
                )}
                <span
                  className="ff-form__section-chevron"
                  aria-hidden="true"
                >
                  {isOpen ? "▲" : "▼"}
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="ff-form__section-body">
                {section.description && (
                  <p className="ff-form__section-description">
                    {section.description}
                  </p>
                )}
                <SectionRenderer
                  section={section}
                  data={data}
                  fieldStates={fieldStates}
                  validationErrors={validationErrors}
                  mode={mode}
                  renderers={renderers}
                  onFieldChange={onFieldChange}
                  uploadMediaForField={uploadMediaForField}
                  deleteMediaItem={deleteMediaItem}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
