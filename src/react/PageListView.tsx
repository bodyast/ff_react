import type { FormPage, ValidationErrors, FieldState } from "../types/form";

type PageListViewProps = {
  pages: FormPage[];
  fieldStates: Record<string, FieldState>;
  validationErrors: ValidationErrors;
  data: Record<string, unknown>;
  onSelectPage: (pageId: string) => void;
};

export function PageListView({
  pages,
  fieldStates,
  validationErrors,
  data,
  onSelectPage,
}: PageListViewProps) {
  function pageErrorCount(page: FormPage): number {
    return page.sections.flatMap((s) => s.fields).filter((f) =>
      validationErrors[f.id]?.length
    ).length;
  }

  function pageMissingCount(page: FormPage): number {
    return page.sections.flatMap((s) => s.fields).filter((f) => {
      const state = fieldStates[f.id];
      if (state?.hidden) return false;
      return state?.required && !data[f.id];
    }).length;
  }

  function pageFieldCount(page: FormPage): number {
    return page.sections.flatMap((s) =>
      s.fields.filter((f) => !fieldStates[f.id]?.hidden)
    ).length;
  }

  return (
    <div className="ff-form__page-list">
      {pages.map((page, idx) => {
        const errors = pageErrorCount(page);
        const missing = pageMissingCount(page);
        const total = pageFieldCount(page);

        return (
          <button
            key={page.id}
            type="button"
            className={[
              "ff-form__page-card",
              errors > 0 ? "ff-form__page-card--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectPage(page.id)}
          >
            <span className="ff-form__page-card-number">{idx + 1}</span>

            <span className="ff-form__page-card-info">
              <span className="ff-form__page-card-title">
                {page.title ?? `Page ${idx + 1}`}
              </span>
              {page.description && (
                <span className="ff-form__page-card-desc">{page.description}</span>
              )}
              <span className="ff-form__page-card-meta">
                {total} field{total !== 1 ? "s" : ""}
                {page.sections.length > 1 &&
                  ` · ${page.sections.length} sections`}
              </span>
            </span>

            <span className="ff-form__page-card-right">
              {errors > 0 ? (
                <span className="ff-form__page-card-badge ff-form__page-card-badge--error">
                  {errors} error{errors !== 1 ? "s" : ""}
                </span>
              ) : missing > 0 ? (
                <span className="ff-form__page-card-badge ff-form__page-card-badge--warn">
                  {missing} required
                </span>
              ) : null}
              <span className="ff-form__page-card-arrow" aria-hidden="true">
                ›
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
