import { useRef, useState, useCallback, useEffect } from 'react';

/* ─────────────────────────────────────────────
 * Platform / browser detection helpers
 * (UA sniffing — good enough for UX copy)
 * ───────────────────────────────────────────── */

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad OS 13+ reports itself as MacIntel with touch points
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * True when running in Safari (desktop or mobile).
 * Excludes Chrome and other Blink browsers that spoof the Safari UA string.
 */
function isSafari() {
  return (
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|FxiOS|EdgA|OPR/i.test(navigator.userAgent)
  );
}

/**
 * Checks whether the browser supports getUserMedia at all
 * (requires HTTPS or localhost; iOS Safari < 11 does not support it).
 */
function checkGetUserMediaSupport() {
  return !!(
    typeof window !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Returns a platform-specific instruction for the NotAllowedError case.
 */
function getPermissionDeniedMessage() {
  // All iOS browsers (Chrome/Firefox on iOS) use WebKit underneath,
  // so the permission lives in the system Settings, not the browser itself.
  if (isIOS()) {
    return (
      'Brak uprawnień do kamery. ' +
      'Przejdź do Ustawienia → Safari → Kamera i wybierz „Zezwalaj".'
    );
  }
  if (isAndroid()) {
    return (
      'Brak uprawnień do kamery. ' +
      'Dotknij ikony kłódki w pasku adresu, wybierz Uprawnienia i zezwól na dostęp do kamery.'
    );
  }
  // Desktop (Chrome, Firefox, Edge, Safari)
  if (isSafari()) {
    return (
      'Brak uprawnień do kamery. ' +
      'Otwórz Safari → Preferencje → Witryny → Kamera i ustaw „Zezwól".'  
    );
  }
  return (
    'Brak uprawnień do kamery. ' +
    'Kliknij ikonę kamery lub kłódki w pasku adresu przeglądarki i zezwól na dostęp.'
  );
}

/**
 * Maps a getUserMedia / stream error to a human-readable Polish message.
 *
 * @param {Error} err
 * @returns {string}
 */
function mapCameraError(err) {
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return getPermissionDeniedMessage();
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Nie znaleziono kamery na tym urządzeniu.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Kamera jest aktualnie używana przez inną aplikację. Zamknij ją i spróbuj ponownie.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      // Handled internally — retry with relaxed constraints; shown only if retry also fails.
      return 'Żądane ustawienia kamery nie są obsługiwane przez to urządzenie.';
    case 'SecurityError':
      return 'Dostęp do kamery jest zablokowany ze względów bezpieczeństwa. Strona musi działać przez HTTPS.';
    case 'AbortError':
      return 'Żądanie dostępu do kamery zostało przerwane.';
    default:
      return `Nie udało się uruchomić kamery. (${err.name || 'Nieznany błąd'})`;
  }
}

const IDEAL_CONSTRAINTS = (facingMode) => ({
  video: {
    // Use `ideal` (not `exact`) to avoid OverconstrainedError on iOS
    facingMode: { ideal: facingMode },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
});

const RELAXED_CONSTRAINTS = {
  video: true,
  audio: false,
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const JPEG_QUALITY = 0.92;

/**
 * useCamera — reusable hook for accessing the device camera via getUserMedia.
 *
 * Handles:
 *  - API availability detection (HTTPS / iOS Safari)
 *  - Stream lifecycle (open → active → stop) with cleanup on unmount
 *  - facingMode toggle (environment / user) with fallback to relaxed constraints
 *  - Frame capture → Blob → File
 *  - Graceful degradation messages for iOS Safari permission denial
 *
 * @param {{ maxSizeMB?: number, jpegQuality?: number }} [options]
 *
 * @returns {{
 *   videoRef: React.RefObject<HTMLVideoElement>,
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   isSupported: boolean,
 *   isOpen: boolean,
 *   isCapturing: boolean,
 *   error: string | null,
 *   facingMode: 'environment' | 'user',
 *   openCamera: () => Promise<void>,
 *   closeCamera: () => void,
 *   capture: () => Promise<File | null>,
 *   flipCamera: () => Promise<void>,
 *   clearError: () => void,
 * }}
 */
export function useCamera({ maxSizeMB = 10, jpegQuality = JPEG_QUALITY } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const isSupported = checkGetUserMediaSupport();

  /* ── Internal: stop active stream tracks ── */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  /* ── Internal: start stream with given constraints ── */
  const startStream = useCallback(async (constraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      // iOS Safari requires explicit .play() after assigning srcObject
      await videoRef.current.play();
    }
  }, []);

  /* ── Open camera ── */
  const openCamera = useCallback(async () => {
    if (!isSupported) return;

    setError(null);
    setIsOpen(true);

    try {
      await startStream(IDEAL_CONSTRAINTS(facingMode));
    } catch (err) {
      // Retry with relaxed constraints on OverconstrainedError
      if (
        err.name === 'OverconstrainedError' ||
        err.name === 'ConstraintNotSatisfiedError'
      ) {
        try {
          await startStream(RELAXED_CONSTRAINTS);
          return; // success on retry
        } catch (retryErr) {
          setError(mapCameraError(retryErr));
        }
      } else {
        setError(mapCameraError(err));
      }

      setIsOpen(false);
      stopStream();
    }
  }, [isSupported, facingMode, startStream, stopStream]);

  /* ── Close camera ── */
  const closeCamera = useCallback(() => {
    stopStream();
    setIsOpen(false);
    setError(null);
  }, [stopStream]);

  /* ── Capture still frame → File ── */
  const capture = useCallback(() => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !streamRef.current) {
        resolve(null);
        return;
      }

      setIsCapturing(true);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');

      // Mirror horizontally for front camera so the image appears natural
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          setIsCapturing(false);

          if (!blob) {
            setError('Nie udało się przetworzyć zdjęcia. Spróbuj ponownie.');
            resolve(null);
            return;
          }

          const maxBytes = maxSizeMB * 1024 * 1024;
          if (blob.size > maxBytes) {
            setError(`Plik jest za duży (maks. ${maxSizeMB} MB).`);
            resolve(null);
            return;
          }

          const file = new File([blob], `usterka_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });

          resolve(file);
        },
        'image/jpeg',
        jpegQuality,
      );
    });
  }, [facingMode, maxSizeMB, jpegQuality]);

  /* ── Flip between front / rear camera ── */
  const flipCamera = useCallback(async () => {
    stopStream();
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    setError(null);

    try {
      await startStream(IDEAL_CONSTRAINTS(newFacing));
    } catch (err) {
      // If new facing fails, try relaxed as last resort
      try {
        await startStream(RELAXED_CONSTRAINTS);
      } catch {
        setError(mapCameraError(err));
        setIsOpen(false);
        stopStream();
      }
    }
  }, [facingMode, startStream, stopStream]);

  const clearError = useCallback(() => setError(null), []);

  return {
    videoRef,
    canvasRef,
    isSupported,
    isOpen,
    isCapturing,
    error,
    facingMode,
    openCamera,
    closeCamera,
    capture,
    flipCamera,
    clearError,
  };
}
