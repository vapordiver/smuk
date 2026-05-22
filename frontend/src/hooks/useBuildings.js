import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useBuildings() {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        api.get('buildings/')
            .then(res => {
                if (isMounted) {
                    const data = res.data || [];
                    // Natural alphanumeric sort (A-1, A-2, A-10)
                    data.sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                    );
                    setBuildings(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('[useBuildings] GET /api/buildings/ failed:', err.message);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return { buildings, loading, error };
}
