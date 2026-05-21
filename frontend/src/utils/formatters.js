export const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const PRIORITY_LABELS = {
    LOW: 'Niski',
    MEDIUM: 'Średni',
    HIGH: 'Wysoki',
    CRITICAL: 'Krytyczny',
};

export const PRIORITY_COLORS = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#ef4444',
    CRITICAL: '#171717',
};
