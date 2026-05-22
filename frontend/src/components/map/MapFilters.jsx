import { useState, useEffect, useRef } from 'react';

const DATE_PRESETS = [
    { label: '7 dni', days: 7 },
    { label: '30 dni', days: 30 },
    { label: 'Wszystkie', days: null },
];

function getPresetDates(days) {
    if (!days) return { date_from: null, date_to: null };
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    return {
        date_from: from.toISOString().slice(0, 10),
        date_to: to.toISOString().slice(0, 10),
    };
}

export default function MapFilters({ filters, onChange, categories }) {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef(null);
    const triggerRef = useRef(null);

    // close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e) {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const activeFilterCount = [
        filters.date_from, filters.date_to, filters.category_id
    ].filter(Boolean).length;

    const dateError = filters.date_from && filters.date_to && filters.date_from > filters.date_to;

    const handleDateChange = (field, value) => {
        onChange({ ...filters, [field]: value || null });
    };

    const handlePreset = (days) => {
        const dates = getPresetDates(days);
        onChange({ ...filters, ...dates });
    };

    const handleCategoryChange = (value) => {
        onChange({ ...filters, category_id: value ? Number(value) : null });
    };

    const clearAll = () => {
        onChange({ date_from: null, date_to: null, category_id: null });
    };

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                aria-expanded={open}
                aria-label="Filtry mapy"
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-2.5 rounded-lg shadow-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
                <span className="material-symbols-outlined text-lg">tune</span>
                Filtry
                {activeFilterCount > 0 && (
                    <span className="ml-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            {/* popover panel */}
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute top-full mt-2 right-0 z-20 w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 max-h-[calc(100vh-8rem)] overflow-y-auto animate-in fade-in"
                >
                    {/* header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h4 className="font-bold text-sm text-slate-900">Filtry mapy</h4>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Zamknij filtry"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* data range */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Zakres dat
                            </label>

                            {/* preset buttons */}
                            <div className="flex gap-1.5 mb-3">
                                {DATE_PRESETS.map(preset => {
                                    const presetDates = getPresetDates(preset.days);
                                    const isActive = filters.date_from === presetDates.date_from
                                        && filters.date_to === presetDates.date_to;
                                    return (
                                        <button
                                            key={preset.label}
                                            onClick={() => handlePreset(preset.days)}
                                            className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${isActive
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* custom date range */}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Od</label>
                                    <input
                                        type="date"
                                        value={filters.date_from || ''}
                                        onChange={e => handleDateChange('date_from', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Do</label>
                                    <input
                                        type="date"
                                        value={filters.date_to || ''}
                                        onChange={e => handleDateChange('date_to', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* date validation */}
                            {dateError && (
                                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    „Data od" musi być wcześniejsza niż „Data do"
                                </p>
                            )}
                        </div>

                        {/* category  */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Kategoria
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.category_id || ''}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-8"
                                >
                                    <option value="">Wszystkie kategorie</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined text-slate-400 text-lg absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    expand_more
                                </span>
                            </div>
                        </div>

                        {/* clear all */}
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearAll}
                                className="w-full px-3 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#8C1800] hover:text-[#FFEDE9] hover:bg-[#630E00] rounded-lg transition-all flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                Wyczyść filtry
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
