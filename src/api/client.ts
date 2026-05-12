import type { ApiAdapter, ApiAdapterConfig, ResolvedApiAdapter } from "../types/api";
import type { FormStructure, FormSubmission, LookupList, FormSubmissionPayload } from "../types/form";

const ENDPOINTS = {
  formStructure: (id: string) => `client/forms/${id}`,
  submission:    (id: string) => `client/submissions/${id}`,
  submissions:   ()           => `client/submissions`,
  media:         (sid: string) => `client/submissions/${sid}/media`,
  mediaItem:     (sid: string, mid: string) => `client/submissions/${sid}/media/${mid}`,
  lookup:        (id: string) => `client/lookup-lists/${id}`,
} as const;

function buildUrl(base: string | undefined, proxy: string | undefined, path: string): string {
  return `${(proxy ?? base ?? "").replace(/\/$/, "")}/${path}`;
}

function authHeaders(key: string | null | undefined): Record<string, string> {
  const base: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };
  if (!key) return base;
  return { ...base, Authorization: `Bearer ${key}` };
}

export function createDefaultAdapter(config: ApiAdapterConfig = {}): ResolvedApiAdapter {
  const doFetch = config.fetchFn ?? globalThis.fetch.bind(globalThis);
  const extraInit: RequestInit = config.requestInit ?? {};
  const proxy = config.proxyPath;

  async function req<T>(url: string, opts: RequestInit): Promise<T> {
    const init: RequestInit = { ...extraInit, ...opts, headers: { ...(extraInit.headers as Record<string, string> | undefined), ...(opts.headers as Record<string, string> | undefined) } };
    const res = await doFetch(url, init);
    if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`HTTP ${res.status} ${res.statusText}: ${t}`); }
    return res.json() as Promise<T>;
  }

  function u(base: string | undefined, path: string): string { return buildUrl(base, proxy, path); }

  function unwrap<T>(raw: { data?: T } | T): T {
    return (raw && typeof raw === "object" && "data" in raw && (raw as { data?: T }).data !== undefined ? (raw as { data: T }).data : raw) as T;
  }

  return {
    async fetchFormStructure({ apiBaseUrl, apiKey, formId }) {
      return unwrap(await req<{ data?: FormStructure } | FormStructure>(u(apiBaseUrl, ENDPOINTS.formStructure(formId)), { method: "GET", headers: authHeaders(apiKey) }));
    },
    async fetchSubmission({ apiBaseUrl, apiKey, submissionId }) {
      return unwrap(await req<{ data?: FormSubmission } | FormSubmission>(u(apiBaseUrl, ENDPOINTS.submission(submissionId)), { method: "GET", headers: authHeaders(apiKey) }));
    },
    async createSubmission({ apiBaseUrl, apiKey, payload }) {
      return unwrap(await req<{ data?: FormSubmission } | FormSubmission>(u(apiBaseUrl, ENDPOINTS.submissions()), { method: "POST", headers: authHeaders(apiKey), body: JSON.stringify(payload) }));
    },
    async updateSubmission({ apiBaseUrl, apiKey, submissionId, payload }) {
      return unwrap(await req<{ data?: FormSubmission } | FormSubmission>(u(apiBaseUrl, ENDPOINTS.submission(submissionId)), { method: "PUT", headers: authHeaders(apiKey), body: JSON.stringify(payload) }));
    },
    async submitForm({ apiBaseUrl, apiKey, payload, isFinal }) {
      const hasUuid = Boolean(payload.uuid);
      return req<unknown>(hasUuid ? u(apiBaseUrl, ENDPOINTS.submission(payload.uuid!)) : u(apiBaseUrl, ENDPOINTS.submissions()), { method: hasUuid ? "PUT" : "POST", headers: authHeaders(apiKey), body: JSON.stringify({ ...payload, isFinal }) });
    },
    async uploadMedia({ apiBaseUrl, apiKey, submissionId, fieldId, file }) {
      const form = new FormData(); form.append("file", file); form.append("fieldId", fieldId);
      const headers: Record<string, string> = { "Accept": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
      const path = submissionId ? ENDPOINTS.media(submissionId) : ENDPOINTS.submissions();
      const res = await doFetch(u(apiBaseUrl, path), { ...extraInit, method: "POST", headers: { ...(extraInit.headers as Record<string, string> | undefined), ...headers }, body: form });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`Upload failed HTTP ${res.status}: ${t}`); }
      const json = await res.json() as { data?: { uuid: string }; uuid?: string };
      const uuid = json.data?.uuid ?? json.uuid;
      if (!uuid) throw new Error("Upload response missing uuid");
      return { uuid };
    },
    async deleteMedia({ apiBaseUrl, apiKey, submissionId, mediaUuid }) {
      if (!submissionId) throw new Error("submissionId required");
      await doFetch(u(apiBaseUrl, ENDPOINTS.mediaItem(submissionId, mediaUuid)), { ...extraInit, method: "DELETE", headers: { ...(extraInit.headers as Record<string, string> | undefined), ...authHeaders(apiKey) } });
    },
    async fetchLookupList({ apiBaseUrl, apiKey, listId }) {
      return unwrap(await req<{ data?: LookupList } | LookupList>(u(apiBaseUrl, ENDPOINTS.lookup(listId)), { method: "GET", headers: authHeaders(apiKey) }));
    },
  };
}

export const defaultApiAdapter: ResolvedApiAdapter = createDefaultAdapter();

export function resolveAdapter(partial?: ApiAdapter): ResolvedApiAdapter {
  const base = (partial?.fetchFn || partial?.requestInit || partial?.proxyPath)
    ? createDefaultAdapter({ fetchFn: partial.fetchFn, requestInit: partial.requestInit, proxyPath: partial.proxyPath })
    : defaultApiAdapter;
  if (!partial) return base;
  return {
    fetchFormStructure: partial.fetchFormStructure ?? base.fetchFormStructure,
    fetchSubmission: partial.fetchSubmission ?? base.fetchSubmission,
    createSubmission: partial.createSubmission ?? base.createSubmission,
    updateSubmission: partial.updateSubmission ?? base.updateSubmission,
    submitForm: partial.submitForm ?? base.submitForm,
    uploadMedia: partial.uploadMedia ?? base.uploadMedia,
    deleteMedia: partial.deleteMedia ?? base.deleteMedia,
    fetchLookupList: partial.fetchLookupList ?? base.fetchLookupList,
  };
}

export async function resolveEffectiveApiKey(apiKey?: string, getApiKey?: () => string | null | Promise<string | null>): Promise<string | null> {
  if (getApiKey) { const r = await getApiKey(); return r ?? null; }
  return apiKey ?? null;
}

export { FormSubmissionPayload };
