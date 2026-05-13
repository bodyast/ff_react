import type { FieldRendererProps } from "../../types/props";

export function NumberField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const isInteger = field.type === "integer";
  const isCounter = Boolean(settings.isCounter ?? settings.is_counter);
  const step = settings.step !== undefined ? Number(settings.step) : isInteger ? 1 : undefined;
  const min = settings.min !== undefined ? Number(settings.min) : undefined;
  const max = settings.max !== undefined ? Number(settings.max) : undefined;

  const num = value !== undefined && value !== null && value !== "" ? Number(value) : NaN;

  function parse(raw: string): number | undefined {
    if (raw === "") return undefined;
    const n = isInteger ? parseInt(raw, 10) : parseFloat(raw);
    return isNaN(n) ? undefined : n;
  }

  function increment(delta: number) {
    const current = isNaN(num) ? 0 : num;
    const next = current + delta * (step ?? 1);
    const clamped =
      min !== undefined && next < min
        ? min
        : max !== undefined && next > max
        ? max
        : next;
    onChange(isInteger ? Math.round(clamped) : clamped);
  }

  if (isCounter) {
    return (
      <div className="ff-form__counter">
        <button
          type="button"
          className="ff-form__btn ff-form__btn--counter"
          disabled={disabled || readonly || (min !== undefined && !isNaN(num) && num <= min)}
          aria-label="Decrease"
          onClick={() => increment(-1)}
        >
          −
        </button>
        <span className="ff-form__counter-value">
          {isNaN(num) ? (min ?? 0) : num}
        </span>
        <button
          type="button"
          className="ff-form__btn ff-form__btn--counter"
          disabled={disabled || readonly || (max !== undefined && !isNaN(num) && num >= max)}
          aria-label="Increase"
          onClick={() => increment(1)}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <input
      id={field.id}
      type="number"
      className="ff-form__input ff-form__input--number"
      value={!isNaN(num) ? num : ""}
      placeholder={field.placeholder ?? ""}
      disabled={disabled}
      readOnly={readonly}
      required={required}
      aria-required={required}
      min={min}
      max={max}
      step={step ?? "any"}
      onChange={(e) => onChange(parse(e.target.value))}
    />
  );
}
