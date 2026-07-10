import { useEffect, useState, useRef } from "react";
import type { ChangeEvent } from "react";
import type { FieldRendererProps } from "../../types/props";
import type { FormFieldOption } from "../../types/form";

export function SelectField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  fetchLookupList,
}: FieldRendererProps) {
  const settings = field.settings ?? {};
  const isMultiple = Boolean(settings.isMultiple ?? settings.is_multiple ?? settings.allowMany ?? settings.allow_many);
  const staticOptions: FormFieldOption[] =
    (field.options?.length ? field.options : undefined) ??
    (settings.options as FormFieldOption[] | undefined) ??
    [];
  const [options, setOptions] = useState<FormFieldOption[]>(staticOptions);
  const [lookupLoading, setLookupLoading] = useState(false);
  const fetchedIdRef = useRef<string | null>(null);

  // Load lookup list if no static options and source is defined
  useEffect(() => {
    const source = settings.source;
    const sourceId = (source?.id ?? source?.listId) as string | undefined;

    if (staticOptions.length > 0 || !sourceId || fetchedIdRef.current === sourceId) return;

    setLookupLoading(true);
    fetchedIdRef.current = sourceId;
    let settled = false;

    if (fetchLookupList) {
      fetchLookupList(sourceId)
        .then((res) => {
          if (settled) return;
          settled = true;
          // res might be the unwrapped LookupList or still have a .data wrapper
          const items = (res?.data?.items || res?.items || []) as any[];
          const labelKey = (source?.label as string) || "label";
          const valueKey = (source?.value as string) || "value";
          const mapped: FormFieldOption[] = items.map((item: any) => ({
            label: String(item[labelKey] ?? ""),
            value: String(item[valueKey] ?? ""),
          }));
          setOptions(mapped);
          setLookupLoading(false);
        })
        .catch(() => {
          if (settled) return;
          settled = true;
          setLookupLoading(false);
        });
      return;
    }

    const timeout = setTimeout(() => {
      if (!settled) { settled = true; setLookupLoading(false); }
    }, 10_000);

    const event = new CustomEvent("ff-forms:fetchLookupList", {
      bubbles: true,
      detail: {
        listId: sourceId,
        fieldId: field.id,
        onResult: (items: FormFieldOption[]) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setOptions(items);
          setLookupLoading(false);
        },
        onError: () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setLookupLoading(false);
        },
      },
    });
    document.dispatchEvent(event);

    return () => { settled = true; clearTimeout(timeout); };
  }, [field.id, settings.source, staticOptions.length, fetchLookupList]);

  const selectedValues = Array.isArray(value)
    ? (value as (string | number)[]).map(String)
    : value !== undefined && value !== null
    ? [String(value)]
    : [];

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    if (isMultiple) {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      onChange(selected);
    } else {
      onChange(e.target.value === "" ? undefined : e.target.value);
    }
  }

  if (lookupLoading) {
    return <div className="ff-form__select-loading">Loading options…</div>;
  }

  return (
    <select
      id={field.id}
      className="ff-form__select"
      multiple={isMultiple}
      value={isMultiple ? selectedValues : selectedValues[0] ?? ""}
      disabled={disabled || readonly}
      required={required}
      aria-required={required}
      onChange={handleChange}
    >
      {!isMultiple && (
        <option value="">{field.placeholder ?? "— Select —"}</option>
      )}
      {options.map((opt) => (
        <option
          key={String(opt.value)}
          value={String(opt.value)}
          disabled={Boolean(opt.disabled)}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}
