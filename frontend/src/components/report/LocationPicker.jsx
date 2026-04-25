/* eslint-disable react/prop-types */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

/** Campus center — fallback starting point for the manual map */
const CAMPUS_CENTER = { lat: 51.7448, lng: 19.4483 };

const MIN_ZOOM = 13;
const MAX_ZOOM = 19;

const customIcon = new L.DivIcon({
  className: 'bg-transparent border-none',
  html: `<div style="position:relative; width:0; height:0;"><span class="material-symbols-outlined text-3xl text-primary drop-shadow-lg" style="font-variation-settings: 'FILL' 1; position:absolute; transform: translate(-50%, -100%);">location_on</span></div>`,
  iconSize: [0, 0],
});

/* ─────────────────────────────────────────────
 * ManualMap sub-component
 * ───────────────────────────────────────────── */

function MapEvents({ setPicked, setZoom }) {
  useMapEvents({
    click(e) {
      setPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    zoomend(e) {
      setZoom(e.target.getZoom());
    },
  });
  return null;
}

function ManualMap({ initialCenter = CAMPUS_CENTER, onConfirm, onClose }) {
  const [picked, setPicked] = useState(null);
  const [zoom, setZoom] = useState(16);
  const [mapObj, setMapObj] = useState(null);

  const handleZoomIn = useCallback((e) => {
    e.stopPropagation();
    if (mapObj) mapObj.zoomIn();
  }, [mapObj]);

  const handleZoomOut = useCallback((e) => {
    e.stopPropagation();
    if (mapObj) mapObj.zoomOut();
  }, [mapObj]);

  const handleConfirm = useCallback(() => {
    if (!picked) return;
    onConfirm(picked);
  }, [picked, onConfirm]);

  const handleMoveCenter = useCallback(() => {
    if (!picked || !mapObj) return;
    mapObj.setView(picked, mapObj.getZoom());
  }, [picked, mapObj]);

  return (
    <div className="rounded-xl border-2 border-primary/40 overflow-hidden bg-surface-container-low flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-container border-b border-outline z-10 relative">
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

      <div className="relative h-64 sm:h-72 bg-surface-container overflow-hidden z-0">
        <MapContainer
          center={initialCenter}
          zoom={16}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', background: '#e5e5e5' }}
          ref={setMapObj}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents setPicked={setPicked} setZoom={setZoom} />
          {picked && <Marker position={picked} icon={customIcon} />}
        </MapContainer>

        {/* Zoom controls */}
        <div
          className="absolute bottom-3 right-3 flex flex-col gap-1 z-[1000]"
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

        {/* Top hint */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap z-[1000] shadow-sm border border-white/10">
          Kliknij mapę, aby wybrać punkt
        </div>
      </div>

      {/* Picked coords + actions */}
      <div className="px-3 py-2.5 border-t border-outline flex items-center gap-2 flex-wrap relative z-10 bg-surface-container-low">
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
              <span className="flex-1">{geoError || displayError}</span>
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
