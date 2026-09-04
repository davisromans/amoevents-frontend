import http, { unwrap } from '@/services/http';

const cache = new Map();

// Resolves an Asset _id to a loadable image URL, memoized for the life of
// the page — a document can reference the same asset from several layers
// (e.g. a repeated background texture) and canvasEngine.loadDocument calls
// this once per image layer, not once per unique asset.
export async function resolveAssetUrl(assetId) {
  if (!assetId) return null;
  if (cache.has(assetId)) return cache.get(assetId);
  const asset = await http.get(`/admin/template-assets/${assetId}`).then(unwrap);
  cache.set(assetId, asset.url);
  return asset.url;
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
