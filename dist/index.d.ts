import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

type FormStructure = {
    uuid: string;
    title?: string;
    description?: string;
    pages: FormPage[];
    dependencies?: FormDependency[];
    /** Nested subform schemas, keyed by the subform field's settings.id */
    subforms?: Record<string, FormStructure>;
};
type FormPage = {
    id: string;
    title?: string;
    description?: string;
    order?: number;
    sections: FormSection[];
    settings?: FormElementSettings;
};
type FormSection = {
    id: string;
    title?: string;
    description?: string;
    order?: number;
    fields: FormField[];
    settings?: FormElementSettings;
};
type FormField = {
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
type FormFieldOption = {
    value: string | number;
    label: string;
    disabled?: boolean;
};
type FormFieldSettings = {
    required?: boolean;
    hidden?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    defaultValue?: unknown;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** Render as +/- counter buttons */
    isCounter?: boolean;
    /** 'small' = 1 line, 'big' = 5 lines, default = 3 lines */
    type?: string;
    allowMany?: boolean;
    isMultiple?: boolean;
    isSwitch?: boolean;
    minFiles?: number;
    maxFiles?: number;
    maxSize?: number;
    minSize?: number;
    allowedFormats?: string[];
    displayFormat?: string;
    /** Subform schema key in FormStructure.subforms */
    id?: string;
    textAdd?: string;
    textRemove?: string;
    source?: FormFieldSource;
    action?: FormFieldAction;
    label?: boolean;
    [key: string]: unknown;
};
type FormFieldSource = {
    type?: "lookup" | "api" | string;
    id?: string;
    listId?: string;
    url?: string;
    filters?: FormFieldSourceFilter[];
    [key: string]: unknown;
};
type FormFieldSourceFilter = {
    field: string;
    column: string;
};
type FormFieldAction = {
    type: "submit" | "page" | "file" | string;
    url?: string;
    pageId?: string;
    direction?: "next" | "prev" | string;
    [key: string]: unknown;
};
type FormElementSettings = {
    hidden?: boolean;
    [key: string]: unknown;
};
type FormDependency = {
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
type DependencyCondition = {
    /** 'logic' = JSON Logic expression in `value` */
    type?: "logic" | "field" | string;
    /** JSON Logic rule when type='logic', or condition value otherwise */
    value?: unknown;
    field?: string;
    operator?: string;
};
type DependencyAction = {
    /** Target field ID. May contain wildcard: "subform_id.*.field_id" */
    target?: string;
    /** Legacy: same as target */
    field?: string;
    property: "hidden" | "disabled" | "readonly" | "required" | "value" | string;
    valueResolver?: DependencyValueResolver;
    /** Legacy direct value */
    value?: unknown;
};
type DependencyValueResolver = {
    type: "raw" | "field" | "list" | "logic";
    /** raw: literal value; field: source field ID; list: listId; logic: JSON Logic rule */
    value?: unknown;
    /** For type='field': which property to read ('value','hidden','disabled', etc.) */
    sourceProperty?: string;
};
type FieldState = {
    hidden: boolean;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
};
type ValidationErrors = Record<string, string[]>;
type FormSubmission = {
    uuid?: string;
    formVersionUuid?: string;
    submittedAt?: string | null;
    data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
};
type FormSubmissionPayload = {
    uuid?: string;
    formVersionUuid?: string;
    submittedAt: string;
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
};
type NormalizedSubformEntry = {
    form_version_uuid: string;
    submitted_at: string;
    data: Record<string, unknown>;
};
type LookupListItem = {
    value: string | number;
    label: string;
    [key: string]: unknown;
};
type LookupList = {
    id: string;
    items: LookupListItem[];
};

type ApiAdapterConfig = {
    fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
    requestInit?: Omit<RequestInit, "method" | "body" | "headers">;
    proxyPath?: string;
};
type ApiAdapter = ApiAdapterConfig & {
    fetchFormStructure?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        formId: string;
    }) => Promise<FormStructure>;
    fetchSubmission?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        submissionId: string;
    }) => Promise<FormSubmission>;
    createSubmission?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        payload: FormSubmissionPayload;
    }) => Promise<FormSubmission>;
    updateSubmission?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        submissionId: string;
        payload: FormSubmissionPayload;
    }) => Promise<FormSubmission>;
    submitForm?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        payload: FormSubmissionPayload;
        isFinal: boolean;
    }) => Promise<unknown>;
    uploadMedia?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        submissionId?: string;
        fieldId: string;
        file: File;
    }) => Promise<{
        uuid: string;
    }>;
    deleteMedia?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        submissionId?: string;
        mediaUuid: string;
    }) => Promise<void>;
    fetchLookupList?: (params: {
        apiBaseUrl?: string;
        apiKey?: string | null;
        listId: string;
    }) => Promise<LookupList>;
};
type ResolvedApiAdapter = Required<Omit<ApiAdapter, "fetchFn" | "requestInit" | "proxyPath">>;

type FieldRenderers = Record<string, React.ComponentType<FieldRendererProps>>;
type FieldRendererProps = {
    field: FormField;
    value: unknown;
    error?: string[];
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    onChange: (value: unknown) => void;
    /** Upload media for THIS field (file only, no fieldId needed) */
    uploadMedia?: (file: File) => Promise<{
        uuid: string;
    }>;
    /** Upload media for a CHILD field (used by subforms) */
    uploadMediaForField?: (fieldId: string, file: File) => Promise<{
        uuid: string;
    }>;
    deleteMedia?: (mediaUuid: string) => Promise<void>;
    /** Parent form schema — allows subform fields to resolve their nested schema */
    parentSchema?: FormStructure;
    /** Full validation errors map — used by subforms to show nested field errors */
    validationErrors?: ValidationErrors;
    /** Custom field renderers, threaded through for nested subforms */
    renderers?: Partial<FieldRenderers>;
};
type FFFormContextValue = {
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
type FFFormProps = {
    apiBaseUrl?: string;
    apiKey?: string;
    getApiKey?: () => string | null | Promise<string | null>;
    formId?: string;
    formVersionUuid?: string;
    submissionId?: string;
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
    mode?: "create" | "edit" | "readonly";
    autoLoad?: boolean;
    autoSave?: boolean;
    submitButtonText?: string;
    saveDraftButtonText?: string;
    className?: string;
    style?: React.CSSProperties;
    apiAdapter?: ApiAdapter;
    renderers?: Partial<FieldRenderers>;
    onReady?: (ctx: FFFormContextValue) => void;
    onChange?: (data: Record<string, unknown>) => void;
    onDraftSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
    onFinalSubmit?: (payload: FormSubmissionPayload) => void | Promise<void>;
    onSubmitSuccess?: (result: unknown) => void;
    onSubmitError?: (error: unknown) => void;
    onLoadError?: (error: unknown) => void;
};

/**
 * `FFForm` – the main public component.
 *
 * Multi-page forms:  page list (cards) → tap → page detail with accordion sections.
 * Single-page forms: accordion sections rendered directly.
 */
declare function FFForm(props: FFFormProps): react_jsx_runtime.JSX.Element | null;

declare function useFFForm(props: FFFormProps): {
    loading: boolean;
    error: Error | null;
    schema: FormStructure | null;
    data: Record<string, unknown>;
    fieldStates: Record<string, FieldState>;
    validationErrors: ValidationErrors;
    changeField: (fieldId: string, value: unknown) => void;
    submitDraft: () => Promise<void>;
    submitFinal: () => Promise<void>;
    reset: () => void;
    reload: () => Promise<void>;
    isVisible: (id: string) => boolean;
    isDisabled: (id: string) => boolean;
    isReadonly: (id: string) => boolean;
    isRequired: (id: string) => boolean;
    uploadMediaForField: (fieldId: string, file: File) => Promise<{
        uuid: string;
    }>;
    deleteMediaItem: (mediaUuid: string) => Promise<void>;
};

type FormEngineParams = {
    schema: FormStructure;
    initialData?: Record<string, unknown>;
    submissionId?: string;
    formVersionUuid?: string;
};
type FormEngine = {
    changeField(fieldId: string, value: unknown): void;
    getData(): Record<string, unknown>;
    getFieldState(fieldId: string): FieldState;
    getAllFieldStates(): Record<string, FieldState>;
    validate(): ValidationErrors;
    buildPayload(options: {
        isFinal: boolean;
    }): FormSubmissionPayload;
    reset(): void;
    subscribe(listener: () => void): () => void;
};
declare function createFormEngine(params: FormEngineParams): FormEngine;

declare function applyDefaultValues(schema: FormStructure, data: Record<string, unknown>): Record<string, unknown>;

type EvaluateDependenciesParams = {
    schema: FormStructure;
    data: Record<string, unknown>;
    /** Limit evaluation to deps triggered by this field (undefined = all) */
    changedFieldId?: string;
    /** Existing states to start from (updated in place, returned as new object) */
    currentStates?: Record<string, Partial<FieldState>>;
};
type EvaluateDependenciesResult = {
    /** FieldState overrides: hidden / disabled / readonly / required */
    stateOverrides: Record<string, Partial<FieldState>>;
    /** Computed value overrides: fieldId → new value */
    dataOverrides: Record<string, unknown>;
};
/**
 * Full dependency evaluation with JSON Logic, wildcards, and cascading.
 * Returns both FieldState overrides and computed data (value) overrides.
 */
declare function evaluateDependencies(params: EvaluateDependenciesParams): EvaluateDependenciesResult;

type ValidateFormParams = {
    schema: FormStructure;
    data: Record<string, unknown>;
    fieldStates: Record<string, FieldState>;
};
declare function validateForm(params: ValidateFormParams): ValidationErrors;

type NormalizeParams = {
    schema: FormStructure;
    data: Record<string, unknown>;
    submittedAt?: string;
};
declare function normalizeSubmissionData(params: NormalizeParams): Record<string, unknown>;

type BuildPayloadParams = {
    schema: FormStructure;
    data: Record<string, unknown>;
    submissionId?: string;
    formVersionUuid?: string;
    isFinal: boolean;
    metadata?: Record<string, unknown>;
};
declare function buildSubmissionPayload(params: BuildPayloadParams): FormSubmissionPayload;

/**
 * Minimal JSON Logic evaluator.
 * Covers all operators used by the FF backend dependency engine.
 * Safe: never throws — bad rules return null.
 */
type Rule = unknown;
type Data = Record<string, unknown>;
declare function applyJsonLogic(rule: Rule, data: Data): unknown;
/** Truthy check matching JSON Logic spec */
declare function isTruthy(value: unknown): boolean;

declare function createDefaultAdapter(config?: ApiAdapterConfig): ResolvedApiAdapter;
declare const defaultApiAdapter: ResolvedApiAdapter;
declare function resolveAdapter(partial?: ApiAdapter): ResolvedApiAdapter;
declare function resolveEffectiveApiKey(apiKey?: string, getApiKey?: () => string | null | Promise<string | null>): Promise<string | null>;

export { type ApiAdapter, type ApiAdapterConfig, type DependencyAction, type DependencyCondition, type DependencyValueResolver, FFForm, type FFFormContextValue, type FFFormProps, type FieldRendererProps, type FieldRenderers, type FieldState, type FormDependency, type FormElementSettings, type FormField, type FormFieldAction, type FormFieldOption, type FormFieldSettings, type FormFieldSource, type FormFieldSourceFilter, type FormPage, type FormSection, type FormStructure, type FormSubmission, type FormSubmissionPayload, type LookupList, type LookupListItem, type NormalizedSubformEntry, type ResolvedApiAdapter, type ValidationErrors, applyDefaultValues, applyJsonLogic, buildSubmissionPayload, createDefaultAdapter, createFormEngine, defaultApiAdapter, evaluateDependencies, isTruthy, normalizeSubmissionData, resolveAdapter, resolveEffectiveApiKey, useFFForm, validateForm };
