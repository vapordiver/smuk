import React from 'react';

export default function MapViewToggle({ viewMode, onChange }) {
    return (
        <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-lg shadow-md border border-slate-200">
            <button
                aria-pressed={viewMode === 'markers'}
                onClick={() => onChange('markers')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    viewMode === 'markers'
                        ? 'bg-primary text-white shadow'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                    Markery
                </div>
            </button>
            <button
                aria-pressed={viewMode === 'heatmap'}
                onClick={() => onChange('heatmap')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    viewMode === 'heatmap'
                        ? 'bg-primary text-white shadow'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">blur_on</span>
                    Heatmapa
                </div>
            </button>
        </div>
    );
}
