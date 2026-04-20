import { useState, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────
 * Error code mapping
 * ───────────────────────────────────────────── */

/**
 * Maps a GeolocationPositionError code to a Polish message.
 * Codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
 *
 * @param {GeolocationPositionError} err
 * @returns {{ message: string, canUseManual: boolean }}
 */
function mapGeoError(err) {
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      return {
        message:
          'Odmówiono dostępu do lokalizacji. ' +
          (isIOS()
            ? 'Przejdź do Ustawienia → Prywatność → Usługi lokalizacji i włącz dostęp dla Safari.'
            : isAndroid()
              ? 'Dotknij ikony kłódki w pasku adresu i zezwól na dostęp do lokalizacji.'
              : 'Kliknij ikonę kłódki w pasku adresu i zezwól na lokalizację.'),
        canUseManual: true,
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        message:
          'Nie można ustalić lokalizacji. Sprawdź sygnał GPS lub połączenie z internetem.',
        canUseManual: true,
      };
    case 3: // TIMEOUT
      return {
        message:
          'Upłynął czas oczekiwania na GPS. Spróbuj ponownie lub wskaż lokację ręcznie.',
        canUseManual: true,
      };
    default:
      return {
        message: `Nieznany błąd lokalizacji (kod ${err.code}).`,
        canUseManual: true,
      };
  }
}

/* ─────────────────────────────────────────────
 * Platform detection (same approach as useCamera)
 * ───────────────────────────────────────────── */

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/* ─────────────────────────────────────────────
 * Hook
 * ───────────────────────────────────────────── */

/**
 * useGeolocation — reusable hook for getting device GPS coordinates.
 *
 * Handles:
 *  - API availability check
 *  - getCurrentPosition with configurable timeout / accuracy options
 *  - Full error code mapping (1/2/3) with platform-aware messages
 *  - `canUseManual` flag — signals the UI to offer a manual map fallback
 *
 * @param {{
 *   timeout?: number,
 *   maximumAge?: number,
 *   enableHighAccuracy?: boolean,
 * }} [options]
 *
 * @returns {{
 *   coords: { lat: number, lng: number, accuracy: number } | null,
 *   status: 'idle' | 'loading' | 'success' | 'error',
 *   error: string | null,
 *   canUseManual: boolean,
 *   isSupported: boolean,
 *   getPosition: () => void,
 *   clearPosition: () => void,
 * }}
 */
export function useGeolocation({
  timeout = 10_000,
  maximumAge = 0,
  enableHighAccuracy = true,
  maxAccuracy = 250, // default to 250m threshold
} = {}) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [canUseManual, setCanUseManual] = useState(false);

  // Keep a ref so we can ignore stale callbacks if the user calls clearPosition
  // while a request is still in flight.
  const requestIdRef = useRef(0);

  const isSupported = 'geolocation' in navigator;

  const getPosition = useCallback(() => {
    if (!isSupported) {
      setStatus('error');
      setError('Geolokalizacja nie jest wspierana w tej przeglądarce.');
      setCanUseManual(true);
      return;
    }

    const currentId = ++requestIdRef.current;
    setStatus('loading');
    setError(null);
    setCanUseManual(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (currentId !== requestIdRef.current) return; // stale

        // Reject locations with huge accuracy radius (e.g. 5000m+ from IP-based fallback)
        if (maxAccuracy && position.coords.accuracy > maxAccuracy) {
          console.warn(`[useGeolocation] Rejecting inaccurate location: ±${position.coords.accuracy}m`);
          setStatus('error');
          setError(
            `Lokalizacja zbyt niedokładna (±${Math.round(
              position.coords.accuracy
            )}m). Sprawdź sygnał GPS lub wskaż lokację ręcznie.`
          );
          setCanUseManual(true);
          return;
        }

        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus('success');
        setCanUseManual(false);
      },
      (err) => {
        if (currentId !== requestIdRef.current) return; // stale
        console.warn('[useGeolocation] error:', err.code, err.message);
        const { message, canUseManual: manual } = mapGeoError(err);
        setStatus('error');
        setError(message);
        setCanUseManual(manual);
      },
      { enableHighAccuracy, timeout, maximumAge },
    );
  }, [isSupported, enableHighAccuracy, timeout, maximumAge]);

  const clearPosition = useCallback(() => {
    requestIdRef.current++; // invalidate any in-flight callback
    setCoords(null);
    setStatus('idle');
    setError(null);
    setCanUseManual(false);
  }, []);

  return {
    coords,
    status,
    error,
    canUseManual,
    isSupported,
    getPosition,
    clearPosition,
  };
}
