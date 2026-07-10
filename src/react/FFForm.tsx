import { useState, useMemo } from "react";
import type { FFFormProps } from "../types/props";
import { useFFForm } from "./useFFForm";
import { PageListView } from "./PageListView";
import { PageDetailView } from "./PageDetailView";
import { SectionAccordion } from "./SectionAccordion";

/**
 * `FFForm` – the main public component.
 *
 * Multi-page forms:  page list (cards) → tap → page detail with accordion sections.
 * Single-page forms: accordion sections rendered directly.
 */
export function FFForm(props: FFFormProps) {
  const {
    mode = "create",
    submitButtonText = "Submit",
    saveDraftButtonText = "Save draft",
    className,
    style,
    renderers,
  } = props;

  const {
    loading,
    error,
    schema,
    data,
    fieldStates,
    validationErrors,
    changeField,
    submitDraft,
    submitFinal,
    uploadMediaForField,
    deleteMediaItem,
  } = useFFForm(props);

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Shared field change & media handlers
  // --------------------------------------------------------------------------
  const commonProps = useMemo(() => ({
    data,
    fieldStates,
    validationErrors,
    mode,
    renderers,
    parentSchema: schema ?? undefined,
    onFieldChange: changeField,
    uploadMediaForField,
    deleteMediaItem,
    fetchMedia: props.onFetchMedia,
    fetchLookupList: props.onFetchLookupList,
  }), [
    data,
    fieldStates,
    validationErrors,
    mode,
    renderers,
    schema,
    changeField,
    uploadMediaForField,
    deleteMediaItem,
    props.onFetchMedia,
    props.onFetchLookupList,
  ]);

  // --------------------------------------------------------------------------
  // Loading
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className={`ff-form ff-form--loading ${className ?? ""}`} style={style}>
        <div className="ff-form__loading" aria-live="polite" aria-busy="true">
          Loading…
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error
  // --------------------------------------------------------------------------
  if (error) {
    return (
      <div className={`ff-form ff-form--error ${className ?? ""}`} style={style}>
        <div className="ff-form__load-error" role="alert">
          <strong>Failed to load form:</strong> {error.message}
        </div>
      </div>
    );
  }

  if (!schema) return null;

  const isReadonlyMode = mode === "readonly";
  const hasGlobalErrors = Object.keys(validationErrors).length > 0;
  const pages = schema.pages;
  const isMultiPage = pages.length > 1;

  // Current page object
  const currentPage = currentPageId
    ? pages.find((p) => p.id === currentPageId) ?? null
    : null;
  const currentPageIndex = currentPage ? pages.indexOf(currentPage) : -1;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div
      className={[
        "ff-form",
        `ff-form--${mode}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {/* Header */}
      {schema.title && (
        <div className="ff-form__header">
          <h1 className="ff-form__title">{schema.title}</h1>
          {schema.description && (
            <p className="ff-form__description">{schema.description}</p>
          )}
        </div>
      )}

      {/* Validation banner */}
      {hasGlobalErrors && (
        <div className="ff-form__validation-banner" role="alert">
          Please correct the highlighted errors before submitting.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Single-page: accordion sections directly                           */}
      {/* ------------------------------------------------------------------ */}
      {!isMultiPage && (
        <SectionAccordion
          sections={pages[0]?.sections ?? []}
          {...commonProps}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Multi-page: page list OR page detail                               */}
      {/* ------------------------------------------------------------------ */}
      {isMultiPage && !currentPage && (
        <PageListView
          pages={pages}
          fieldStates={fieldStates}
          validationErrors={validationErrors}
          data={data}
          onSelectPage={(id) => setCurrentPageId(id)}
        />
      )}

      {isMultiPage && currentPage && (
        <PageDetailView
          page={currentPage}
          pageIndex={currentPageIndex}
          totalPages={pages.length}
          {...commonProps}
          onBack={() => setCurrentPageId(null)}
          onPrev={() => {
            if (currentPageIndex > 0)
              setCurrentPageId(pages[currentPageIndex - 1].id);
          }}
          onNext={() => {
            if (currentPageIndex < pages.length - 1)
              setCurrentPageId(pages[currentPageIndex + 1].id);
          }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Action buttons (not visible inside page detail for multi-page)     */}
      {/* ------------------------------------------------------------------ */}
      {!isReadonlyMode && (!isMultiPage || !currentPage) && (
        <div className="ff-form__actions">
          <button
            type="button"
            className="ff-form__btn ff-form__btn--draft"
            onClick={() => void submitDraft()}
          >
            {saveDraftButtonText}
          </button>
          <button
            type="button"
            className="ff-form__btn ff-form__btn--submit"
            onClick={() => void submitFinal()}
          >
            {submitButtonText}
          </button>
        </div>
      )}
    </div>
  );
}
