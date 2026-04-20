import { useState, useCallback, useRef, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';

/* ─────────────────────────────────────────────
 * Mini-map via OpenStreetMap iframe
 * Zero external dependencies — OSM tiles are free & public.
 * ───────────────────────────────────────────── */

// Mercator projection math to precisely align custom UI with the iframe tiles.
function lon2x(lon, zoom) {
  return ((lon + 180) / 360) * 256 * Math.pow(2, zoom);
}

function lat2y(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    256 *
    Math.pow(2, zoom)
  );
}

function x2lon(x, zoom) {
  return (x / (256 * Math.pow(2, zoom))) * 360 - 180;
}

function y2lat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (256 * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Builds the OSM embed URL accurately matching the map container size. */
function buildOsmUrl(center, zoom, width, height) {
  // Use 80% of width/height to construct a bbox. This guarantees that Leaflet
  // fitBounds() will compute the exact target `zoom` level and center perfectly.
  const bboxWidth = width * 0.8;
  const bboxHeight = height * 0.8;

  const cx = lon2x(center.lng, zoom);
  const cy = lat2y(center.lat, zoom);

  const minLng = x2lon(cx - bboxWidth / 2, zoom);
  const maxLng = x2lon(cx + bboxWidth / 2, zoom);
  // Y axis goes down, so cy - bboxHeight/2 is the NORTH edge (maxLat)
  const maxLat = y2lat(cy - bboxHeight / 2, zoom);
  const minLat = y2lat(cy + bboxHeight / 2, zoom);

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`
  );
}

/** Campus center — fallback starting point for the manual map */
const CAMPUS_CENTER = { lat: 51.7448, lng: 19.4483 };

const MIN_ZOOM = 13;
const MAX_ZOOM = 19;

/* ─────────────────────────────────────────────
 * ManualMap sub-component
 * ───────────────────────────────────────────── */

/**
 * Renders an interactive OSM iframe with zoom controls and a click-to-pick overlay.
 *
 * Architecture:
 *  - The iframe has pointer-events:none so the container div catches all clicks.
 *  - The map container's onClick calculates lat/lng from click position.
 *  - Zoom ± buttons call e.stopPropagation() to avoid triggering the pin-drop.
 *
 * @param {{
 *   initialCenter?: { lat: number, lng: number },
 *   onConfirm: (coords: { lat: number, lng: number }) => void,
 *   onClose: () => void,
 * }}
 */
function ManualMap({ initialCenter = CAMPUS_CENTER, onConfirm, onClose }) {
  const [center, setCenter] = useState(initialCenter);
  const [picked, setPicked] = useState(null);
  const [zoom, setZoom] = useState(16);
  const mapRef = useRef(null);
  const [iframeKey, setIframeKey] = useState(0);

  const [mapDimensions, setMapDimensions] = useState(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setMapDimensions({ width, height });
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // Click on the map container → calculate lat/lng from cursor position.
  const handleMapClick = useCallback(
    (e) => {
      if (!mapDimensions) return;
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cx = mapDimensions.width / 2;
      const cy = mapDimensions.height / 2;

      const centerPxX = lon2x(center.lng, zoom);
      const centerPxY = lat2y(center.lat, zoom);

      // Pixel coordinate of the click in global map space
      const clickPxX = centerPxX + (x - cx);
      const clickPxY = centerPxY + (y - cy);

      const lat = y2lat(clickPxY, zoom);
      const lng = x2lon(clickPxX, zoom);
      
      setPicked({ lat, lng });
    },
    [center, zoom, mapDimensions],
  );

  // Zoom buttons stop propagation so the map click handler isn't triggered.
  const handleZoomIn = useCallback((e) => {
    e.stopPropagation();
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, z + 1);
      if (next !== z) setIframeKey((k) => k + 1);
      return next;
    });
  }, []);

  const handleZoomOut = useCallback((e) => {
    e.stopPropagation();
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - 1);
      if (next !== z) setIframeKey((k) => k + 1);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!picked) return;
    onConfirm(picked);
  }, [picked, onConfirm]);

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

      {/* Map container — clips the expanded iframe wrapper to hide native OSM UI */}
      <div className="relative h-64 sm:h-72 bg-surface-container overflow-hidden rounded-b-xl border-t-0">
        {/* Iframe & Mapping wrapper — expanded by 80px to push OSM controls out of view */}
        <div
          ref={mapRef}
          onClick={handleMapClick}
          className="absolute cursor-crosshair"
          title="Kliknij aby wybrać lokalizację"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleMapClick(e);
          }}
          style={{
            top: -80,
            left: -80,
            width: 'calc(100% + 160px)',
            height: 'calc(100% + 160px)',
          }}
        >
          {/* OSM iframe — pointer-events-none so the wrapper catches clicks */}
          {mapDimensions && (
            <iframe
              key={iframeKey}
              title="Mapa lokalizacji"
              src={buildOsmUrl(center, zoom, mapDimensions.width, mapDimensions.height)}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Crosshair at picked point */}
          {picked && mapDimensions && (
            <CrosshairMarker
              lat={picked.lat}
              lng={picked.lng}
              center={center}
              zoom={zoom}
              mapDimensions={mapDimensions}
            />
          )}
        </div>

        {/* Zoom controls — stopPropagation prevents triggering the map click */}
        <div
          className="absolute bottom-3 right-3 flex flex-col gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Przybliż"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-md border border-outline/30
              text-gray-800 hover:bg-white active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-default cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg select-none">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Oddal"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-md border border-outline/30
              text-gray-800 hover:bg-white active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-default cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg select-none">remove</span>
          </button>
        </div>

        {/* Top hint — pinned to the visible container! */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap z-10 shadow-sm border border-white/10">
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
 * Position is derived from the exactly identical Mercator logic.
 */
function CrosshairMarker({ lat, lng, center, zoom, mapDimensions }) {
  const centerPxX = lon2x(center.lng, zoom);
  const centerPxY = lat2y(center.lat, zoom);

  const markerPxX = lon2x(lng, zoom);
  const markerPxY = lat2y(lat, zoom);

  const cx = mapDimensions.width / 2;
  const cy = mapDimensions.height / 2;

  // Offset from center gives coordinates relative to center, plus cx/cy gives px from top/left.
  const x = cx + (markerPxX - centerPxX);
  const y = cy + (markerPxY - centerPxY);

  const rawLeft = (x / mapDimensions.width) * 100;
  const rawTop = (y / mapDimensions.height) * 100;

  // Clamp to [2%, 98%] so the pin stays inside the map area
  const left = `${Math.min(98, Math.max(2, rawLeft)).toFixed(2)}%`;
  const top = `${Math.min(98, Math.max(2, rawTop)).toFixed(2)}%`;

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

  // Keep a stable ref to the latest onChange to avoid the effect firing
  // on every re-render when the parent passes a new inline function reference.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Propagate coords up when GPS succeeds — only reacts to actual coords changes.
  useEffect(() => {
    if (coords) {
      onChangeRef.current({ lat: coords.lat, lng: coords.lng });
    }
  }, [coords]);

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
