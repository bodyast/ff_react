import type { FieldRendererProps } from "../../types/props";

export function TextField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const sizeType = settings.type as string | undefined;

  // 'small' = 1 line, 'big' = 5 lines, default = 3 lines
  const rows = sizeType === "small" ? 1 : sizeType === "big" ? 5 : 3;

  const commonProps = {
    id: field.id,
    className: "ff-form__input",
    value: typeof value === "string" ? value : "",
    placeholder: field.placeholder ?? "",
    disabled,
    readOnly: readonly,
    required,
    "aria-required": required,
  };

  if (rows === 1) {
    return (
      <input
        type="text"
        {...commonProps}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <textarea
      {...commonProps}
      className="ff-form__textarea"
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
