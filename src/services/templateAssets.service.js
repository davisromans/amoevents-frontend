import http, { unwrap } from '@/services/http';
import { getOfflineMedia, putOfflineMedia } from '@/services/offline.store';

const cache = new Map();
const objectUrls = new Map();

function offlineAssetKey(assetId) {
  return `template-asset:${assetId}`;
}

async function cachedObjectUrl(assetId) {
  if (objectUrls.has(assetId)) return objectUrls.get(assetId);
  const blob = await getOfflineMedia(offlineAssetKey(assetId));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(assetId, url);
  return url;
}

export async function cacheLocalTemplateAsset(assetId, blob) {
  if (!assetId || !blob) return null;
  await putOfflineMedia(offlineAssetKey(assetId), blob);
  const old = objectUrls.get(assetId);
  if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(blob);
  objectUrls.set(assetId, url);
  cache.set(assetId, url);
  return url;
}

export function getCachedTemplateAssetBlob(assetId) {
  return getOfflineMedia(offlineAssetKey(assetId));
}

// Resolves an Asset _id to a loadable image URL, memoized for the life of
// the page — a document can reference the same asset from several layers
// (e.g. a repeated background texture) and canvasEngine.loadDocument calls
// this once per image layer, not once per unique asset.
export async function resolveAssetUrl(assetId) {
  if (!assetId) return null;
  if (cache.has(assetId)) return cache.get(assetId);
  if (String(assetId).startsWith('local:') || navigator.onLine === false) {
    const localUrl = await cachedObjectUrl(assetId);
    if (localUrl) {
      cache.set(assetId, localUrl);
      return localUrl;
    }
    if (String(assetId).startsWith('local:')) return null;
  }
  try {
    const asset = await http.get(`/admin/template-assets/${assetId}`).then(unwrap);
    // Signed URLs expire. Download once, cache by the stable Asset id, and
    // render from the same Blob URL. When CORS prevents a direct fetch we
    // still fall back to the provider URL and the service worker cache.
    try {
      const response = await fetch(asset.url);
      if (response.ok) {
        const blob = await response.blob();
        await putOfflineMedia(offlineAssetKey(assetId), blob);
        const localUrl = URL.createObjectURL(blob);
        objectUrls.set(assetId, localUrl);
        cache.set(assetId, localUrl);
        return localUrl;
      }
    } catch { /* use the signed URL below */ }
    cache.set(assetId, asset.url);
    return asset.url;
  } catch (err) {
    const localUrl = await cachedObjectUrl(assetId);
    if (localUrl) {
      cache.set(assetId, localUrl);
      return localUrl;
    }
    throw err;
  }
}

// Batch 20 — shared/reusable assets.
export const listSharedAssets = () => http.get('/admin/template-assets', { params: { shared: true } }).then(unwrap);

export async function uploadAsset(file, { name, shared } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  if (shared) form.append('shared', 'true');
  const res = await http.post('/admin/template-assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return unwrap(res);
}

export const setAssetShared = (id, shared, name) => http.patch(`/admin/template-assets/${id}`, { shared, ...(name !== undefined && { name }) }).then(unwrap);

export async function replaceAsset(id, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post(`/admin/template-assets/${id}/replace`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  cache.delete(id); // next resolveAssetUrl() call must re-fetch the new URL
  return unwrap(res);
}
