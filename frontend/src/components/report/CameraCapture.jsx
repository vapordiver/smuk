import { useRef, useState, useCallback, useEffect } from 'react';

const MAX_SIZE_MB = 10;

/**
 * CameraCapture — forces live camera capture (no gallery).
 * Uses navigator.mediaDevices.getUserMedia to open the rear camera,
 * displays a viewfinder, and captures a still frame on button press.
 *
 * @param {{ value: File|null, onChange: (file: File|null) => void, error?: string }}
 */
export default function CameraCapture({ value, onChange, error }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  /* ── Stop camera stream ── */
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

  /* ── Start camera ── */
  const openCamera = async () => {
    setCameraError('');
    setCameraOpen(true);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('[CameraCapture] getUserMedia error:', err);
      let message = 'Nie udało się uruchomić kamery.';
      if (err.name === 'NotAllowedError') {
        message = 'Brak uprawnień do kamery. Zezwól na dostęp w ustawieniach przeglądarki.';
      } else if (err.name === 'NotFoundError') {
        message = 'Nie znaleziono kamery na tym urządzeniu.';
      } else if (err.name === 'NotReadableError') {
        message = 'Kamera jest używana przez inną aplikację.';
      }
      setCameraError(message);
      setCameraOpen(false);
    }
  };

  /* ── Capture photo from video stream ── */
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    // Mirror horizontal if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `usterka_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        // Check size
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setCameraError(`Plik jest za duży. Maksymalnie ${MAX_SIZE_MB} MB.`);
          return;
        }

        onChange(file);
        setPreview(canvas.toDataURL('image/jpeg', 0.92));
        stopStream();
        setCameraOpen(false);
      },
      'image/jpeg',
      0.92
    );
  };

  /* ── Switch front/rear camera ── */
  const flipCamera = async () => {
    stopStream();
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Nie udało się przełączyć kamery.');
    }
  };

  /* ── Remove and retake ── */
  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    setCameraError('');
  };

  const handleRetake = () => {
    handleRemove();
    openCamera();
  };

  const displayError = cameraError || error;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-on-background mb-1">
        Zdjęcie usterki <span className="text-error">*</span>
      </label>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {cameraOpen ? (
        /* ── Live viewfinder ── */
        <div className="relative rounded-xl overflow-hidden border-2 border-primary/40 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-64 sm:h-72 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Camera controls overlay */}
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

            {/* Capture button */}
            <button
              type="button"
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 active:scale-90 transition-all cursor-pointer"
              aria-label="Zrób zdjęcie"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Close camera */}
            <button
              type="button"
              onClick={() => {
                stopStream();
                setCameraOpen(false);
              }}
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
      ) : preview ? (
        /* ── Preview state ── */
        <div className="relative group rounded-xl overflow-hidden border-2 border-outline bg-surface-container-low">
          <img
            src={preview}
            alt="Podgląd zdjęcia"
            className="w-full h-48 sm:h-56 object-cover"
          />
          {/* Overlay with actions */}
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
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            {value?.name}
          </div>
        </div>
      ) : (
        /* ── Empty state — open camera button ── */
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
      )}

      {displayError && !cameraOpen && (
        <p className="text-xs text-error flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">warning</span>
          {displayError}
        </p>
      )}
    </div>
  );
}
