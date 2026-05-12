import type { FormStructure, FormSubmissionPayload } from "../types/form";
import { normalizeSubmissionData } from "./normalize";

export type BuildPayloadParams = {
  schema: FormStructure; data: Record<string, unknown>;
  submissionId?: string; formVersionUuid?: string;
  isFinal: boolean; metadata?: Record<string, unknown>;
};

export function buildSubmissionPayload(params: BuildPayloadParams): FormSubmissionPayload {
  const { schema, data, submissionId, formVersionUuid, isFinal, metadata = {} } = params;
  const submittedAt = new Date().toISOString();
  const normalizedData = normalizeSubmissionData({ schema, data, submittedAt });
  const payload: FormSubmissionPayload = {
    formVersionUuid: formVersionUuid ?? schema.uuid,
    submittedAt: isFinal ? submittedAt : "",
    data: normalizedData, metadata,
  };
  if (submissionId) payload.uuid = submissionId;
  return payload;
}
