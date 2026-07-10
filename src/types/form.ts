// ---------------------------------------------------------------------------
// Core form schema types
// ---------------------------------------------------------------------------

export type FormStructure = {
  uuid: string;
  title?: string;
  description?: string;
  pages: FormPage[];
  dependencies?: FormDependency[];
  /** Nested subform schemas, keyed by the subform field's settings.id */
  subforms?: Record<string, FormStructure>;
};

export type FormPage = {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  sections: FormSection[];
  settings?: FormElementSettings;
};

export type FormSection = {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  fields: FormField[];
  settings?: FormElementSettings;
};

export type FormField = {
  id: string;
  type: string;
  label?: string;
  /** Some backends use `title` instead of `label` */
  title?: string;
  description?: string;
  placeholder?: string;
  order?: number;
  options?: FormFieldOption[];
  settings?: FormFieldSettings;
};

export type FormFieldOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

export type FormFieldSettings = {
  required?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  defaultValue?: unknown;

  // number / integer
  min?: number | string;
  max?: number | string;
  step?: number | string;
  /** Render as +/- counter buttons */
  isCounter?: boolean;

  // text / textarea
  /** 'small' = 1 line, 'big' = 5 lines, default = 3 lines */
  type?: string;

  // select / checkbox / choice
  allowMany?: boolean;
  isMultiple?: boolean;
  isSwitch?: boolean;

  // file / media / image
  minFiles?: number;
  maxFiles?: number;
  maxSize?: number;
  minSize?: number;
  allowedFormats?: string[];

  // date
  displayFormat?: string;

  // subform
  /** Subform schema key in FormStructure.subforms */
  id?: string;
  textAdd?: string;
  textRemove?: string;

  // select – lookup list source
  source?: FormFieldSource;

  // button
  action?: FormFieldAction;

  // label visibility (checkbox)
  label?: boolean;

  [key: string]: unknown;
};

export type FormFieldSource = {
  type?: "lookup" | "api" | "list" | string;
  id?: string;
  listId?: string;
  url?: string;
  value?: string;
  label?: string;
  filters?: FormFieldSourceFilter[] | null;
  [key: string]: unknown;
};

export type FormFieldSourceFilter = {
  field: string;
  column: string;
};

export type FormFieldAction = {
  type: "submit" | "page" | "file" | string;
  url?: string;
  pageId?: string;
  direction?: "next" | "prev" | string;
  [key: string]: unknown;
};

export type FormElementSettings = {
  hidden?: boolean;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Dependencies – full JSON Logic-compatible format matching Flutter backend
// ---------------------------------------------------------------------------

export type FormDependency = {
  id?: string;
  /** Field IDs whose changes trigger evaluation of this dependency */
  sources?: string[];
  /** Legacy single-trigger format */
  trigger?: string;
  /** Single condition (legacy) */
  condition?: DependencyCondition;
  /** Multiple conditions */
  conditions?: DependencyCondition[];
  conditionOperator?: "and" | "or";
  actions: DependencyAction[];
  [key: string]: unknown;
};

export type DependencyCondition = {
  /** 'logic' = JSON Logic expression in `value` */
  type?: "logic" | "field" | string;
  /** JSON Logic rule when type='logic', or condition value otherwise */
  value?: unknown;
  // Legacy operators
  field?: string;
  operator?: string;
};

export type DependencyAction = {
  /** Target field ID. May contain wildcard: "subform_id.*.field_id" */
  target?: string;
  /** Legacy: same as target */
  field?: string;
  property: "hidden" | "disabled" | "readonly" | "required" | "value" | string;
  valueResolver?: DependencyValueResolver;
  /** Legacy direct value */
  value?: unknown;
};

export type DependencyValueResolver = {
  type: "raw" | "field" | "list" | "logic";
  /** raw: literal value; field: source field ID; list: listId; logic: JSON Logic rule */
  value?: unknown;
  /** For type='field': which property to read ('value','hidden','disabled', etc.) */
  sourceProperty?: string;
};

// ---------------------------------------------------------------------------
// Field runtime state
// ---------------------------------------------------------------------------

export type FieldState = {
  hidden: boolean;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
};

export type ValidationErrors = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Submission types
// ---------------------------------------------------------------------------

export type FormSubmission = {
  uuid?: string;
  formVersionUuid?: string;
  submittedAt?: string | null;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type FormSubmissionPayload = {
  uuid?: string;
  formVersionUuid?: string;
  submittedAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Subform normalisation output
// ---------------------------------------------------------------------------

export type NormalizedSubformEntry = {
  form_version_uuid: string;
  submitted_at: string;
  data: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Lookup list
// ---------------------------------------------------------------------------

export type LookupListItem = {
  value: string | number;
  label: string;
  [key: string]: unknown;
};

export type LookupList = {
  id: string;
  items: LookupListItem[];
};
