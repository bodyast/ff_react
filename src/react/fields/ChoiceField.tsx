import type { FieldRendererProps } from "../../types/props";
import type { FormFieldOption } from "../../types/form";

/**
 * `choice` field — pill/button style option picker.
 * Single or multiple selection based on `settings.isMultiple`.
 */
export function ChoiceField({
  field,
  value,
  disabled,
  readonly,
  onChange,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const isMultiple = Boolean(settings.isMultiple ?? settings.allowMany);
  const options: FormFieldOption[] = field.options ?? [];

  const selectedValues: (string | number)[] = Array.isArray(value)
    ? (value as (string | number)[])
    : value !== undefined && value !== null
    ? [value as string | number]
    : [];

  function toggle(optVal: string | number) {
    if (disabled || readonly) return;
    const strVal = String(optVal);

    if (isMultiple) {
      const next = selectedValues.some((v) => String(v) === strVal)
        ? selectedValues.filter((v) => String(v) !== strVal)
        : [...selectedValues, optVal];
      onChange(next);
    } else {
      // Deselect if tapping already-selected
      const alreadySelected = selectedValues.some((v) => String(v) === strVal);
      onChange(alreadySelected ? undefined : optVal);
    }
  }

  return (
    <div className="ff-form__choice-group" role="group" aria-label={field.label ?? field.title}>
      {options.map((opt) => {
        const isSelected = selectedValues.some((v) => String(v) === String(opt.value));
        return (
          <button
            key={String(opt.value)}
            type="button"
            className={[
              "ff-form__choice-btn",
              isSelected ? "ff-form__choice-btn--selected" : "",
              (disabled || readonly || Boolean(opt.disabled))
                ? "ff-form__choice-btn--disabled"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled || readonly || Boolean(opt.disabled)}
            aria-pressed={isSelected}
            onClick={() => toggle(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
