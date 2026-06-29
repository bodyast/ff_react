import { useEffect, useRef, useState } from "react";
import type { FieldRendererProps, MediaFetchResult } from "../../types/props";

type MediaEntry = {
  uuid: string;
  name?: string;
  url?: string;
  placeholderUrl?: string;
  mimeType?: string;
  contentType?: string;
  type?: string;
};

type ResolvedMedia = {
  url?: string;
  name?: string;
  mimeType?: string;
};

/**
 * `media` / `image` / `file` field.
 * Supports multiple files, format filtering, and preview thumbnails for images.
 */
export function MediaField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  uploadMedia,
  deleteMedia,
  fetchMedia,
}: FieldRendererProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const requestedFetchesRef = useRef<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const [fetchingMedia, setFetchingMedia] = useState<Record<string, boolean>>({});
  const [resolvedMedia, setResolvedMedia] = useState<Record<string, ResolvedMedia>>({});
  const [viewerEntry, setViewerEntry] = useState<MediaEntry | null>(null);
  const settings = field.settings ?? {};

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  useEffect(() => {
    if (!viewerEntry) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerEntry(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [viewerEntry]);

  const isImage = field.type === "image";
  const maxFiles = (settings.maxFiles ?? settings.max_files) as number | undefined;
  const allowMany = Boolean(
    settings.allowMany ?? settings.allow_many ??
    settings.isMultiple ?? settings.is_multiple ??
    (maxFiles !== undefined && maxFiles > 1)
  );
  const allowedFormats = (settings.allowedFormats ?? settings.allowed_formats) as string[] | undefined;

  const entries: MediaEntry[] = normalizeEntries(value);

  useEffect(() => {
    if (!fetchMedia) return;

    let cancelled = false;

    entries.forEach((entry) => {
      if (!entry.uuid || entry.url || requestedFetchesRef.current.has(entry.uuid)) return;

      requestedFetchesRef.current.add(entry.uuid);
      setFetchingMedia((prev) => ({ ...prev, [entry.uuid]: true }));
      setFetchErrors((prev) => {
        const next = { ...prev };
        delete next[entry.uuid];
        return next;
      });

      Promise.resolve(fetchMedia(entry.uuid))
        .then((result) => {
          if (cancelled) return;
          setResolvedMedia((prev) => ({
            ...prev,
            [entry.uuid]: normalizeFetchResult(result, entry),
          }));
        })
        .catch((err) => {
          if (cancelled) return;
          setFetchErrors((prev) => ({
            ...prev,
            [entry.uuid]: err instanceof Error ? err.message : "Failed to fetch media",
          }));
          setResolvedMedia((prev) => ({ ...prev, [entry.uuid]: {} }));
        })
        .finally(() => {
          if (cancelled) return;
          setFetchingMedia((prev) => ({ ...prev, [entry.uuid]: false }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [entries, fetchMedia]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !uploadMedia) return;

    setUploadErrors([]);
    const newEntries: MediaEntry[] = [...entries];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (maxFiles !== undefined && newEntries.length >= maxFiles) break;
      try {
        const result = await uploadMedia(file);
        // result may have uuid (backend ID) or url (direct link) — use whichever is present
        const mediaId = result.uuid ?? result.url ?? "";
        const objectUrl = result.url ?? URL.createObjectURL(file);
        if (!result.url) objectUrlsRef.current.push(objectUrl); // only track blob URLs for cleanup
        newEntries.push({ uuid: mediaId, name: file.name, url: objectUrl, mimeType: file.type });
      } catch (err) {
        errors.push(`Failed to upload "${file.name}": ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
    if (errors.length > 0) setUploadErrors(errors);
    onChange(allowMany ? newEntries : newEntries[0]);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove(uuid: string) {
    if (deleteMedia) {
      try {
        await deleteMedia(uuid);
      } catch {
        // swallow — still remove locally
      }
    }
    const next = entries.filter((e) => e.uuid !== uuid);
    onChange(allowMany ? next : next[0] ?? null);
  }

  const canAdd =
    !readonly &&
    !disabled &&
    (maxFiles === undefined || entries.length < maxFiles);

  const accept = allowedFormats
    ? allowedFormats.map((f) => `.${f}`).join(",")
    : isImage
    ? "image/*"
    : undefined;

  function normalizeEntries(input: unknown): MediaEntry[] {
    const rawEntries = Array.isArray(input) ? input : input ? [input] : [];
    return rawEntries
      .map((item): MediaEntry | null => {
        if (typeof item === "string") return item ? { uuid: item } : null;
        if (!item || typeof item !== "object") return null;

        const raw = item as Record<string, unknown>;
        const uuid = firstString(
          raw.uuid,
          raw.fileUuid,
          raw.file_uuid,
          raw.mediaUuid,
          raw.media_uuid,
          raw.id,
          raw.url
        );

        if (!uuid) return null;

        return {
          uuid,
          name: firstString(raw.name, raw.fileName, raw.file_name, raw.originalName, raw.original_name),
          url: firstString(raw.url, raw.src, raw.href),
          placeholderUrl: firstString(raw.placeholderUrl, raw.placeholder_url, raw.thumbnailUrl, raw.thumbnail_url),
          mimeType: firstString(raw.mimeType, raw.mime_type),
          contentType: firstString(raw.contentType, raw.content_type),
          type: firstString(raw.type),
        };
      })
      .filter((entry): entry is MediaEntry => entry !== null);
  }

  function firstString(...values: unknown[]) {
    for (const item of values) {
      if (typeof item === "string" && item.length > 0) return item;
    }
    return undefined;
  }

  function normalizeFetchResult(result: MediaFetchResult, entry: MediaEntry): ResolvedMedia {
    if (!result) return {};

    if (typeof result === "string") return { url: result };

    if (result instanceof Blob) {
      const objectUrl = URL.createObjectURL(result);
      objectUrlsRef.current.push(objectUrl);
      return {
        url: objectUrl,
        name: result instanceof File ? result.name : entry.name,
        mimeType: result.type || getEntryMimeType(entry),
      };
    }

    const blob = result.blob ?? result.file;
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(objectUrl);
      return {
        url: result.url ?? objectUrl,
        name: result.name ?? (blob instanceof File ? blob.name : entry.name),
        mimeType: result.mimeType ?? result.contentType ?? result.type ?? blob.type ?? getEntryMimeType(entry),
      };
    }

    return {
      url: result.url,
      name: result.name,
      mimeType: result.mimeType ?? result.contentType ?? result.type,
    };
  }

  function getEntryMimeType(entry: MediaEntry) {
    return entry.mimeType ?? entry.contentType ?? (entry.type?.includes("/") ? entry.type : undefined);
  }

  function getDisplayMedia(entry: MediaEntry) {
    const resolved = resolvedMedia[entry.uuid];
    const url = entry.url ?? resolved?.url;
    const thumbUrl = entry.placeholderUrl ?? url;
    const name = entry.name ?? resolved?.name ?? entry.uuid;
    const mimeType = resolved?.mimeType ?? getEntryMimeType(entry);

    return {
      url,
      thumbUrl,
      name,
      mimeType,
      isImage: isImage || isImageMedia(name, thumbUrl, mimeType),
      isPdf: isPdfMedia(name, url, mimeType),
      isVideo: Boolean(mimeType?.startsWith("video/")),
      isAudio: Boolean(mimeType?.startsWith("audio/")),
    };
  }

  function getExtension(value?: string) {
    if (!value) return "";
    const clean = value.split("?")[0].split("#")[0];
    const index = clean.lastIndexOf(".");
    return index >= 0 ? clean.slice(index + 1).toLowerCase() : "";
  }

  function isImageMedia(name?: string, url?: string, mimeType?: string) {
    if (mimeType?.startsWith("image/")) return true;
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"].includes(
      getExtension(url) || getExtension(name)
    );
  }

  function isPdfMedia(name?: string, url?: string, mimeType?: string) {
    return mimeType === "application/pdf" || getExtension(url) === "pdf" || getExtension(name) === "pdf";
  }

  function renderMediaPreview(entry: MediaEntry) {
    const media = getDisplayMedia(entry);

    if (media.isImage && media.thumbUrl) {
      return (
        <img
          src={media.thumbUrl}
          alt={media.name}
          className="ff-form__media-preview"
        />
      );
    }

    const label = media.isPdf ? "PDF" : media.isVideo ? "VID" : media.isAudio ? "AUD" : "FILE";

    return (
      <span className="ff-form__media-file-icon" aria-hidden="true">
        {label}
      </span>
    );
  }

  return (
    <div className="ff-form__media-field">
      {canAdd && (
        <>
          <input
            ref={inputRef}
            type="file"
            id={field.id}
            className="ff-form__file-input"
            accept={accept}
            multiple={allowMany}
            required={required && entries.length === 0}
            aria-required={required}
            style={{ display: "none" }}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="ff-form__btn ff-form__btn--upload"
            onClick={() => inputRef.current?.click()}
          >
            {isImage ? "Upload image" : "Upload file"}
          </button>
        </>
      )}

      {entries.length > 0 && (
        <ul className="ff-form__media-list">
          {entries.map((entry) => {
            const media = getDisplayMedia(entry);
            return (
              <li key={entry.uuid} className="ff-form__media-item">
                <button
                  type="button"
                  className="ff-form__media-open"
                  onClick={() => setViewerEntry(entry)}
                  aria-label={`Open ${media.name}`}
                >
                  {renderMediaPreview(entry)}
                  <span className="ff-form__media-meta">
                    <span className="ff-form__media-name">
                      {media.name}
                    </span>
                    {fetchingMedia[entry.uuid] && (
                      <span className="ff-form__media-status">Loading media...</span>
                    )}
                    {fetchErrors[entry.uuid] && (
                      <span className="ff-form__media-status ff-form__media-status--error">
                        {fetchErrors[entry.uuid]}
                      </span>
                    )}
                  </span>
                </button>
                {!readonly && !disabled && (
                  <button
                    type="button"
                    className="ff-form__btn ff-form__btn--remove"
                    onClick={() => void handleRemove(entry.uuid)}
                    aria-label={`Remove ${entry.name ?? entry.uuid}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewerEntry && (
        <div
          className="ff-form__media-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={getDisplayMedia(viewerEntry).name}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setViewerEntry(null);
          }}
        >
          <div className="ff-form__media-viewer-panel">
            <div className="ff-form__media-viewer-header">
              <span className="ff-form__media-viewer-title">
                {getDisplayMedia(viewerEntry).name}
              </span>
              <button
                type="button"
                className="ff-form__btn ff-form__btn--media-close"
                onClick={() => setViewerEntry(null)}
              >
                Close
              </button>
            </div>
            <div className="ff-form__media-viewer-body">
              {(() => {
                const media = getDisplayMedia(viewerEntry);
                if (fetchingMedia[viewerEntry.uuid] && !media.url) {
                  return <span className="ff-form__media-viewer-empty">Loading media...</span>;
                }
                if (media.isImage && media.url) {
                  return <img src={media.url} alt={media.name} className="ff-form__media-viewer-image" />;
                }
                if (media.isPdf && media.url) {
                  return <iframe src={media.url} title={media.name} className="ff-form__media-viewer-frame" />;
                }
                if (media.isVideo && media.url) {
                  return <video src={media.url} className="ff-form__media-viewer-video" controls />;
                }
                if (media.isAudio && media.url) {
                  return <audio src={media.url} className="ff-form__media-viewer-audio" controls />;
                }
                return (
                  <div className="ff-form__media-viewer-empty">
                    <span>{fetchErrors[viewerEntry.uuid] ?? "Preview is not available for this file."}</span>
                    {media.url && (
                      <a
                        className="ff-form__media-viewer-link"
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open file
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && (readonly || disabled) && (
        <span className="ff-form__media-empty">No files</span>
      )}

      {uploadErrors.map((msg, i) => (
        <span key={i} className="ff-form__error" role="alert">{msg}</span>
      ))}
    </div>
  );
}
