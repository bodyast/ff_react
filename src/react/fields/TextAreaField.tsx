import type { FieldRendererProps } from "../../types/props";

export function TextAreaField({ field, value, disabled, readonly, required, onChange }: FieldRendererProps) {
  const rows = (field.settings?.rows as number | undefined) ?? 4;
  return (
    <textarea
      id={field.id} className="ff-form__textarea"
      value={typeof value === "string" ? value : ""}
      placeholder={field.placeholder ?? ""} disabled={disabled} readOnly={readonly}
      required={required} aria-required={required} rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
