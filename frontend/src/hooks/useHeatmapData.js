import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useHeatmapData(filters = {}) {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        // query string na podstawie filtrow z heatmapy
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.category_id) params.append('category_id', filters.category_id);

        const queryString = params.toString();
        const endpoint = queryString ? `tickets/heatmap-data/?${queryString}` : 'tickets/heatmap-data/';

        api.get(endpoint)
            .then(res => {
                if (isMounted) {
                    setPoints(res.data.points || []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('[useHeatmapData] GET /api/tickets/heatmap-data/ failed:', err.message);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [filters.date_from, filters.date_to, filters.category_id]);

    return { points, loading, error };
}
