import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

let refreshing = null;
let onUnauthorized = null;

export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('gc.accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    if (status === 401 && !original._retry && !original.url.includes('/auth/refresh')) {
      original._retry = true;
      const refreshToken = localStorage.getItem('gc.refreshToken');
      if (!refreshToken) {
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(err);
      }
      try {
        refreshing = refreshing || axios.post('/api/auth/refresh', { refreshToken });
        const { data } = await refreshing;
        refreshing = null;
        const access = data.data.accessToken;
        const refresh = data.data.refreshToken;
        localStorage.setItem('gc.accessToken', access);
        localStorage.setItem('gc.refreshToken', refresh);
        original.headers.Authorization = `Bearer ${access}`;
        return http(original);
      } catch (e) {
        refreshing = null;
        localStorage.removeItem('gc.accessToken');
        localStorage.removeItem('gc.refreshToken');
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default http;

export function unwrap(res) { return res.data?.data ?? res.data; }
export function apiErrorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'Request failed';
}
