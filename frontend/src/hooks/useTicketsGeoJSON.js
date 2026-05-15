import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useTicketsGeoJSON() {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        api.get('tickets/geojson/')
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
    }, []);

    return { features, loading, error };
}
