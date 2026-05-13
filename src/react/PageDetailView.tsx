import type { FormPage, FormStructure, ValidationErrors, FieldState } from "../types/form";
import type { FieldRenderers } from "../types/props";
import { SectionAccordion } from "./SectionAccordion";

type PageDetailViewProps = {
  page: FormPage;
  pageIndex: number;
  totalPages: number;
  data: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  validationErrors: ValidationErrors;
  mode: "create" | "edit" | "readonly";
  renderers?: Partial<FieldRenderers>;
  parentSchema?: FormStructure;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onFieldChange: (fieldId: string, value: unknown) => void;
  uploadMediaForField: (fieldId: string, file: File) => Promise<{ uuid: string }>;
  deleteMediaItem: (mediaUuid: string) => Promise<void>;
};

export function PageDetailView({
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
}: PageDetailViewProps) {
  return (
    <div className="ff-form__page-detail">
      {/* Top bar */}
      <div className="ff-form__page-detail-topbar">
        <button
          type="button"
          className="ff-form__btn ff-form__btn--back"
          onClick={onBack}
          aria-label="Back to pages"
        >
          ‹ Back
        </button>
        <span className="ff-form__page-detail-pager">
          {pageIndex + 1} / {totalPages}
        </span>
      </div>

      {/* Page heading */}
      {page.title && (
        <h2 className="ff-form__page-title">{page.title}</h2>
      )}
      {page.description && (
        <p className="ff-form__page-description">{page.description}</p>
      )}

      {/* Sections with accordion */}
      <SectionAccordion
        sections={page.sections}
        data={data}
        fieldStates={fieldStates}
        validationErrors={validationErrors}
        mode={mode}
        renderers={renderers}
        parentSchema={parentSchema}
        onFieldChange={onFieldChange}
        uploadMediaForField={uploadMediaForField}
        deleteMediaItem={deleteMediaItem}
      />

      {/* Page prev/next */}
      {totalPages > 1 && (
        <div className="ff-form__page-nav">
          <button
            type="button"
            className="ff-form__btn ff-form__btn--page-nav"
            disabled={pageIndex === 0}
            onClick={onPrev}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="ff-form__btn ff-form__btn--page-nav"
            disabled={pageIndex >= totalPages - 1}
            onClick={onNext}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
