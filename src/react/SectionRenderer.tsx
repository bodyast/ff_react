import type { FormSection, FormStructure, ValidationErrors, FieldState } from "../types/form";
import type { FieldRenderers } from "../types/props";
import { FieldRenderer } from "./FieldRenderer";

type SectionRendererProps = {
  section: FormSection;
  data: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  validationErrors: ValidationErrors;
  mode: "create" | "edit" | "readonly";
  renderers?: Partial<FieldRenderers>;
  parentSchema?: FormStructure;
  onFieldChange: (fieldId: string, value: unknown) => void;
  uploadMediaForField: (fieldId: string, file: File) => Promise<{ uuid?: string; url?: string }>;
  deleteMediaItem: (mediaUuid: string) => Promise<void>;
};

export function SectionRenderer({
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
}: SectionRendererProps) {
  const visibleFields = section.fields.filter(
    (f) => !fieldStates[f.id]?.hidden
  );

  if (visibleFields.length === 0) return null;

  return (
    <div className="ff-form__section-fields">
      {visibleFields.map((field) => {
        const state = fieldStates[field.id];
        const isReadonly = mode === "readonly" || (state?.readonly ?? false);
        const isDisabled = state?.disabled ?? false;
        const isRequired = state?.required ?? false;
        const errors = validationErrors[field.id];

        const isLabelless =
          field.type === "placeholder" || field.type === "button";

        return (
          <div
            key={field.id}
            className={[
              "ff-form__field",
              errors?.length ? "ff-form__field--error" : "",
              isLabelless ? "ff-form__field--labelless" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!isLabelless && (field.label || field.title) && (
              <label className="ff-form__label" htmlFor={field.id}>
                {field.label ?? field.title}
                {isRequired && (
                  <span className="ff-form__required" aria-hidden="true">
                    {" *"}
                  </span>
                )}
              </label>
            )}

            {field.description && (
              <p className="ff-form__field-description">{field.description}</p>
            )}

            <FieldRenderer
              field={field}
              value={data[field.id]}
              error={errors}
              disabled={isDisabled}
              readonly={isReadonly}
              required={isRequired}
              renderers={renderers}
              parentSchema={parentSchema}
              validationErrors={validationErrors}
              onChange={(value) => onFieldChange(field.id, value)}
              uploadMedia={(file) => uploadMediaForField(field.id, file)}
              uploadMediaForField={uploadMediaForField}
              deleteMedia={deleteMediaItem}
            />

            {errors?.map((msg, i) => (
              <span key={i} className="ff-form__error" role="alert">
                {msg}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
