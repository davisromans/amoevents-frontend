import axios from 'axios';
import { getApiCache, isOfflineError, makeApiCacheKey, putApiCache } from '@/services/offline.store';

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
  (r) => {
    // Every successful JSON GET becomes an offline-readable snapshot. This
    // gives event pages and other already-visited pages a durable fallback
    // after a refresh with no connection.
    if (r.config?.method?.toLowerCase() === 'get'
      && r.config.offlineCache !== false
      && r.config.responseType !== 'blob'
      && !(typeof Blob !== 'undefined' && r.data instanceof Blob)) {
      putApiCache(makeApiCacheKey(r.config), r.data);
    }
    return r;
  },
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    // If the browser is offline (or the connection dropped), turn a cached
    // GET back into a normal-looking Axios response. Existing pages can then
    // render their last known data without every view having to duplicate
    // fallback logic.
    if (original?.method?.toLowerCase() === 'get' && isOfflineError(err) && original.offlineCache !== false) {
      const cached = await getApiCache(makeApiCacheKey(original));
      if (cached) {
        window.dispatchEvent(new CustomEvent('offline:cache-used'));
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (offline cache)',
          headers: {},
          config: { ...original, fromOfflineCache: true },
          request: null,
          fromOfflineCache: true,
        };
      }
    }
    if (original && status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
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
        // Only a genuine "this refresh token is invalid/expired" (401 from
        // the refresh endpoint itself) means the session is actually over —
        // clear storage and force a real logout. Anything else (network
        // blip, a 429 from a refresh burst, a transient 5xx, a timeout) is
        // NOT proof the session ended; wiping valid tokens over a hiccup is
        // exactly what was logging people out early. Let the request fail
        // once and leave the tokens in place so the NEXT action can retry
        // normally with credentials that are probably still fine.
        const refreshStatus = e?.response?.status;
        if (refreshStatus === 401) {
          localStorage.removeItem('gc.accessToken');
          localStorage.removeItem('gc.refreshToken');
          if (onUnauthorized) onUnauthorized();
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default http;

export function unwrap(res) { return res.data?.data ?? res.data; }
export function apiErrorMessage(err) {
  const e = err?.response?.data?.error;
  if (e?.message && e.message !== 'Invalid request') return e.message;
  // Backend now puts the real per-field reason in e.message directly, but
  // fall back to joining e.details (Joi's {path, message} array) for any
  // older/other endpoint that still sends the generic literal.
  if (e?.details?.length) {
    return e.details.map((d) => d.message).filter(Boolean).join('; ') || e?.message || 'Request failed';
  }
  return e?.message || err?.message || 'Request failed';
}
