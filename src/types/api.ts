import type { FormStructure, FormSubmission, FormSubmissionPayload, LookupList } from "./form";

export type ApiAdapterConfig = {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  requestInit?: Omit<RequestInit, "method" | "body" | "headers">;
  proxyPath?: string;
};

export type ApiAdapter = ApiAdapterConfig & {
  fetchFormStructure?: (params: { apiBaseUrl?: string; apiKey?: string | null; formId: string }) => Promise<FormStructure>;
  fetchSubmission?: (params: { apiBaseUrl?: string; apiKey?: string | null; submissionId: string }) => Promise<FormSubmission>;
  createSubmission?: (params: { apiBaseUrl?: string; apiKey?: string | null; payload: FormSubmissionPayload }) => Promise<FormSubmission>;
  updateSubmission?: (params: { apiBaseUrl?: string; apiKey?: string | null; submissionId: string; payload: FormSubmissionPayload }) => Promise<FormSubmission>;
  submitForm?: (params: { apiBaseUrl?: string; apiKey?: string | null; payload: FormSubmissionPayload; isFinal: boolean }) => Promise<unknown>;
  uploadMedia?: (params: { apiBaseUrl?: string; apiKey?: string | null; submissionId?: string; fieldId: string; file: File }) => Promise<{ uuid: string }>;
  deleteMedia?: (params: { apiBaseUrl?: string; apiKey?: string | null; submissionId?: string; mediaUuid: string }) => Promise<void>;
  fetchLookupList?: (params: { apiBaseUrl?: string; apiKey?: string | null; listId: string }) => Promise<LookupList>;
};

export type ResolvedApiAdapter = Required<Omit<ApiAdapter, "fetchFn" | "requestInit" | "proxyPath">>;
