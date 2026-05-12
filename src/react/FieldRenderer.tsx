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
  // file / image / media all share the same renderer
  file: MediaField,
  image: MediaField,
  media: MediaField,
  // new types
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
  return (
    <div className="ff-form__field-unsupported">
      Unsupported field type: <code>{field.type}</code>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

type FieldRendererOuterProps = FieldRendererProps & {
  renderers?: Partial<FieldRenderers>;
};

export function FieldRenderer({ renderers, ...props }: FieldRendererOuterProps) {
  const { field } = props;
  const registry: FieldRenderers = {
    ...DEFAULT_RENDERERS,
    ...(renderers as FieldRenderers),
  };
  const Component = registry[field.type];
  if (!Component) return <FallbackField field={field} />;
  return <Component {...props} />;
}
