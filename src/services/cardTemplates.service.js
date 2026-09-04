import axios from 'axios';
import http, { unwrap } from '@/services/http';

// Direct-to-origin upload — bypasses Cloudflare's proxy AND the main
// nginx vhost's 120s proxy_read_timeout, same as gallery.service.js does
// for large videos. A 70MB+ PSD can take past 120s just to transfer on a
// slow connection, which used to 524 regardless of how fast the backend
// itself responded once the body arrived — this route has no such cap.
const uploadHttp = axios.create({
  baseURL: 'https://upload.events.amoview.com/api',
  timeout: 10 * 60 * 1000,
});
uploadHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('gc.accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Batch 3 — PSD import. The upload request now only has to get the file to
// disk — the backend responds with a job id right away and parses the PSD
// in the background, so this polls for completion instead of holding one
// long request open. That's the fix for large (50-100MB+) PSDs: parsing can
// take well past Cloudflare's 120-second proxy timeout, which used to kill
// the request outright (a 524) no matter what timeout the client set here.
export async function adminImportPsd(file, meta, { onUploadProgress, onStage } = {}) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await uploadHttp.post('/admin/card-templates/import-psd', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  const { jobId } = unwrap(res);

  // Poll until the background job finishes — no fixed cap, since a huge PSD
  // legitimately takes minutes to parse and there's no proxy timeout to
  // race here (each poll is a tiny, fast request of its own).
  for (;;) {
    await sleep(1500);
    const job = await http.get(`/admin/card-templates/import-psd/${jobId}`).then(unwrap);
    if (job.stage) onStage?.(job.stage);
    if (job.status === 'completed') return { ...job.template, fontMatch: job.fontMatch };
    if (job.status === 'failed') throw new Error(job.error || 'PSD import failed');
  }
}

// Fetch one template with its full editable document.
export const adminGet = (id) => http.get(`/admin/card-templates/${id}`).then(unwrap);

// Starts a brand-new template on an empty canvas — no PSD/clone required.
export const adminCreateBlank = (meta) => http.post('/admin/card-templates/blank', meta || {}).then(unwrap);
