import type React from "react";
import type {
  FormField,
  FormStructure,
  FormSubmission,
  FormSubmissionPayload,
  FieldState,
  ValidationErrors,
} from "./form";
import type { ApiAdapter } from "./api";

// ---------------------------------------------------------------------------
// Field renderer props — passed to every field component
// ---------------------------------------------------------------------------

export type FieldRenderers = Record<string, React.ComponentType<FieldRendererProps>>;

export type FieldRendererProps = {
  field: FormField;
  value: unknown;
  error?: string[];
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  onChange: (value: unknown) => void;

  /** Upload media for THIS field (file only, no fieldId needed) */
  uploadMedia?: (file: File) => Promise<{ uuid: string }>;
  /** Upload media for a CHILD field (used by subforms) */
  uploadMediaForField?: (fieldId: string, file: File) => Promise<{ uuid: string }>;
  deleteMedia?: (mediaUuid: string) => Promise<void>;

  /** Parent form schema — allows subform fields to resolve their nested schema */
  parentSchema?: FormStructure;
  /** Full validation errors map — used by subforms to show nested field errors */
  validationErrors?: ValidationErrors;
  /** Custom field renderers, threaded through for nested subforms */
  renderers?: Partial<FieldRenderers>;
};

// ---------------------------------------------------------------------------
// Form context exposed via onReady / headless usage
// ---------------------------------------------------------------------------

export type FFFormContextValue = {
  data: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  validationErrors: ValidationErrors;
  schema: FormStructure | null;
  changeField: (fieldId: string, value: unknown) => void;
  submitDraft: () => Promise<void>;
  submitFinal: () => Promise<void>;
  reset: () => void;
  reload: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// FFForm component props
// ---------------------------------------------------------------------------

export type FFFormProps = {
  // API connection
  apiBaseUrl?: string;
  apiKey?: string;
  getApiKey?: () => string | null | Promise<string | null>;

  // Form identification
  formId?: string;
  formVersionUuid?: string;
  submissionId?: string;

  // Data sources (use one)
  /** Pre-built schema — skips API fetch */
  schema?: FormStructure;
  /**
   * Pre-populated form field values.
   * Accepts either a plain `{ fieldId: value }` map or a full `FormSubmission`
   * (with a `.data` property). Equivalent to Flutter's `formData` parameter.
   */
  formData?: FormSubmission | Record<string, unknown>;
  /** @deprecated Prefer `formData`. Initial field values for create mode. */
  initialData?: Record<string, unknown>;

  // Behaviour
  mode?: "create" | "edit" | "readonly";
  autoLoad?: boolean;
  autoSave?: boolean;

  // UI
  submitButtonText?: string;
  saveDraftButtonText?: string;
  className?: string;
  style?: React.CSSProperties;

  // Customisation
  apiAdapter?: ApiAdapter;
  renderers?: Partial<FieldRenderers>;

  // Callbacks
  onReady?: (ctx: FFFormContextValue) => void;
  onChange?: (data: Record<string, unknown>) => void;
  onDraftSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
  onFinalSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
  onSubmitSuccess?: (result: unknown) => void;
  onSubmitError?: (error: unknown) => void;
  onLoadError?: (error: unknown) => void;
};
