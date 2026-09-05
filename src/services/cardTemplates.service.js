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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
const CHUNK_CONCURRENCY = 3;

// Batch 3 — PSD import, uploaded in small chunks instead of one giant
// multipart POST. Two problems this fixes at once:
//   1. A single 70MB+ request can get killed by a proxy timeout partway
//      through (Cloudflare, nginx) no matter what client-side timeout is
//      set — each chunk here finishes in seconds regardless of total size.
//   2. A single long-lived TCP stream to the direct-to-origin upload host
//      (bypassing Cloudflare) measured as low as ~90KB/s on some
//      connections, vs ~1MB/s+ through the normal Cloudflare-proxied path
//      — Cloudflare's edge network is usually the FASTER route for the
//      client's leg of the trip (closer PoP, optimized backbone to
//      origin), especially from a region far from the origin server. So
//      this goes back through the normal proxied /api host, and a few
//      chunks in flight at once helps throughput further on high-latency
//      links (each small request's TCP+TLS setup overlaps instead of
//      serializing behind one huge sequential transfer).
// The backend assembles the chunks back into one file and runs the exact
// same background parse job as before — polling is unchanged.
export async function adminImportPsd(file, meta, { onUploadProgress, onStage } = {}) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const { uploadId } = await http.post('/admin/card-templates/import-psd/init', { fileName: file.name }).then(unwrap);

  const loadedByChunk = new Array(totalChunks).fill(0);
  const reportProgress = () => {
    const loaded = loadedByChunk.reduce((a, b) => a + b, 0);
    onUploadProgress?.({ loaded, total: file.size });
  };

  async function uploadChunk(index) {
    const start = index * CHUNK_SIZE;
    const blob = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const form = new FormData();
    form.append('chunk', blob);
    form.append('uploadId', uploadId);
    form.append('index', String(index));
    await http.post('/admin/card-templates/import-psd/chunk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000, // the shared http client's default (20s) assumes small JSON bodies, not an 8MB chunk on a slow link
      onUploadProgress: (evt) => { loadedByChunk[index] = evt.loaded; reportProgress(); },
    });
  }

  // A small fixed-size worker pool rather than Promise.all(all chunks) —
  // uploading all of them at once would just recreate one big burst
  // (and could overwhelm a weak connection); a pool of a few keeps several
  // requests overlapping without flooding it.
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= totalChunks) return;
      await uploadChunk(index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, totalChunks) }, worker));

  const { jobId } = await http.post('/admin/card-templates/import-psd/complete', {
    uploadId, totalChunks, fileName: file.name,
    name: meta?.name, category: meta?.category, sortOrder: meta?.sortOrder,
  }).then(unwrap);

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
