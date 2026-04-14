import axios from 'axios';

/**
 * Central Axios instance for all API calls.
 * Base URL points to the Vite dev-server proxy (/api → backend).
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
  },
});

// TODO (SMUK-13): Add JWT interceptor once auth is wired up
// apiClient.interceptors.request.use((config) => {
//   const token = localStorage.getItem('access_token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default apiClient;
