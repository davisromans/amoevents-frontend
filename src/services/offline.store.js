/*
 * Small IndexedDB layer for the web app's offline mode.
 *
 * Data is scoped to the signed-in AmoEvents user so a shared computer cannot
 * accidentally display another organiser's cached event data after logout.
 */
const DB_NAME = 'amoevents-offline-v1';
const DB_VERSION = 1;
const CACHE_STORE = 'api-cache';
const SNAPSHOT_STORE = 'guest-snapshots';
const MUTATION_STORE = 'mutations';

let dbPromise;

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE);
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        const store = db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open offline database'));
  });
  return dbPromise;
}

function userScope() {
  try {
    const user = JSON.parse(localStorage.getItem('gc.user') || 'null');
    return String(user?._id || user?.id || user?.email || 'anonymous');
  } catch (_) {
    return 'anonymous';
  }
}

function request(storeName, mode, operation) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try { result = operation(store); } catch (err) { reject(err); return; }
    if (result && typeof result.onsuccess !== 'undefined') {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error || new Error('Offline database request failed'));
    } else {
      tx.oncomplete = () => resolve(result);
    }
    tx.onerror = () => reject(tx.error || new Error('Offline database transaction failed'));
  }));
}

export function makeApiCacheKey(configOrUrl, params = {}) {
  const config = typeof configOrUrl === 'string' ? { url: configOrUrl, params } : configOrUrl;
  const base = typeof location !== 'undefined' ? location.origin : 'https://events.amoview.com';
  const raw = `${config.baseURL || '/api'}${config.url || ''}`;
  const url = new URL(raw, base);
  const search = new URLSearchParams(url.search);
  const sourceParams = config.params || {};
  Object.entries(sourceParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  [...search.keys()].sort().forEach((key) => {
    const value = search.get(key);
    search.delete(key);
    search.set(key, value);
  });
  url.search = search.toString();
  return `${userScope()}|${url.pathname}${url.search}`;
}

export async function getApiCache(key) {
  try { return await request(CACHE_STORE, 'readonly', (store) => store.get(key)); }
  catch (_) { return null; }
}

export async function putApiCache(key, data) {
  try {
    await request(CACHE_STORE, 'readwrite', (store) => store.put({ data, cachedAt: Date.now() }, key));
  } catch (_) { /* private browsing / quota errors must not break the app */ }
}

export async function getGuestSnapshot(eventId) {
  try { return await request(SNAPSHOT_STORE, 'readonly', (store) => store.get(`${userScope()}|${eventId}`)); }
  catch (_) { return null; }
}

export async function putGuestSnapshot(eventId, snapshot) {
  try {
    await request(SNAPSHOT_STORE, 'readwrite', (store) => store.put({
      ...snapshot,
      eventId: String(eventId),
      cachedAt: Date.now(),
      scope: userScope(),
    }, `${userScope()}|${eventId}`));
  } catch (_) { /* cache is best effort */ }
}

export async function enqueueOfflineMutation(mutation) {
  const generatedId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const record = {
    ...mutation,
    id: mutation.id || generatedId,
    createdAt: mutation.createdAt || Date.now(),
    scope: userScope(),
    attempts: mutation.attempts || 0,
  };
  await request(MUTATION_STORE, 'readwrite', (store) => store.put(record));
  window.dispatchEvent(new CustomEvent('offline:queue-changed'));
  return record;
}

export async function listOfflineMutations() {
  try {
    const all = await request(MUTATION_STORE, 'readonly', (store) => store.getAll());
    return (all || []).filter((item) => item.scope === userScope()).sort((a, b) => a.createdAt - b.createdAt);
  } catch (_) { return []; }
}

export async function removeOfflineMutation(id) {
  try { await request(MUTATION_STORE, 'readwrite', (store) => store.delete(id)); }
  catch (_) { /* leave it for the next sync attempt */ }
}

export async function updateOfflineMutation(id, patch) {
  try {
    const current = await request(MUTATION_STORE, 'readonly', (store) => store.get(id));
    if (current) await request(MUTATION_STORE, 'readwrite', (store) => store.put({ ...current, ...patch }));
  } catch (_) { /* best effort */ }
}

export function isOfflineError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return !error?.response && ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code);
}
