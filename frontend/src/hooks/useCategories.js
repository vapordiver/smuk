import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        api.get('categories/')
            .then(res => {
                if (isMounted) {
                    setCategories(res.data || []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('[useCategories] GET /api/categories/ failed:', err.message);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return { categories, loading, error };
}
