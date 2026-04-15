import axios from 'axios';

const api = axios.create({
    baseURL: '/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// request interceptor - adds access token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// response interceptor - catches error 401 and refreshes the token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        //if error 401 occures and there wasn't a rerequest yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const res = await axios.post('/api/auth/token/refresh/', {refresh: refreshToken});
                    localStorage.setItem('accessToken', res.data.access);
                    originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                    // if failed retry with fresh token
                    return api(originalRequest);
                } catch (refreshError) {
                    //if refresh token is also expired then logout the user
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';

                }
            }
        }
        return Promise.reject(error);
    }
)

export default api;