import http, { unwrap } from '@/services/http';

// Tenant-facing: browse and clone
export const listTemplates = (category) =>
  http.get('/card-templates', { params: category ? { category } : {} }).then(unwrap);

export const cloneTemplate = (templateId, eventId, opts = {}) =>
  http.post(`/card-templates/${templateId}/clone/${eventId}`, opts).then(unwrap);

// Super-admin CRUD
export const adminList = () => http.get('/admin/card-templates').then(unwrap);
export const adminUpdate = (id, patch) => http.patch(`/admin/card-templates/${id}`, patch).then(unwrap);
export const adminDelete = (id) => http.delete(`/admin/card-templates/${id}`).then(unwrap);

export async function adminUpload(file, meta) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await http.post('/admin/card-templates', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(res);
}

// Batch 3 — PSD import. Same shape as adminUpload but hits the dedicated
// endpoint that parses the PSD into an editable layer-tree document
// instead of just storing a flat image.
export async function adminImportPsd(file, meta, { onUploadProgress } = {}) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await http.post('/admin/card-templates/import-psd', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // large PSDs with many high-res layers can take a while to parse
    onUploadProgress,
  });
  return unwrap(res);
}

// Fetch one template with its full editable document.
export const adminGet = (id) => http.get(`/admin/card-templates/${id}`).then(unwrap);

// Starts a brand-new template on an empty canvas — no PSD/clone required.
export const adminCreateBlank = (meta) => http.post('/admin/card-templates/blank', meta || {}).then(unwrap);
