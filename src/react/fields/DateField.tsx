import type { FieldRendererProps } from "../../types/props";

export function DateField({ field, value, disabled, readonly, required, onChange }: FieldRendererProps) {
  const settings = field.settings ?? {};
  const displayFormat = (settings.displayFormat ?? settings.display_format) as string | undefined;
  const isTimeOnly = displayFormat === "H:i";
  const includeTime = field.type === "datetime";

  function toInputValue(v: unknown): string {
    if (!v) return "";
    const s = String(v);
    if (isTimeOnly) return s.length > 10 ? s.slice(11, 16) : s;
    if (includeTime) return s.slice(0, 16).replace(" ", "T");
    return s.slice(0, 10);
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
      onChange={(e) => {
        const val = e.target.value;
        if (!val) {
          onChange(undefined);
          return;
        }

        if (isTimeOnly) {
          const existing = String(value || "");
          const datePart = existing.length > 10 ? existing.slice(0, 11) : new Date().toISOString().slice(0, 10) + " ";
          onChange(`${datePart}${val}:00.000`);
        } else if (includeTime) {
          onChange(val.replace("T", " ") + ":00.000");
        } else {
          onChange(val + " 00:00:00.000");
        }
      }}
    />
  );
}
