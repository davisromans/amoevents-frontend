import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/', component: () => import('@/pages/public/LandingView.vue'), meta: { public: true } },
  { path: '/pricing', component: () => import('@/pages/public/PricingView.vue'), meta: { public: true } },
  { path: '/features', component: () => import('@/pages/public/FeaturesView.vue'), meta: { public: true } },
  { path: '/use-cases', component: () => import('@/pages/public/UseCasesView.vue'), meta: { public: true } },
  { path: '/about', component: () => import('@/pages/public/AboutView.vue'), meta: { public: true } },
  { path: '/g/:token', component: () => import('@/pages/public/GuestSelfServiceView.vue'), meta: { public: true } },
  { path: '/gallery/:token', component: () => import('@/pages/public/PublicGalleryView.vue'), meta: { public: true } },
  { path: '/login', component: () => import('@/pages/auth/LoginView.vue'), meta: { public: true, authPage: true } },
  { path: '/register', component: () => import('@/pages/auth/RegisterView.vue'), meta: { public: true, authPage: true } },
  { path: '/forgot', component: () => import('@/pages/auth/ForgotPasswordView.vue'), meta: { public: true, authPage: true } },

  {
    path: '/app',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/dashboard/OverviewView.vue') },
      { path: 'welcome', component: () => import('@/pages/dashboard/WelcomeView.vue') },
      // Legacy /app/account — everything moved into /app/settings.
      { path: 'account', redirect: '/app/settings' },
      { path: 'reports', component: () => import('@/pages/dashboard/ReportsView.vue') },
      { path: 'events', component: () => import('@/pages/dashboard/EventsListView.vue') },
      { path: 'events/new', component: () => import('@/pages/dashboard/EventFormView.vue') },
      // Guest-portal (invited-side). Any authed user sees their own row.
      { path: 'my-invitations', component: () => import('@/pages/dashboard/MyInvitationsView.vue') },
      // Organiser-side address book — cross-event contribution history.
      { path: 'people', component: () => import('@/pages/dashboard/MyPeopleView.vue') },
      { path: 'my-invitations/link', component: () => import('@/pages/dashboard/LinkByCodeView.vue') },
      { path: 'my-invitations/:id', component: () => import('@/pages/dashboard/MyInvitationView.vue') },
      { path: 'events/:id', component: () => import('@/pages/dashboard/EventDetailView.vue') },
      { path: 'events/:id/edit', component: () => import('@/pages/dashboard/EventFormView.vue') },
      { path: 'events/:id/guests', component: () => import('@/pages/dashboard/GuestsView.vue') },
      { path: 'events/:id/pledges', component: () => import('@/pages/dashboard/PledgesView.vue') },
      { path: 'events/:id/payment', component: () => import('@/pages/dashboard/EventPaymentView.vue') },
      { path: 'events/:id/cards', component: () => import('@/pages/dashboard/CardsView.vue') },
      { path: 'events/:id/cards/variants', component: () => import('@/pages/dashboard/CardVariantsView.vue') },
      { path: 'events/:id/cards/templates', component: () => import('@/pages/dashboard/CardTemplatesPickView.vue') },
      { path: 'events/:id/messaging', component: () => import('@/pages/dashboard/MessagingView.vue') },
      { path: 'events/:id/reminders', component: () => import('@/pages/dashboard/RemindersView.vue') },
      { path: 'events/:id/gallery', component: () => import('@/pages/dashboard/GalleryView.vue') },
      { path: 'events/:id/tags', component: () => import('@/pages/dashboard/TagsView.vue') },
      { path: 'events/:id/collaborators', component: () => import('@/pages/dashboard/CollaboratorsView.vue') },
      { path: 'events/:id/analytics', component: () => import('@/pages/dashboard/AnalyticsView.vue') },
      { path: 'settings', component: () => import('@/pages/dashboard/SettingsView.vue') },
      { path: 'admin/pricing', component: () => import('@/pages/dashboard/admin/AdminPricingView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/event-types', component: () => import('@/pages/dashboard/AdminEventTypesView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/messaging-pricing', component: () => import('@/pages/dashboard/admin/AdminMessagingPricingView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/bundles', component: () => import('@/pages/dashboard/admin/AdminBundlesView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'bundles', component: () => import('@/pages/dashboard/BundlesView.vue') },
      { path: 'templates', component: () => import('@/pages/dashboard/TemplatesLibraryView.vue') },
      { path: 'admin/templates', component: () => import('@/pages/dashboard/admin/AdminTemplatesView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/users', component: () => import('@/pages/dashboard/admin/AdminUsersView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/tenants', component: () => import('@/pages/dashboard/admin/AdminTenantsView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/audit', component: () => import('@/pages/dashboard/admin/AdminAuditView.vue'), meta: { allowedRoles: ['super_admin'] } },
      { path: 'admin/payments', component: () => import('@/pages/dashboard/admin/AdminPaymentsView.vue'), meta: { allowedRoles: ['super_admin'] } },
    ],
  },

  // Standalone, full-page — no dashboard sidebar/topbar chrome, opened in
  // its own tab from the templates library. A design tool needs the whole
  // viewport, the same reason Photopea/Figma don't wrap themselves in a
  // dashboard shell.
  {
    path: '/studio/templates/:id?',
    component: () => import('@/pages/dashboard/admin/TemplateStudioView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['super_admin'], docType: 'template' },
  },
  // Tenant-facing: same editor, editing their own event's CardVariant
  // instead of the shared super-admin CardTemplate library. Any event
  // role that can already manage cards (owner/collaborator) can open it —
  // the backend (variants.routes.js) is the real authority, scoping every
  // read/write to eventId via assertEventAccess.
  {
    path: '/studio/variants/:eventId/:id?',
    component: () => import('@/pages/dashboard/admin/TemplateStudioView.vue'),
    meta: { requiresAuth: true, docType: 'variant' },
  },

  {
    path: '/scanner',
    component: () => import('@/layouts/ScannerLayout.vue'),
    meta: { requiresAuth: true, allowedRoles: ['scanner', 'collaborator', 'owner', 'super_admin'] },
    children: [
      { path: '', component: () => import('@/pages/scanner/ScannerHomeView.vue') },
      { path: ':eventId', component: () => import('@/pages/scanner/ScannerView.vue') },
      { path: ':eventId/tv', component: () => import('@/pages/scanner/LiveArrivalsTvView.vue') },
    ],
  },

  { path: '/:catchAll(.*)', component: () => import('@/pages/public/NotFoundView.vue'), meta: { public: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Belt + suspenders: Vue Router's return { top: 0 } is honored for
  // window scroll on some browsers but ignored when navigation was via a
  // <router-link> inside a nested-scrolling layout. We also imperatively
  // scroll the window in the afterEach hook below.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0, left: 0, behavior: 'instant' };
  },
});

// Global route-change loader: a thin gold bar under the top nav shows
// progress while lazy chunks fetch. Users navigating pages get immediate
// visual feedback (was: "click a tab, nothing happens for a beat").
router.beforeEach((to, _from, next) => {
  window.dispatchEvent(new CustomEvent('app:route-loading', { detail: true }));
  next();
});
router.afterEach(() => {
  window.dispatchEvent(new CustomEvent('app:route-loading', { detail: false }));
  // Imperative scroll — fires after Vue Router's scrollBehavior when nested
  // scrollers ate the reset. `instant` avoids animating a jump.
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
});
// A deploy replaces every hashed asset file. A tab that was already open
// (or a service worker that hasn't updated yet) can end up trying to lazy
// -load a JS chunk that no longer exists — the browser 404s and the router
// just... stops, leaving a dead page with no visible error ("site not
// opening"). Detect that specific failure and force a full reload to the
// same URL so the browser picks up the new asset manifest instead of
// silently giving up. `_reloadedOnce` guards against a boot loop if the
// CDN/origin is genuinely down.
router.onError((error, to) => {
  window.dispatchEvent(new CustomEvent('app:route-loading', { detail: false }));
  const msg = String(error?.message || error || '');
  const isChunkError =
    /Failed to fetch dynamically imported module/.test(msg) ||
    /Loading chunk [^ ]+ failed/.test(msg) ||
    /Importing a module script failed/.test(msg);
  if (!isChunkError) {
    console.error('[router] navigation error:', error);
    return;
  }
  if (window.sessionStorage?.getItem('_router_reloaded_once') === to.fullPath) {
    console.error('[router] chunk error persisted after reload — CDN down?', error);
    return;
  }
  try { window.sessionStorage?.setItem('_router_reloaded_once', to.fullPath); } catch { /* private mode */ }
  window.location.assign(to.fullPath);
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // main.js awaits auth.fetchMe() before router.isReady() specifically so
  // the FIRST navigation (e.g. straight off a Google OAuth redirect,
  // tokens just landed in localStorage) doesn't race a real network
  // call — but this guard also fires on every subsequent navigation
  // during that same window, and Vue Router's initial navigation begins
  // as soon as the router is installed (app.use(router)), which can be
  // before fetchMe() resolves despite the await ordering in main.js.
  // auth.ready flips true only once fetchMe() (or the no-token branch)
  // has actually completed — wait for it here too, so this guard is
  // correct regardless of exactly when it fires relative to boot. Capped
  // so a stuck store can't hang navigation forever.
  if (!auth.ready) {
    const start = Date.now();
    while (!auth.ready && Date.now() - start < 4000) {
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  if (to.meta.requiresAuth && !auth.isAuthed) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.authPage && auth.isAuthed) return { path: '/app/events' };
  if (to.meta.allowedRoles && auth.isAuthed && !to.meta.allowedRoles.includes(auth.role)) {
    return { path: '/app' };
  }
  // Nested route guards (child meta overrides parent when present).
  const matched = to.matched.find((r) => r.meta?.allowedRoles);
  if (matched && auth.isAuthed && !matched.meta.allowedRoles.includes(auth.role)) {
    return { path: '/app' };
  }
  return true;
});

export default router;
