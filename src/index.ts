// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

// React components & hooks
export { FFForm } from "./react/FFForm";
export { useFFForm } from "./react/useFFForm";

// Core engine (headless usage)
export { createFormEngine } from "./core/engine";
export { applyDefaultValues } from "./core/defaults";
export { evaluateDependencies } from "./core/dependencies";
export { validateForm } from "./core/validation";
export { normalizeSubmissionData } from "./core/normalize";
export { buildSubmissionPayload } from "./core/payload";
export { applyJsonLogic, isTruthy } from "./core/jsonLogic";

// API
export {
  defaultApiAdapter,
  createDefaultAdapter,
  resolveAdapter,
  resolveEffectiveApiKey,
} from "./api/client";

// Types
export type {
  // Form schema
  FormStructure,
  FormPage,
  FormSection,
  FormField,
  FormFieldOption,
  FormFieldSettings,
  FormFieldSource,
  FormFieldSourceFilter,
  FormFieldAction,
  FormElementSettings,
  // Dependencies
  FormDependency,
  DependencyCondition,
  DependencyAction,
  DependencyValueResolver,
  // Field state
  FieldState,
  ValidationErrors,
  // Submission
  FormSubmission,
  FormSubmissionPayload,
  NormalizedSubformEntry,
  // Lookup
  LookupList,
  LookupListItem,
} from "./types/form";

export type { ApiAdapter, ApiAdapterConfig, ResolvedApiAdapter } from "./types/api";

export type {
  FFFormProps,
  FFFormContextValue,
  FieldRendererProps,
  FieldRenderers,
  MediaFetchResult,
} from "./types/props";
