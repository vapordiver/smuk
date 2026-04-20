import { useState, useEffect, useCallback } from 'react';

/* ── Toast config ── */
const TOAST_CONFIG = {
  success: {
    icon: 'check_circle',
    bg: 'bg-secondary',
    text: 'text-on-secondary',
  },
  error: {
    icon: 'error',
    bg: 'bg-error',
    text: 'text-on-error',
  },
  info: {
    icon: 'info',
    bg: 'bg-primary',
    text: 'text-on-primary',
  },
};

/**
 * Toast notification component — slides in from top, auto-dismisses.
 *
 * @param {{ type: 'success'|'error'|'info', message: string, visible: boolean, onClose: () => void, duration?: number }}
 */
export default function Toast({ type = 'info', message, visible, onClose, duration = 5000 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setShow(true));

      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  return (
    <div
      className={`fixed top-4 left-1/2 z-[100] -translate-x-1/2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md
        ${config.bg} ${config.text} px-5 py-3.5 rounded-xl shadow-lg
        flex items-start sm:items-center gap-3 transition-all duration-300 ease-out
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      role="alert"
    >
      <span
        className="material-symbols-outlined text-xl shrink-0 mt-0.5 sm:mt-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {config.icon}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={() => {
          setShow(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
        aria-label="Zamknij"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

/**
 * Custom hook to manage toast state.
 * Usage:
 *   const { toast, showToast } = useToast();
 *   showToast('success', 'Zgłoszenie wysłane!');
 *   <Toast {...toast} />
 */
export function useToast() {
  const [toast, setToast] = useState({
    type: 'info',
    message: '',
    visible: false,
  });

  const showToast = useCallback((type, message) => {
    setToast({ type, message, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    toast: { ...toast, onClose: hideToast },
    showToast,
  };
}
