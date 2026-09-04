import { ref, computed, onMounted } from 'vue';

const DEFERRED_EVENT_KEY = Symbol('deferredInstallPromptEvent');
const state = {
  event: ref(null),
  installed: ref(false),
  dismissedAt: ref(Number(localStorage.getItem('gc.installDismissedAt') || 0)),
};

// One-time setup — catch the event Chrome/Edge fires before install.
if (typeof window !== 'undefined' && !window[DEFERRED_EVENT_KEY]) {
  window[DEFERRED_EVENT_KEY] = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.event.value = e;
  });
  window.addEventListener('appinstalled', () => {
    state.installed.value = true;
    state.event.value = null;
  });
}

export function useInstallPrompt() {
  const isStandalone = computed(() =>
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator?.standalone === true
  );

  const isIOS = computed(() =>
    /iPad|iPhone|iPod/i.test(navigator.userAgent) && !window.MSStream
  );

  // Chrome on iOS uses CriOS in the UA and puts the share button at the top-right.
  const isIOSChrome = computed(() => isIOS.value && /CriOS/i.test(navigator.userAgent));

  const isAndroid = computed(() => /Android/i.test(navigator.userAgent));

  const canPromptNative = computed(() => !!state.event.value);

  // Show banner if: not installed, not standalone, event available OR iOS, and not dismissed in the last 7 days.
  const shouldPrompt = computed(() => {
    if (isStandalone.value || state.installed.value) return false;
    const day = 24 * 3600 * 1000;
    if (state.dismissedAt.value && Date.now() - state.dismissedAt.value < 7 * day) return false;
    return canPromptNative.value || isIOS.value;
  });

  async function install() {
    if (!state.event.value) return { ok: false, reason: 'no-event' };
    state.event.value.prompt();
    const { outcome } = await state.event.value.userChoice;
    state.event.value = null;
    if (outcome === 'accepted') state.installed.value = true;
    return { ok: outcome === 'accepted' };
  }

  function dismiss() {
    state.dismissedAt.value = Date.now();
    localStorage.setItem('gc.installDismissedAt', String(state.dismissedAt.value));
  }

  return { shouldPrompt, canPromptNative, isIOS, isIOSChrome, isAndroid, isStandalone, install, dismiss };
}
