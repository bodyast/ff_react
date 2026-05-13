import { useEffect, useRef, useState } from "react";
import type { FieldRendererProps } from "../../types/props";

type MediaEntry = {
  uuid: string;
  name?: string;
  url?: string;
  placeholderUrl?: string;
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
}: FieldRendererProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const settings = field.settings ?? {};

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => { objectUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  const isImage = field.type === "image";
  const maxFiles = (settings.maxFiles ?? settings.max_files) as number | undefined;
  const allowMany = Boolean(
    settings.allowMany ?? settings.allow_many ??
    settings.isMultiple ?? settings.is_multiple ??
    (maxFiles !== undefined && maxFiles > 1)
  );
  const allowedFormats = (settings.allowedFormats ?? settings.allowed_formats) as string[] | undefined;

  const entries: MediaEntry[] = Array.isArray(value)
    ? (value as MediaEntry[])
    : value && typeof value === "object"
    ? [value as MediaEntry]
    : typeof value === "string" && value
    ? [{ uuid: value }]
    : [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !uploadMedia) return;

    setUploadErrors([]);
    const newEntries: MediaEntry[] = [...entries];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (maxFiles !== undefined && newEntries.length >= maxFiles) break;
      try {
        const result = await uploadMedia(file);
        const objectUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(objectUrl);
        newEntries.push({ uuid: result.uuid, name: file.name, url: objectUrl });
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
            const thumb = entry.url ?? entry.placeholderUrl;
            return (
              <li key={entry.uuid} className="ff-form__media-item">
                {isImage && thumb ? (
                  <img
                    src={thumb}
                    alt={entry.name ?? entry.uuid}
                    className="ff-form__media-preview"
                  />
                ) : (
                  <span className="ff-form__media-name">
                    {entry.name ?? entry.uuid}
                  </span>
                )}
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

      {entries.length === 0 && (readonly || disabled) && (
        <span className="ff-form__media-empty">No files</span>
      )}

      {uploadErrors.map((msg, i) => (
        <span key={i} className="ff-form__error" role="alert">{msg}</span>
      ))}
    </div>
  );
}
