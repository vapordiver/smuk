import {createContext, useContext, useState, useEffect} from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    //checks on app start if user token exists and loads profile
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const response = await api.get('/auth/me/');
                    setUser(response.data);
                } catch (error) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login/', {email, password});
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        //get user profile after login
        const userResponse = await api.get('/auth/me/');
        setUser(userResponse.data)
    };

    const register = async (userData) => {
        await api.post('/auth/register/', userData);
    }

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{user, isAuthenticated: !!user, isLoading, login, register, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);