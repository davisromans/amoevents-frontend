import http, { unwrap } from '@/services/http';
import {
  enqueueOfflineMutation, listOfflineMutations, removeOfflineMutation,
  updateOfflineMutation,
} from '@/services/offline.store';

let syncing = null;

export async function queueHttpMutation({ method, url, data, tempId, kind = 'http' }) {
  const generatedId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return enqueueOfflineMutation({
    method: method.toLowerCase(), url, data, tempId, kind,
    mutationId: generatedId,
  });
}

function rewriteTempIds(value, idMap) {
  if (typeof value === 'string') return idMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => rewriteTempIds(item, idMap));
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, rewriteTempIds(item, idMap)]),
  );
  return value;
}

function replaceUrlIds(url, idMap) {
  let result = url;
  for (const [from, to] of idMap.entries()) result = result.replaceAll(from, to);
  return result;
}

async function sendMutation(record, idMap) {
  const url = replaceUrlIds(record.url, idMap);
  const data = rewriteTempIds(record.data, idMap);
  const response = await http.request({
    method: record.method,
    url,
    data,
    headers: { 'X-Offline-Mutation-Id': record.mutationId },
    _offlineSync: true,
  });
  const result = unwrap(response);
  if (record.tempId && result?._id) idMap.set(record.tempId, String(result._id));
  return result;
}

export async function syncOfflineQueue() {
  if (syncing) return syncing;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, pending: 0 };
  syncing = (async () => {
    const records = await listOfflineMutations();
    const idMap = new Map();
    let synced = 0;
    let failed = 0;
    for (const record of records) {
      try {
        await sendMutation(record, idMap);
        await removeOfflineMutation(record.id);
        synced += 1;
      } catch (error) {
        failed += 1;
        await updateOfflineMutation(record.id, {
          attempts: (record.attempts || 0) + 1,
          lastError: error?.response?.data?.error?.message || error?.message || 'Sync failed',
          lastAttemptAt: Date.now(),
        });
        // A network failure means later records will fail too. Leave the
        // queue intact and retry when the browser reports connectivity.
        if (!error?.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') break;
      }
    }
    const pending = (await listOfflineMutations()).length;
    const detail = { synced, failed, pending };
    window.dispatchEvent(new CustomEvent('offline:sync-finished', { detail }));
    return detail;
  })().finally(() => { syncing = null; });
  return syncing;
}
