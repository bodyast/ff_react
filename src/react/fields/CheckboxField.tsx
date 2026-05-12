import type { FieldRendererProps } from "../../types/props";
import type { FormFieldOption } from "../../types/form";

export function CheckboxField({
  field,
  value,
  disabled,
  readonly,
  onChange,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const isSwitch = Boolean(settings.isSwitch);
  const isMultiple = Boolean(settings.isMultiple ?? settings.allowMany);
  const options: FormFieldOption[] = field.options ?? [];

  // ---------------------------------------------------------------------------
  // Switch mode (single boolean toggle)
  // ---------------------------------------------------------------------------
  if (isSwitch) {
    const checked = Boolean(value);
    return (
      <label className="ff-form__switch-label">
        <input
          id={field.id}
          type="checkbox"
          className="ff-form__switch-input"
          checked={checked}
          disabled={disabled || readonly}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="ff-form__switch-track" aria-hidden="true">
          <span className="ff-form__switch-thumb" />
        </span>
        {settings.label !== false && (field.label ?? field.title) && (
          <span className="ff-form__switch-text">{field.label ?? field.title}</span>
        )}
      </label>
    );
  }

  // ---------------------------------------------------------------------------
  // Multiple checkboxes from options list
  // ---------------------------------------------------------------------------
  if (isMultiple && options.length > 0) {
    const selected: (string | number)[] = Array.isArray(value)
      ? (value as (string | number)[])
      : value !== undefined && value !== null
      ? [value as string | number]
      : [];

    function toggle(optVal: string | number) {
      if (disabled || readonly) return;
      const idx = selected.findIndex((v) => String(v) === String(optVal));
      const next =
        idx === -1
          ? [...selected, optVal]
          : selected.filter((v) => String(v) !== String(optVal));
      onChange(next);
    }

    return (
      <div className="ff-form__checkbox-group" role="group">
        {options.map((opt) => {
          const checked = selected.some((v) => String(v) === String(opt.value));
          const id = `${field.id}-${opt.value}`;
          return (
            <label key={String(opt.value)} className="ff-form__checkbox-label" htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                className="ff-form__checkbox"
                checked={checked}
                disabled={disabled || readonly || Boolean(opt.disabled)}
                onChange={() => toggle(opt.value)}
              />
              <span className="ff-form__checkbox-text">{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Single checkbox
  // ---------------------------------------------------------------------------
  return (
    <label className="ff-form__checkbox-label" htmlFor={field.id}>
      <input
        id={field.id}
        type="checkbox"
        className="ff-form__checkbox"
        checked={Boolean(value)}
        disabled={disabled || readonly}
        onChange={(e) => onChange(e.target.checked)}
      />
      {settings.label !== false && (
        <span className="ff-form__checkbox-text">
          {field.label ?? field.title ?? ""}
        </span>
      )}
    </label>
  );
}
