import type React from "react";
import type { FormField, FormStructure, FormSubmissionPayload, FieldState, ValidationErrors } from "./form";
import type { ApiAdapter } from "./api";

export type FieldRendererProps = {
  field: FormField;
  value: unknown;
  error?: string[];
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  onChange: (value: unknown) => void;
  uploadMedia?: (file: File) => Promise<{ uuid: string }>;
  deleteMedia?: (mediaUuid: string) => Promise<void>;
};

export type FieldRenderers = Record<string, React.ComponentType<FieldRendererProps>>;

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

export type FFFormProps = {
  apiBaseUrl?: string;
  apiKey?: string;
  getApiKey?: () => string | null | Promise<string | null>;
  formId?: string;
  formVersionUuid?: string;
  submissionId?: string;
  schema?: FormStructure;
  initialData?: Record<string, unknown>;
  mode?: "create" | "edit" | "readonly";
  autoLoad?: boolean;
  autoSave?: boolean;
  submitButtonText?: string;
  saveDraftButtonText?: string;
  apiAdapter?: ApiAdapter;
  renderers?: Partial<FieldRenderers>;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (ctx: FFFormContextValue) => void;
  onChange?: (data: Record<string, unknown>) => void;
  onDraftSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
  onFinalSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
  onSubmitSuccess?: (result: unknown) => void;
  onSubmitError?: (error: unknown) => void;
  onLoadError?: (error: unknown) => void;
};
