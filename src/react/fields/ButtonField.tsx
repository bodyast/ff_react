import type { FieldRendererProps } from "../../types/props";

/**
 * `button` field — action button: submit, page navigation, or file download.
 * Fires a custom DOM event so the host component can intercept page/submit actions.
 */
export function ButtonField({ field, disabled, readonly }: FieldRendererProps) {
  const settings = field.settings ?? {};
  const action = settings.action as
    | { type?: string; url?: string; pageId?: string; direction?: string }
    | undefined;

  function handleClick() {
    if (disabled || readonly) return;

    switch (action?.type) {
      case "submit":
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: { type: "submit", fieldId: field.id },
          })
        );
        break;
      case "page":
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: {
              type: "page",
              direction: action.direction ?? "next",
              pageId: action.pageId,
              fieldId: field.id,
            },
          })
        );
        break;
      case "file":
        if (action.url) window.open(action.url, "_blank", "noopener,noreferrer");
        break;
      default:
        document.dispatchEvent(
          new CustomEvent("ff-forms:action", {
            bubbles: true,
            detail: { type: action?.type ?? "unknown", fieldId: field.id },
          })
        );
    }
  }

  return (
    <button
      id={field.id}
      type="button"
      className="ff-form__btn ff-form__btn--field"
      disabled={disabled || readonly}
      onClick={handleClick}
    >
      {field.label ?? field.title ?? "Button"}
    </button>
  );
}
