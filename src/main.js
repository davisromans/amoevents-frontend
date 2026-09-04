import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import './assets/styles/main.css';

// --------------------------------------------------------------------
// Boot sequence — everything that must be true BEFORE the router evaluates
// its first navigation guard has to happen here, not in App.vue's onMounted
// (which fires after the first guard, so a token that only lands there
// races against the /login redirect — that was the "Continue with Google
// doesn't sign me in" bug).
// --------------------------------------------------------------------

// 1. Google OAuth returns us to `/app#access=...&refresh=...`. Extract those
//    into localStorage BEFORE Pinia even boots, then scrub the hash so the
//    tokens never leak via History/Referer.
if (typeof window !== 'undefined' && window.location.hash?.startsWith('#access=')) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const at = params.get('access');
  const rt = params.get('refresh');
  if (at) localStorage.setItem('gc.accessToken', at);
  if (rt) localStorage.setItem('gc.refreshToken', rt);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);

// 2. If a token exists, hydrate the auth store BEFORE the first navigation
//    resolves — otherwise the /app guard sees `isAuthed=false` and bounces
//    to /login. Import order matters: the store must exist after Pinia is
//    installed above.
async function boot() {
  const { useAuthStore } = await import('./stores/auth');
  const auth = useAuthStore();
  if (localStorage.getItem('gc.accessToken')) {
    // Best-effort — if /auth/me fails (token expired / server hiccup) the
    // store logs out on its own inside fetchMe, so the guard will still
    // redirect to /login cleanly.
    try { await auth.fetchMe(); } catch (_) { /* handled inside */ }
  } else {
    auth.ready = true;
  }
  await router.isReady();
  app.mount('#app');
}
boot();
