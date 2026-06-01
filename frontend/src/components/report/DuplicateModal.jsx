import React, { useState } from 'react';

export default function DuplicateModal({ tickets, onConfirm, onReject, onClose }) {
  // current ticket index
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!tickets || tickets.length === 0) return null;

  const current = tickets[currentIndex];
  const total = tickets.length;

  // carousel controls
  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % total);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + total) % total);

  // (backend:8000 -> localhost:8000)
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.replace('backend:8000', 'localhost:8000');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">

      <div className="w-full max-w-md flex flex-col gap-3">

        {/* --- main body ticket --- */}
        <div className="bg-surface rounded-[32px] shadow-2xl overflow-hidden border border-outline-variant flex flex-col">

          {/* img and distance */}
          <div className="h-56 w-full bg-surface-container-high relative">
            {current.image ? (
              <img
                src={getImageUrl(current.image)}
                alt={current.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">image_not_supported</span>
              </div>
            )}
            {/* dist */}
            <div className="absolute top-4 right-4 bg-primary text-on-primary px-3 py-1.5 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {current.distance}m stąd
            </div>
          </div>

          {/* title , desc , assign button */}
          <div className="p-6 flex flex-col gap-2">
            <h2 className="text-xl font-bold text-on-background line-clamp-2 leading-tight">
              {current.title}
            </h2>
            {current.description && (
              <p className="text-sm text-on-surface-variant line-clamp-3 mb-4 mt-1">
                {current.description}
              </p>
            )}

            <button
              onClick={() => onConfirm(current.id)}
              className="w-full h-14 mt-2 bg-primary text-on-primary rounded-xl font-bold shadow-lg hover:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Tak, to ta sama usterka
            </button>
          </div>

          {/* carousel view if more than 1 ticket available */}
          {total > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low border-t border-outline-variant">
              <button
                onClick={handlePrev}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-3xl text-on-background">chevron_left</span>
              </button>

              <span className="text-sm font-bold text-on-surface-variant">
                {currentIndex + 1} / {total}
              </span>

              <button
                onClick={handleNext}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-3xl text-on-background">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* --- new ticket (not duplicate) and cancel buttons --- */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={onReject}
            className="w-full h-14 bg-[#2F3039] text-white rounded-[20px] font-bold shadow-lg hover:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
             <span className="material-symbols-outlined">add_box</span>
             Nie, to nowe zgłoszenie
          </button>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#8C1800' }}
            className="w-full h-14 text-white font-bold rounded-[20px] shadow-md hover:opacity-90 hover:scale-[0.98] transition-all"
          >
            Anuluj
          </button>
        </div>

      </div>
    </div>
  );
}