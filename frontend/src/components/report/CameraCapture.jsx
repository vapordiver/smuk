import { useState, useCallback, useRef } from 'react';

/**
 * CameraCapture — UI component for taking a fault photo.
 *
 * It uses a native file picker with `capture="environment"` so the user can
 * take a photo using their device camera.
 *
 * @param {{ value: File|null, onChange: (file: File|null) => void, error?: string }}
 */
export default function CameraCapture({ value, onChange, error }) {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Native file-input change ── */
  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onChange(file);
      setPreview(URL.createObjectURL(file));
    },
    [onChange],
  );

  /* ── Remove photo ── */
  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  /* ── Retake photo ── */
  const handleRetake = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-on-background mb-1">
        Zdjęcie usterki <span className="text-error">*</span>
      </label>

      {/* Hidden file input used for both empty state and retake */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      {/* ── CASE 1: Photo preview ── */}
      {preview ? (
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
              Zmień zdjęcie
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
      ) : (
        /* ── CASE 2: Empty state ── */
        <button
          type="button"
          onClick={handleRetake}
          className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer
            ${error
              ? 'border-error bg-error-container/30 hover:bg-error-container/50'
              : 'border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/40'
            }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${error ? 'bg-error/10' : 'bg-primary/10'}`}>
            <span
              className={`material-symbols-outlined text-3xl ${error ? 'text-error' : 'text-primary'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_a_photo
            </span>
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${error ? 'text-error' : 'text-on-background'}`}>
              Dodaj zdjęcie usterki
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Kliknij, aby wybrać lub sfotografować
            </p>
          </div>
        </button>
      )}

      {/* Error message */}
      {error && !preview && (
        <p className="text-xs text-error flex items-start gap-1 mt-1">
          <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
          <span className="flex-1">{error}</span>
        </p>
      )}
    </div>
  );
}
