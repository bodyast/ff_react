import type { FieldRendererProps } from "../../types/props";

export function DateField({ field, value, disabled, readonly, required, onChange }: FieldRendererProps) {
  const includeTime = field.type === "datetime";
  function toInputValue(v: unknown): string {
    if (!v) return "";
    const s = String(v);
    return includeTime ? s.slice(0, 16) : s.slice(0, 10);
  }
  return (
    <input
      id={field.id} type={includeTime ? "datetime-local" : "date"}
      className="ff-form__input ff-form__input--date"
      value={toInputValue(value)} disabled={disabled} readOnly={readonly}
      required={required} aria-required={required}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}
