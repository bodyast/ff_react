import { useRef, useState, useEffect } from "react";
import type { FieldRendererProps, MediaFetchResult } from "../../types/props";

export function SignatureField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  uploadMedia,
  fetchMedia,
}: FieldRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      if (!value) {
        setSignatureUrl(null);
        setIsEmpty(true);
        return;
      }

      setIsEmpty(false);

      // 1. If it's an object, check for url first, then uuid
      if (typeof value === "object" && value !== null) {
        const valObj = value as any;
        if (valObj.url) {
          setSignatureUrl(valObj.url);
          setIsFetching(false);
          return;
        }

        // If it's an object with only uuid, we'll fall through to fetchMedia
      }

      // 2. If it's a string that looks like a URL, use it
      const valStr = typeof value === "string"
        ? value
        : (value as any)?.uuid || (value as any)?.id || String(value);

      if (valStr.startsWith("http") || valStr.startsWith("blob:") || valStr.startsWith("data:")) {
        setSignatureUrl(valStr);
        setIsFetching(false);
        return;
      }

      // 3. Otherwise treat as UUID and fetch
      if (fetchMedia) {
        setIsFetching(true);
        try {
          const result = await Promise.resolve(fetchMedia(valStr));
          if (cancelled) return;

          const resolved = normalizeFetchResult(result);
          if (resolved) setSignatureUrl(resolved);
        } catch (err) {
          console.error("Failed to fetch signature media", err);
        } finally {
          if (!cancelled) setIsFetching(false);
        }
      }
    }

    resolveUrl();
    return () => { cancelled = true; };
  }, [value, fetchMedia]);

  function normalizeFetchResult(result: MediaFetchResult): string | null {
    if (!result) return null;
    if (typeof result === "string") return result;
    if (result instanceof Blob) {
      const url = URL.createObjectURL(result);
      objectUrlRef.current = url;
      return url;
    }
    const blob = result.blob ?? result.file;
    if (blob) {
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      return result.url ?? url;
    }
    return result.url ?? null;
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    if (disabled || readonly) return;
    setIsDrawing(true);
    draw(e);
  }

  function stopDrawing() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
    }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !canvasRef.current || disabled || readonly) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsEmpty(false);
  }

  function clear() {
    setIsEmpty(true);
    setSignatureUrl(null);
    onChange(undefined);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty || !uploadMedia) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Local preview immediately
      const localUrl = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = localUrl;
      setSignatureUrl(localUrl);

      const file = new File([blob], "signature.png", { type: "image/png" });
      try {
        const result = await uploadMedia(file);
        // Sync with form state - backend might return just UUID or full object
        // We pass the full result so that URL (if present) is kept
        onChange(result);
      } catch (err) {
        console.error("Failed to upload signature", err);
      }
    }, "image/png");
  }

  if (signatureUrl && !isDrawing) {
    return (
      <div className="ff-form__signature-preview">
        {isFetching ? (
          <div className="ff-form__signature-loading">Loading signature...</div>
        ) : (
          <img src={signatureUrl} alt="Signature" />
        )}
        {!disabled && !readonly && (
          <div className="ff-form__signature-actions" style={{ marginTop: 8 }}>
            <button type="button" className="ff-form__btn ff-form__btn--draft" onClick={clear}>
              Clear & Re-sign
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ff-form__signature-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="ff-form__signature-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="ff-form__signature-actions">
        <button type="button" className="ff-form__btn ff-form__btn--draft" onClick={clear} disabled={disabled || readonly}>
          Clear
        </button>
        <button type="button" className="ff-form__btn ff-form__btn--submit" onClick={save} disabled={disabled || readonly || isEmpty}>
          Save Signature
        </button>
      </div>
    </div>
  );
}
