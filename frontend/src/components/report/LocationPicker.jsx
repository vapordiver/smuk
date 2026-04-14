import { useState } from 'react';

/**
 * LocationPicker — GPS button with status display.
 * Falls back to a random debug campus location if Geolocation API fails or is unavailable.
 *
 * @param {{ value: {lat: number, lng: number}|null, onChange: (loc: {lat,lng}|null) => void, error?: string }}
 */
export default function LocationPicker({ value, onChange, error }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolokalizacja nie jest wspierana w twojej przeglądarce.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onChange(loc);
        setStatus('success');
      },
      (err) => {
        console.warn('[LocationPicker] Geolocation error:', err.message);
        setStatus('error');
        setErrorMsg('Nie udało się pobrać lokalizacji GPS. Upewnij się, że udzieliłeś uprawnień.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClear = () => {
    onChange(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const displayError = error && status !== 'success' ? error : '';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-on-background mb-1">
        Lokalizacja GPS <span className="text-error">*</span>
      </label>

      {value && status === 'success' ? (
        /* ── Success state ── */
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
              <p className="text-sm font-semibold text-on-background">Lokalizacja pobrana</p>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </p>
              {errorMsg && (
                <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {errorMsg}
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
        /* ── Idle / Loading / Error state ── */
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={status === 'loading'}
          className={`w-full rounded-xl border-2 border-dashed p-5 flex items-center gap-4 transition-all cursor-pointer
            ${status === 'loading'
              ? 'border-primary/40 bg-primary/5'
              : displayError
                ? 'border-error bg-error-container/30 hover:bg-error-container/50'
                : 'border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/40'
            }
            disabled:cursor-wait`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
              ${status === 'loading' ? 'bg-primary/10 animate-pulse' : displayError ? 'bg-error/10' : 'bg-primary/10'}`}
          >
            <span
              className={`material-symbols-outlined text-2xl
                ${status === 'loading' ? 'text-primary animate-spin' : displayError ? 'text-error' : 'text-primary'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {status === 'loading' ? 'progress_activity' : 'my_location'}
            </span>
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${displayError ? 'text-error' : 'text-on-background'}`}>
              {status === 'loading' ? 'Pobieram lokalizację…' : 'Pobierz lokalizację GPS'}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {status === 'loading'
                ? 'Proszę czekać, trwa ustalanie pozycji'
                : 'Kliknij, aby udostępnić swoją lokalizację'}
            </p>
          </div>
        </button>
      )}

      {displayError && (
        <p className="text-xs text-error flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">warning</span>
          {displayError}
        </p>
      )}
    </div>
  );
}
