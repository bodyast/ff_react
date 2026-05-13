import type { FieldRendererProps, FieldRenderers } from "../types/props";
import type { FormField } from "../types/form";
import { TextField } from "./fields/TextField";
import { TextAreaField } from "./fields/TextAreaField";
import { NumberField } from "./fields/NumberField";
import { SelectField } from "./fields/SelectField";
import { CheckboxField } from "./fields/CheckboxField";
import { DateField } from "./fields/DateField";
import { MediaField } from "./fields/MediaField";
import { SubFormField } from "./fields/SubFormField";
import { ChoiceField } from "./fields/ChoiceField";
import { PlaceholderField } from "./fields/PlaceholderField";
import { ButtonField } from "./fields/ButtonField";
import { LocationField } from "./fields/LocationField";

// ---------------------------------------------------------------------------
// Default renderer registry
// ---------------------------------------------------------------------------

const DEFAULT_RENDERERS: FieldRenderers = {
  text: TextField,
  textarea: TextAreaField,
  number: NumberField,
  integer: NumberField,
  select: SelectField,
  checkbox: CheckboxField,
  date: DateField,
  datetime: DateField,
  file: MediaField,
  image: MediaField,
  media: MediaField,
  choice: ChoiceField,
  placeholder: PlaceholderField,
  button: ButtonField,
  location: LocationField,
  subform: SubFormField,
};

// ---------------------------------------------------------------------------
// Fallback for unknown types
// ---------------------------------------------------------------------------

function FallbackField({ field }: { field: FormField }) {
  console.warn("[ff-forms] unsupported field type:", field.type, "id:", field.id);
  return (
    <div className="ff-form__field-unsupported">
      Unsupported field type: <code>{field.type}</code>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dispatcher
// `renderers` is already part of FieldRendererProps so it flows through to
// components that need it (e.g. SubFormField for its nested accordion).
// ---------------------------------------------------------------------------

export function FieldRenderer(props: FieldRendererProps) {
  const { field, renderers } = props;
  const registry: FieldRenderers = {
    ...DEFAULT_RENDERERS,
    ...(renderers as FieldRenderers),
  };
  const Component = registry[field.type];
  if (!Component) return <FallbackField field={field} />;
  return <Component {...props} />;
}
