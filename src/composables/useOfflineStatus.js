import { computed, onMounted, onUnmounted, ref } from 'vue';
import { listOfflineMutations } from '@/services/offline.store';
import { syncOfflineQueue } from '@/services/offline-sync.service';

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const syncing = ref(false);
const pending = ref(0);
const justSynced = ref(false);
const syncError = ref('');
let listenersInstalled = false;
let clearSuccessTimer = null;

async function refreshPending() {
  pending.value = (await listOfflineMutations()).length;
}

async function syncNow() {
  if (!online.value) return;
  await refreshPending();
  if (!pending.value) {
    justSynced.value = true;
    clearTimeout(clearSuccessTimer);
    clearSuccessTimer = setTimeout(() => { justSynced.value = false; }, 6000);
    return;
  }
  syncing.value = true;
  syncError.value = '';
  try { await syncOfflineQueue(); }
  catch (error) { syncError.value = error?.message || 'Sync could not complete'; }
  finally {
    syncing.value = false;
    await refreshPending();
  }
}

function onOffline() { online.value = false; syncError.value = ''; };
function onOnline() { online.value = true; syncNow(); }
function onQueueChanged() { refreshPending(); }
function onSyncFinished(event) {
  const result = event.detail || {};
  pending.value = result.pending || 0;
  if (result.synced > 0 && result.pending === 0) {
    justSynced.value = true;
    clearTimeout(clearSuccessTimer);
    clearSuccessTimer = setTimeout(() => { justSynced.value = false; }, 6000);
  }
  if (result.failed) syncError.value = 'Some offline changes need another sync attempt.';
}

function installListeners() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline:queue-changed', onQueueChanged);
  window.addEventListener('offline:sync-finished', onSyncFinished);
  refreshPending().then(() => syncNow());
}

function uninstallListeners() {
  // The singleton remains active for the lifetime of the app. Components can
  // mount/unmount while navigating, so listeners intentionally stay global.
}

export function useOfflineStatus() {
  onMounted(installListeners);
  onUnmounted(uninstallListeners);
  return {
    online,
    syncing,
    pending,
    justSynced,
    syncError,
    label: computed(() => {
      if (!online.value) return 'Working offline — changes will sync when internet returns';
      if (syncing.value) return `Syncing ${pending.value} offline change${pending.value === 1 ? '' : 's'}…`;
      if (justSynced.value) return 'Online — synced successfully';
      if (pending.value) return `${pending.value} offline change${pending.value === 1 ? '' : 's'} waiting to sync`;
      return '';
    }),
    syncNow,
  };
}
