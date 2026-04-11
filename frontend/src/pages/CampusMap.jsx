import { useState } from 'react';

export default function CampusMap() {
  const [query, setQuery] = useState('');

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4">
        <div className="relative max-w-md">
          <input
            className="w-full bg-surface-container-low rounded-full px-4 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
            placeholder="Szukaj na mapie kampusu..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { /* TODO: handle search */ } }}
          />
          <button
            type="button"
            className="absolute right-3 inset-y-0 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            aria-label="Szukaj"
            onClick={() => { /* TODO: handle search */ }}
          >
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="flex-1 flex items-center justify-center bg-surface-container-low m-4 rounded-xl">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/40">map</span>
          <p className="mt-2 text-lg font-bold text-primary">Mapa Kampusu</p>
          <p className="text-sm text-on-surface-variant">Wkrótce dostępna</p>
        </div>
      </div>
    </div>
  );
}