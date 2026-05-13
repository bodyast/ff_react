import { useCallback, useEffect, useReducer, useRef } from "react";
import type { FFFormProps, FFFormContextValue } from "../types/props";
import type { FormStructure, FieldState, ValidationErrors } from "../types/form";
import { createFormEngine } from "../core/engine";
import type { FormEngine } from "../core/engine";
import { resolveAdapter, resolveEffectiveApiKey } from "../api/client";

type FFFormState = {
  loading: boolean; error: Error | null; schema: FormStructure | null;
  data: Record<string, unknown>; fieldStates: Record<string, FieldState>; validationErrors: ValidationErrors;
};

const initialState: FFFormState = { loading: false, error: null, schema: null, data: {}, fieldStates: {}, validationErrors: {} };

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; schema: FormStructure; data: Record<string, unknown>; fieldStates: Record<string, FieldState> }
  | { type: "LOAD_ERROR"; error: Error }
  | { type: "ENGINE_UPDATE"; data: Record<string, unknown>; fieldStates: Record<string, FieldState> }
  | { type: "SET_ERRORS"; errors: ValidationErrors }
  | { type: "CLEAR_ERRORS" };

function reducer(state: FFFormState, action: Action): FFFormState {
  switch (action.type) {
    case "LOAD_START": return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS": return { ...state, loading: false, error: null, schema: action.schema, data: action.data, fieldStates: action.fieldStates };
    case "LOAD_ERROR": return { ...state, loading: false, error: action.error };
    case "ENGINE_UPDATE": return { ...state, data: action.data, fieldStates: action.fieldStates };
    case "SET_ERRORS": return { ...state, validationErrors: action.errors };
    case "CLEAR_ERRORS": return { ...state, validationErrors: {} };
    default: return state;
  }
}

export function useFFForm(props: FFFormProps) {
  const {
    apiBaseUrl, apiKey, getApiKey, formId, formVersionUuid, submissionId,
    schema: schemaProp, formData, initialData, mode = "create", autoLoad = true,
    apiAdapter, onChange, onSubmit, onDraftSubmit, onFinalSubmit,
    onSubmitSuccess, onSubmitError, onLoadError, onReady, onUploadMedia,
  } = props;

  const [state, dispatch] = useReducer(reducer, initialState);
  const engineRef = useRef<FormEngine | null>(null);
  const readyFired = useRef(false);
  const adapter = resolveAdapter(apiAdapter);
  const getKey = useCallback(() => resolveEffectiveApiKey(apiKey, getApiKey), [apiKey, getApiKey]);

  const load = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const key = await getKey();
      let schema: FormStructure;
      if (schemaProp) { schema = schemaProp; }
      else if (formId) { schema = await adapter.fetchFormStructure({ apiBaseUrl, apiKey: key, formId }); }
      else { throw new Error("Provide `schema` prop or `formId`"); }

      // Resolve initial data — formData takes priority, initialData is a fallback
      let submissionData: Record<string, unknown> = {};
      if (formData) {
        const isSubmission = formData !== null && typeof formData === "object" && "data" in formData;
        const nested = isSubmission ? (formData as { data?: Record<string, unknown> }).data : undefined;
        submissionData = nested ? { ...nested } : { ...(formData as Record<string, unknown>) };
      }
      if (initialData) {
        // initialData overrides formData field-by-field
        submissionData = { ...submissionData, ...initialData };
      }

      if ((mode === "edit" || mode === "readonly") && submissionId) {
        const sub = await adapter.fetchSubmission({ apiBaseUrl, apiKey: key, submissionId });
        submissionData = { ...submissionData, ...(sub.data ?? {}) };
      }

      const engine = createFormEngine({ schema, initialData: submissionData, submissionId, formVersionUuid: formVersionUuid ?? schema.uuid });
      engineRef.current = engine;
      dispatch({ type: "LOAD_SUCCESS", schema, data: engine.getData(), fieldStates: engine.getAllFieldStates() });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      dispatch({ type: "LOAD_ERROR", error });
      onLoadError?.(error);
    }
  }, [adapter, apiBaseUrl, formData, formId, formVersionUuid, getKey, initialData, mode, onLoadError, schemaProp, submissionId]);

  // Subscribe to engine changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    return engine.subscribe(() => {
      const data = engine.getData();
      dispatch({ type: "ENGINE_UPDATE", data, fieldStates: engine.getAllFieldStates() });
      onChange?.(data);
    });
  }, [state.schema, onChange]);

  // Fire onReady once
  useEffect(() => {
    if (!state.schema || readyFired.current) return;
    readyFired.current = true;
    onReady?.({
      data: engineRef.current?.getData() ?? {},
      fieldStates: engineRef.current?.getAllFieldStates() ?? {},
      validationErrors: {},
      schema: state.schema,
      changeField, submitDraft, submitFinal, reset, reload,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.schema]);

  useEffect(() => { if (autoLoad) void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeField = useCallback((fieldId: string, value: unknown) => { engineRef.current?.changeField(fieldId, value); }, []);
  const isVisible  = useCallback((id: string) => !state.fieldStates[id]?.hidden, [state.fieldStates]);
  const isDisabled = useCallback((id: string) => state.fieldStates[id]?.disabled ?? false, [state.fieldStates]);
  const isReadonly = useCallback((id: string) => mode === "readonly" || (state.fieldStates[id]?.readonly ?? false), [mode, state.fieldStates]);
  const isRequired = useCallback((id: string) => state.fieldStates[id]?.required ?? false, [state.fieldStates]);

  const doSubmit = useCallback(async (isFinal: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    dispatch({ type: "CLEAR_ERRORS" });
    if (isFinal) {
      const errors = engine.validate();
      if (Object.keys(errors).length) { dispatch({ type: "SET_ERRORS", errors }); onSubmitError?.(new Error("Validation failed")); return; }
    }
    const payload = engine.buildPayload({ isFinal });
    try {
      if (onSubmit) {
        // Custom submit handler — skip API call entirely
        const result = await onSubmit(payload);
        onSubmitSuccess?.(result ?? payload);
      } else {
        if (isFinal) await onFinalSubmit?.(payload);
        else await onDraftSubmit?.(payload);
        const key = await getKey();
        const result = await adapter.submitForm({ apiBaseUrl, apiKey: key, payload, isFinal });
        onSubmitSuccess?.(result);
      }
    } catch (err) { onSubmitError?.(err); }
  }, [adapter, apiBaseUrl, getKey, onSubmit, onDraftSubmit, onFinalSubmit, onSubmitError, onSubmitSuccess]);

  const submitDraft = useCallback(() => doSubmit(false), [doSubmit]);
  const submitFinal = useCallback(() => doSubmit(true), [doSubmit]);
  const reset = useCallback(() => { engineRef.current?.reset(); dispatch({ type: "CLEAR_ERRORS" }); }, []);
  const reload = useCallback(() => load(), [load]);

  const uploadMediaForField = useCallback(async (fieldId: string, file: File) => {
    if (onUploadMedia) {
      return onUploadMedia(file, fieldId);
    }
    const key = await getKey();
    return adapter.uploadMedia({ apiBaseUrl, apiKey: key, submissionId, fieldId, file });
  }, [adapter, apiBaseUrl, getKey, onUploadMedia, submissionId]);

  const deleteMediaItem = useCallback(async (mediaUuid: string) => {
    const key = await getKey();
    return adapter.deleteMedia({ apiBaseUrl, apiKey: key, submissionId, mediaUuid });
  }, [adapter, apiBaseUrl, getKey, submissionId]);

  return {
    loading: state.loading, error: state.error, schema: state.schema,
    data: state.data, fieldStates: state.fieldStates, validationErrors: state.validationErrors,
    changeField, submitDraft, submitFinal, reset, reload,
    isVisible, isDisabled, isReadonly, isRequired,
    uploadMediaForField, deleteMediaItem,
  };
}

export type { FFFormContextValue };
