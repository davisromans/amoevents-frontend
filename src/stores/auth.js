import { defineStore } from 'pinia';
import http, { unwrap } from '@/services/http';
import { isOfflineError } from '@/services/offline.store';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('gc.user') || 'null'),
    tenant: JSON.parse(localStorage.getItem('gc.tenant') || 'null'),
    ready: false,
  }),
  getters: {
    isAuthed: (s) => !!s.user,
    role: (s) => s.user?.role || null,
    isSuperAdmin: (s) => s.user?.role === 'super_admin',
    isOwner: (s) => s.user?.role === 'owner',
    isScanner: (s) => s.user?.role === 'scanner',
  },
  actions: {
    async login(identifier, password) {
      const res = await http.post('/auth/login', { identifier, password });
      this._persist(unwrap(res));
    },
    async register(payload) {
      const res = await http.post('/auth/register', payload);
      this._persist(unwrap(res));
    },
    // "Continue with Amoview" — same phone+password as the Amoview app,
    // proxied server-side (bridge.routes.js's /taiview/login) so this is
    // genuinely one identity, not a second AmoEvents-only account.
    async loginWithAmoview(phone, password) {
      const res = await http.post('/bridge/taiview/login', { phone, password });
      this._persist(unwrap(res));
    },
    async fetchMe() {
      try {
        const res = await http.get('/auth/me');
        const { user, tenant } = unwrap(res);
        this.user = user;
        this.tenant = tenant;
        localStorage.setItem('gc.user', JSON.stringify(user));
        if (tenant) localStorage.setItem('gc.tenant', JSON.stringify(tenant));
      } catch (error) {
        // A cached authenticated session must survive a temporary outage so
        // the dashboard can open from IndexedDB. Only a real auth rejection
        // logs the user out; network failures leave the saved identity in
        // place and the global offline bar explains the state.
        if (!isOfflineError(error)) this.logout();
      } finally {
        this.ready = true;
      }
    },
    logout() {
      this.user = null;
      this.tenant = null;
      localStorage.removeItem('gc.accessToken');
      localStorage.removeItem('gc.refreshToken');
      localStorage.removeItem('gc.user');
      localStorage.removeItem('gc.tenant');
    },
    _persist({ accessToken, refreshToken, user, tenant }) {
      localStorage.setItem('gc.accessToken', accessToken);
      localStorage.setItem('gc.refreshToken', refreshToken);
      localStorage.setItem('gc.user', JSON.stringify(user));
      if (tenant) localStorage.setItem('gc.tenant', JSON.stringify(tenant));
      this.user = user;
      this.tenant = tenant;
    },
  },
});
