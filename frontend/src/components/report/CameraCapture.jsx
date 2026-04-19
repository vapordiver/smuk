import { useState, useCallback } from 'react';
import { useCamera } from '../../hooks/useCamera';

/**
 * CameraCapture — UI component for taking a fault photo.
 *
 * On devices / browsers where getUserMedia is unavailable (e.g. plain HTTP on
 * older iOS Safari) it automatically falls back to a native file picker with
 * `capture="environment"` so the user can still take a photo.
 *
 * All camera API logic lives in the `useCamera` hook; this file is pure UI.
 *
 * @param {{ value: File|null, onChange: (file: File|null) => void, error?: string }}
 */
export default function CameraCapture({ value, onChange, error }) {
  const {
    videoRef,
    canvasRef,
    isSupported,
    isOpen,
    isCapturing,
    error: cameraError,
    facingMode,
    openCamera,
    closeCamera,
    capture,
    flipCamera,
    clearError,
  } = useCamera();

  const [preview, setPreview] = useState(null);

  /* ── Take photo ── */
  const handleCapture = useCallback(async () => {
    const file = await capture();
    if (!file) return; // hook already set the error

    // Build a preview URL from the canvas (already drawn) – cheaper than
    // creating an object URL for the file blob.
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL('image/jpeg', 0.92) : URL.createObjectURL(file);

    onChange(file);
    setPreview(dataUrl);
    closeCamera();
  }, [capture, canvasRef, onChange, closeCamera]);

  /* ── Remove photo ── */
  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
    clearError();
  }, [onChange, clearError]);

  /* ── Retake photo ── */
  const handleRetake = useCallback(() => {
    handleRemove();
    openCamera();
  }, [handleRemove, openCamera]);

  /* ── Native file-input fallback (no getUserMedia) ── */
  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onChange(file);
      setPreview(URL.createObjectURL(file));
    },
    [onChange],
  );

  const displayError = cameraError || error;

  /* ════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════ */
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-on-background mb-1">
        Zdjęcie usterki <span className="text-error">*</span>
      </label>

      {/* Hidden canvas used by the hook for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── CASE 1: Camera viewfinder (getUserMedia active) ── */}
      {isOpen && (
        <div className="relative rounded-xl overflow-hidden border-2 border-primary/40 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline       // required on iOS to prevent fullscreen takeover
            muted
            className={`w-full h-64 sm:h-72 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Controls overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-center gap-6">
            {/* Flip camera */}
            <button
              type="button"
              onClick={flipCamera}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
              aria-label="Przełącz kamerę"
            >
              <span className="material-symbols-outlined text-xl">cameraswitch</span>
            </button>

            {/* Capture shutter */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 active:scale-90 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              aria-label="Zrób zdjęcie"
            >
              {isCapturing ? (
                <span className="material-symbols-outlined text-white text-2xl animate-spin">
                  progress_activity
                </span>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white" />
              )}
            </button>

            {/* Close camera */}
            <button
              type="button"
              onClick={closeCamera}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
              aria-label="Zamknij kamerę"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Viewfinder corner markers */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
            <div className="absolute bottom-12 left-0 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
            <div className="absolute bottom-12 right-0 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-md" />
          </div>
        </div>
      )}

      {/* ── CASE 2: Photo preview ── */}
      {!isOpen && preview && (
        <div className="relative group rounded-xl overflow-hidden border-2 border-outline bg-surface-container-low">
          <img
            src={preview}
            alt="Podgląd zdjęcia"
            className="w-full h-48 sm:h-56 object-cover"
          />
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleRetake}
              className="bg-white/90 text-on-background px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              Zrób ponownie
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-error/90 text-on-error px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-error transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Usuń
            </button>
          </div>
          {/* File name badge */}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {value?.name}
          </div>
        </div>
      )}

      {/* ── CASE 3: Empty state ── */}
      {!isOpen && !preview && (
        <>
          {isSupported ? (
            /* getUserMedia available — open live viewfinder */
            <button
              type="button"
              onClick={openCamera}
              className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer
                ${displayError
                  ? 'border-error bg-error-container/30 hover:bg-error-container/50'
                  : 'border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/40'
                }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${displayError ? 'bg-error/10' : 'bg-primary/10'}`}>
                <span
                  className={`material-symbols-outlined text-3xl ${displayError ? 'text-error' : 'text-primary'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  photo_camera
                </span>
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${displayError ? 'text-error' : 'text-on-background'}`}>
                  Zrób zdjęcie usterki
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Kliknij, aby uruchomić aparat
                </p>
              </div>
            </button>
          ) : (
            /* Fallback: native file picker with camera capture hint */
            <label
              className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer
                ${displayError
                  ? 'border-error bg-error-container/30 hover:bg-error-container/50'
                  : 'border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/40'
                }`}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileInputChange}
              />
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${displayError ? 'bg-error/10' : 'bg-primary/10'}`}>
                <span
                  className={`material-symbols-outlined text-3xl ${displayError ? 'text-error' : 'text-primary'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  add_a_photo
                </span>
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${displayError ? 'text-error' : 'text-on-background'}`}>
                  Dodaj zdjęcie usterki
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Kliknij, aby wybrać lub sfotografować
                </p>
              </div>
            </label>
          )}
        </>
      )}

      {/* Error message */}
      {displayError && !isOpen && (
        <p className="text-xs text-error flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">warning</span>
          {displayError}
        </p>
      )}
    </div>
  );
}
