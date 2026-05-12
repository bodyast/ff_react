import { useState } from "react";
import type { FieldRendererProps } from "../../types/props";

/**
 * `location` field — lat,lng coordinates.
 * Shows a text input for manual entry and a "Use my location" button.
 * The Flutter app stores value as "lat,lng" CSV string.
 */
export function LocationField({
  field,
  value,
  disabled,
  readonly,
  required,
  onChange,
}: FieldRendererProps) {
  const [fetching, setFetching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const strValue = typeof value === "string" ? value : value ? String(value) : "";

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setFetching(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChange(`${latitude},${longitude}`);
        setFetching(false);
      },
      (err) => {
        setGeoError(err.message);
        setFetching(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const [lat, lng] = strValue.split(",").map((s) => s.trim());
  const hasCoords = lat && lng;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  return (
    <div className="ff-form__location">
      <div className="ff-form__location-row">
        <input
          id={field.id}
          type="text"
          className="ff-form__input"
          value={strValue}
          placeholder={field.placeholder ?? "lat,lng (e.g. 48.8566,2.3522)"}
          disabled={disabled}
          readOnly={readonly}
          required={required}
          aria-required={required}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {!readonly && !disabled && (
          <button
            type="button"
            className="ff-form__btn ff-form__btn--location"
            disabled={fetching}
            onClick={handleGetLocation}
            title="Use my location"
          >
            {fetching ? "…" : "📍"}
          </button>
        )}
      </div>

      {geoError && (
        <span className="ff-form__error">{geoError}</span>
      )}

      {hasCoords && mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ff-form__location-link"
        >
          View on map ↗
        </a>
      )}
    </div>
  );
}
