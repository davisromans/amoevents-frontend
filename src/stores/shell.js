import { defineStore } from 'pinia';

// UI state for the app shell — sidebar collapse, current event context,
// palette-ready lookups. Kept out of the auth store so a role change or
// login doesn't reset the user's collapse preference.
export const useShellStore = defineStore('shell', {
  state: () => ({
    sidebarCollapsed: (typeof localStorage !== 'undefined' && localStorage.getItem('ae.sidebar.collapsed') === '1') || false,
    // Loaded lazily by the sidebar the first time it's needed; cached for
    // the session so the switcher opens instantly.
    events: [],
    eventsLoaded: false,
    eventsLoading: false,
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      try { localStorage.setItem('ae.sidebar.collapsed', this.sidebarCollapsed ? '1' : '0'); } catch { /* private mode */ }
    },
    async ensureEvents() {
      if (this.eventsLoaded || this.eventsLoading) return;
      this.eventsLoading = true;
      try {
        const { listEvents } = await import('@/services/events.service');
        const res = await listEvents({ limit: 40 });
        this.events = res.items || [];
        this.eventsLoaded = true;
      } catch { /* fail silently — sidebar keeps the placeholder */ }
      finally { this.eventsLoading = false; }
    },
    // Called after creating / editing / deleting an event so the switcher
    // reflects the change without needing a hard reload.
    invalidateEvents() { this.eventsLoaded = false; },
  },
});
