import type { FieldRendererProps } from "../../types/props";

export function DateField({ field, value, disabled, readonly, required, onChange }: FieldRendererProps) {
  const settings = field.settings ?? {};
  const displayFormat = (settings.displayFormat ?? settings.display_format) as string | undefined;
  const isTimeOnly = displayFormat === "H:i";
  const includeTime = field.type === "datetime";

  function toInputValue(v: unknown): string {
    if (!v) return "";
    const s = String(v);
    if (isTimeOnly) return s.length > 5 ? s.slice(11, 16) : s;
    return includeTime ? s.slice(0, 16) : s.slice(0, 10);
  }

  const inputType = isTimeOnly ? "time" : includeTime ? "datetime-local" : "date";

  return (
    <input
      id={field.id}
      type={inputType}
      className="ff-form__input ff-form__input--date"
      value={toInputValue(value)}
      disabled={disabled}
      readOnly={readonly}
      required={required}
      aria-required={required}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}
