import { ref, onMounted } from 'vue';

/**
 * Version-based update detection.
 * Everything hinges on /version.json (emitted at build time). The workbox
 * `onNeedRefresh` path was firing false-positives on every SW activation and
 * causing the banner to loop even after Update, so it's gone.
 *
 * Guarantees:
 *  - We only show the banner if the fetched version has stayed different
 *    across two consecutive polls (kills any single-request race).
 *  - Once the user hits Update, we stamp the target version in localStorage;
 *    if the reload ends up on the SAME version, we do not show it again.
 *  - After a successful reload onto a new version, we clear the stamp.
 */

const needRefresh = ref(false);

let loadedVersion = null;
let candidateVersion = null;
let pollTimer = null;
let focusHooked = false;

const APPLIED_KEY = 'gc.updateTargetVersion';

async function fetchVersion() {
  try {
    const r = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.version || null;
  } catch { return null; }
}

async function checkVersion() {
  const v = await fetchVersion();
  if (!v || !loadedVersion) return;
  if (v === loadedVersion) {
    candidateVersion = null;
    needRefresh.value = false;
    return;
  }
  // If the user already hit Update for this exact version and we're back here,
  // the reload landed on the same bundle — do NOT nag again.
  if (localStorage.getItem(APPLIED_KEY) === v) return;

  if (candidateVersion === v) {
    // Confirmed on two consecutive polls → surface the banner.
    needRefresh.value = true;
  } else {
    candidateVersion = v;
  }
}

export async function applyUpdate() {
  if (candidateVersion) {
    try { localStorage.setItem(APPLIED_KEY, candidateVersion); } catch {}
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
  } catch {}
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  window.location.reload();
}

export function useAppUpdate() {
  onMounted(async () => {
    if (!loadedVersion) loadedVersion = await fetchVersion();
    // Clear the "we just updated to X" stamp if the reload landed on X (or newer).
    try {
      const stamped = localStorage.getItem(APPLIED_KEY);
      if (stamped && loadedVersion && stamped === loadedVersion) {
        localStorage.removeItem(APPLIED_KEY);
      }
    } catch {}

    if (!pollTimer) pollTimer = setInterval(checkVersion, 60_000);
    if (!focusHooked) {
      focusHooked = true;
      const onFocus = () => { if (!document.hidden) checkVersion(); };
      document.addEventListener('visibilitychange', onFocus);
      window.addEventListener('focus', onFocus);
    }
  });
  return { needRefresh, applyUpdate };
}
