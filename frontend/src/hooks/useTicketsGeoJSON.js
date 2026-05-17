import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useTicketsGeoJSON(filters = {}) {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        // query string filtrow
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.category_id) params.append('category_id', filters.category_id);
        const queryString = params.toString();
        const endpoint = queryString ? `tickets/geojson/?${queryString}` : 'tickets/geojson/';

        api.get(endpoint)
            .then(res => {
                if (isMounted) {
                    setFeatures(res.data.features || []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('[useTicketsGeoJSON] GET /api/tickets/geojson/ failed:', err.message);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [filters.date_from, filters.date_to, filters.category_id]);

    return { features, loading, error };
}
