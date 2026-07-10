import { useRef, useState, useEffect } from "react";
import type { FieldRendererProps } from "../../types/props";

export function SignatureField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
  uploadMedia,
}: FieldRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(
    typeof value === "string" ? value : (value as any)?.url || null
  );

  useEffect(() => {
    if (typeof value === "string") setSignatureUrl(value);
    else if (value && typeof value === "object" && "url" in value) {
      setSignatureUrl((value as any).url);
    } else {
      setSignatureUrl(null);
    }
    setIsEmpty(!value);
  }, [value]);

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
      ctx?.beginPath(); // reset path
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

    // If we're in the drawing state, clear the canvas
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
      const file = new File([blob], "signature.png", { type: "image/png" });
      try {
        const result = await uploadMedia(file);
        // Ensure we take the URL from the response if provided,
        // otherwise try to use the result itself if it's a string
        const newUrl = result.url || (typeof result === 'string' ? result : null);
        if (newUrl) setSignatureUrl(newUrl);

        onChange(result.uuid || result.url || result);
      } catch (err) {
        console.error("Failed to upload signature", err);
      }
    }, "image/png");
  }

  if (signatureUrl && (disabled || readonly || !isDrawing)) {
    return (
      <div className="ff-form__signature-preview">
        <img src={signatureUrl} alt="Signature" />
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
