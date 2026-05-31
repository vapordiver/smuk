import React from 'react';

export default function DuplicateModal({ tickets, onConfirm, onReject, onClose }) {
  if (!tickets || tickets.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-lg p-6 flex flex-col border border-outline-variant">

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-error text-3xl">content_copy</span>
            <h2 className="text-xl font-bold text-on-background leading-tight">Podobne zgłoszenia w okolicy</h2>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            W promieniu 50m wykryliśmy otwarte zgłoszenia w tej samej kategorii.
            Jeśli któreś z nich opisuje Twój problem, wybierz <b className="text-primary">"Tak, to ta sama"</b>.
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto mb-6 flex flex-col gap-3 pr-2 scrollbar-thin">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-surface-container-low p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-outline hover:border-primary/50 transition-colors">
              <div>
                <h3 className="font-semibold text-on-background line-clamp-1">{ticket.title}</h3>
                <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <strong className="text-primary">{ticket.distance}m</strong> stąd
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onConfirm(ticket.id)}
                className="w-full sm:w-auto h-10 px-4 bg-primary text-on-primary text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[0.98] transition-all whitespace-nowrap"
              >
                Tak, to ta sama
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-5 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors"
          >
            Anuluj zgłaszanie
          </button>
          <button
            type="button"
            onClick={onReject}
            className="h-12 px-5 bg-surface-container text-on-background font-bold rounded-xl hover:bg-surface-container-high transition-colors"
          >
            Nie, to nowa usterka
          </button>
        </div>

      </div>
    </div>
  );
}