import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useCampuses() {
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        api.get('campuses/')
            .then(res => {
                if (isMounted) {
                    setCampuses(res.data || []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('[useCampuses] GET /api/campuses/ failed:', err.message);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return { campuses, loading, error };
}
