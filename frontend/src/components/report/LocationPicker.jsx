import { useState, useCallback, useRef, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';

/* ─────────────────────────────────────────────
 * Mini-map via OpenStreetMap iframe
 * Zero external dependencies — OSM tiles are free & public.
 * ───────────────────────────────────────────── */

/**
 * Builds the OSM embed URL for a given center.
 * The user sees a marker and can use the "larger map" link in the iframe.
 *
 * Because OSM embed doesn't support click → coords natively, we overlay a
 * transparent <div> that intercepts pointer events and converts them to
 * [lat, lng] via a simple bounding-box calculation from the displayed extent.
 *
 * @param {{ lat: number, lng: number }} center
 * @param {number} zoom
 */
function buildOsmUrl(center, zoom = 16) {
  const { lat, lng } = center;
  const delta = 0.003; // ~330 m at zoom 16
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  );
}

/** Campus center — fallback starting point for the manual map */
const CAMPUS_CENTER = { lat: 50.0682, lng: 19.9067 }; // AGH Campus, Kraków

/* ─────────────────────────────────────────────
 * ManualMap sub-component
 * ───────────────────────────────────────────── */

/**
 * Renders an interactive OSM iframe with a draggable crosshair overlay.
 * Clicking the overlay calculates the approximate lat/lng under the cursor
 * based on the rendered iframe bounding box and current viewport extent.
 *
 * This approach requires zero map libraries and works in all browsers.
 *
 * @param {{
 *   initialCenter?: { lat: number, lng: number },
 *   onConfirm: (coords: { lat: number, lng: number }) => void,
 *   onClose: () => void,
 * }}
 */
function ManualMap({ initialCenter = CAMPUS_CENTER, onConfirm, onClose }) {
  const [center, setCenter] = useState(initialCenter);
  const [picked, setPicked] = useState(null); // { lat, lng }
  const overlayRef = useRef(null);

  // The OSM iframe is re-rendered whenever `center` changes (after confirm-move).
  const [iframeKey, setIframeKey] = useState(0);

  // Displayed viewport extent — matches OSM embed at ~zoom 16
  const DELTA = 0.003;

  const handleOverlayClick = useCallback(
    (e) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;

      // OSM bbox: [lng_min, lat_min, lng_max, lat_max]
      const lat = center.lat + DELTA - yRatio * 2 * DELTA;
      const lng = center.lng - DELTA + xRatio * 2 * DELTA;

      setPicked({ lat, lng });
    },
    [center],
  );

  const handleConfirm = useCallback(() => {
    if (!picked) return;
    onConfirm(picked);
  }, [picked, onConfirm]);

  // When the user confirms, re-center the iframe on the picked point
  const handleMoveCenter = useCallback(() => {
    if (!picked) return;
    setCenter(picked);
    setIframeKey((k) => k + 1);
  }, [picked]);

  return (
    <div className="rounded-xl border-2 border-primary/40 overflow-hidden bg-surface-container-low">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-container border-b border-outline">
        <span className="text-sm font-semibold text-on-background flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary">
            pin_drop
          </span>
          Wskaż lokalizację ręcznie
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
          aria-label="Zamknij mapę"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Map + overlay */}
      <div className="relative h-64 sm:h-72 bg-surface-container">
        {/* OSM iframe */}
        <iframe
          key={iframeKey}
          title="Mapa lokalizacji"
          src={buildOsmUrl(center)}
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Transparent click-capture overlay */}
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="absolute inset-0 cursor-crosshair"
          aria-label="Kliknij aby wybrać lokalizację"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleOverlayClick(e);
          }}
        />

        {/* Crosshair at picked point */}
        {picked && (
          <CrosshairMarker
            lat={picked.lat}
            lng={picked.lng}
            center={center}
            delta={DELTA}
          />
        )}

        {/* Corner hint */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap">
          Kliknij mapę, aby wybrać punkt
        </div>
      </div>

      {/* Picked coords + actions */}
      <div className="px-3 py-2.5 border-t border-outline flex items-center gap-2 flex-wrap">
        {picked ? (
          <span className="text-xs text-on-surface-variant font-mono flex-1 min-w-0 truncate">
            {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
          </span>
        ) : (
          <span className="text-xs text-on-surface-variant flex-1">
            Brak wybranego punktu
          </span>
        )}

        <button
          type="button"
          onClick={handleMoveCenter}
          disabled={!picked}
          className="text-xs text-primary font-medium px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-default"
        >
          Wyśrodkuj
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!picked}
          className="text-xs bg-primary text-on-primary font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-default flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">check</span>
          Zatwierdź
        </button>
      </div>
    </div>
  );
}

/**
 * Renders an absolute-positioned crosshair pin at the picked lat/lng.
 * Position is derived from the same bbox math used in handleOverlayClick.
 */
function CrosshairMarker({ lat, lng, center, delta }) {
  const xRatio = (lng - (center.lng - delta)) / (2 * delta);
  const yRatio = (center.lat + delta - lat) / (2 * delta);

  // Clamp to [2%, 98%] so the pin stays inside the map area
  const left = `${Math.min(98, Math.max(2, xRatio * 100)).toFixed(2)}%`;
  const top = `${Math.min(98, Math.max(2, yRatio * 100)).toFixed(2)}%`;

  return (
    <div
      className="absolute pointer-events-none -translate-x-1/2 -translate-y-full"
      style={{ left, top }}
    >
      <span
        className="material-symbols-outlined text-3xl text-primary drop-shadow-lg"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        location_on
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * LocationPicker component
 * ───────────────────────────────────────────── */

/**
 * LocationPicker — GPS button + manual map fallback.
 *
 * All geolocation API logic is in the `useGeolocation` hook.
 * This component is pure UI.
 *
 * @param {{
 *   value: { lat: number, lng: number } | null,
 *   onChange: (loc: { lat: number, lng: number } | null) => void,
 *   error?: string,
 * }}
 */
export default function LocationPicker({ value, onChange, error }) {
  const { coords, status, error: geoError, canUseManual, getPosition, clearPosition } =
    useGeolocation({ timeout: 10_000 });

  const [showManualMap, setShowManualMap] = useState(false);

  // Propagate coords up when GPS succeeds
  useEffect(() => {
    if (coords) {
      onChange({ lat: coords.lat, lng: coords.lng });
    }
  }, [coords, onChange]);

  const handleClear = useCallback(() => {
    clearPosition();
    onChange(null);
    setShowManualMap(false);
  }, [clearPosition, onChange]);

  const handleManualConfirm = useCallback(
    (loc) => {
      onChange(loc);
      setShowManualMap(false);
    },
    [onChange],
  );

  // The form-level validation error should only show when we have no value
  const displayError = !value && error ? error : '';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-on-background mb-1">
        Lokalizacja GPS <span className="text-error">*</span>
      </label>

      {/* ── SUCCESS — coords received (GPS or manual) ── */}
      {value && status !== 'loading' ? (
        <div className="rounded-xl border-2 border-secondary/30 bg-secondary-container/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-xl text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-background">
                {status === 'success' ? 'Lokalizacja GPS pobrana' : 'Lokalizacja wskazana ręcznie'}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </p>
              {coords?.accuracy != null && status === 'success' && (
                <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">radar</span>
                  Dokładność: ±{Math.round(coords.accuracy)} m
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors cursor-pointer shrink-0"
              aria-label="Usuń lokalizację"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── IDLE / LOADING / ERROR state ── */
        <>
          <button
            type="button"
            onClick={getPosition}
            disabled={status === 'loading'}
            className={`w-full rounded-xl border-2 border-dashed p-5 flex items-center gap-4 transition-all cursor-pointer
              ${status === 'loading'
                ? 'border-primary/40 bg-primary/5'
                : geoError || displayError
                  ? 'border-error bg-error-container/30 hover:bg-error-container/50'
                  : 'border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/40'
              }
              disabled:cursor-wait`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
                ${status === 'loading'
                  ? 'bg-primary/10 animate-pulse'
                  : geoError || displayError
                    ? 'bg-error/10'
                    : 'bg-primary/10'}`}
            >
              <span
                className={`material-symbols-outlined text-2xl
                  ${status === 'loading'
                    ? 'text-primary animate-spin'
                    : geoError || displayError
                      ? 'text-error'
                      : 'text-primary'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {status === 'loading' ? 'progress_activity' : 'my_location'}
              </span>
            </div>
            <div className="text-left">
              <p
                className={`text-sm font-semibold ${geoError || displayError ? 'text-error' : 'text-on-background'}`}
              >
                {status === 'loading' ? 'Pobieram lokalizację…' : 'Pobierz lokalizację GPS'}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {status === 'loading'
                  ? 'Proszę czekać, trwa ustalanie pozycji'
                  : 'Kliknij, aby udostępnić swoją lokalizację'}
              </p>
            </div>
          </button>

          {/* Error message */}
          {(geoError || displayError) && (
            <p className="text-xs text-error flex items-start gap-1 mt-1">
              <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
              <span>{geoError || displayError}</span>
            </p>
          )}

          {/* Manual map fallback — shown when GPS fails or is unavailable */}
          {canUseManual && !showManualMap && (
            <button
              type="button"
              onClick={() => setShowManualMap(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:text-on-background hover:border-primary/40 hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">map</span>
              Wskaż lokalizację ręcznie na mapie
            </button>
          )}
        </>
      )}

      {/* ── Manual map panel ── */}
      {showManualMap && !value && (
        <ManualMap
          initialCenter={CAMPUS_CENTER}
          onConfirm={handleManualConfirm}
          onClose={() => setShowManualMap(false)}
        />
      )}
    </div>
  );
}
