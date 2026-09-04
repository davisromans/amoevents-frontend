import http, { unwrap } from '@/services/http';

export const listVariants = (eventId) => http.get(`/events/${eventId}/card-variants`).then(unwrap);
export const variantImageUrlById = (eventId, variantId) =>
  http.get(`/events/${eventId}/card-variants/${variantId}/url`).then((r) => unwrap(r).url);

// Full editable document for the tenant-facing Template Studio (mirrors
// cardTemplates.service.js's adminGet/adminUpdate/adminCreateBlank, scoped
// to this tenant's own event instead of the shared super-admin library).
export const getVariant = (eventId, variantId) =>
  http.get(`/events/${eventId}/card-variants/${variantId}`).then(unwrap);

export const createBlankVariant = (eventId, meta) =>
  http.post(`/events/${eventId}/card-variants/blank`, meta || {}).then(unwrap);

export async function importVariantPsd(eventId, file, meta, { onUploadProgress } = {}) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await http.post(`/events/${eventId}/card-variants/import-psd`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress,
  });
  return unwrap(res);
}

export async function createVariant(eventId, file, meta) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const res = await http.post(`/events/${eventId}/card-variants`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(res);
}

export const updateVariant = (eventId, variantId, patch) =>
  http.patch(`/events/${eventId}/card-variants/${variantId}`, patch).then(unwrap);

export const deleteVariant = (eventId, variantId) =>
  http.delete(`/events/${eventId}/card-variants/${variantId}`).then(unwrap);

// Fetch preview as blob → object URL for <img>. Grid thumbnails default to
// 400px JPEG (~40-60 KB) — matches the actual displayed size in the 2/3/4
// column grid. Full-res PNGs are only fetched by the explicit download
// button. Undersize is fine because Tanzania ⇄ origin is ~360ms RTT and
// every extra KB costs.
// bust=<n> = cache-buster (pass Date.now() after any layout change).
export async function fetchPreviewUrl(eventId, guestId, { bust, w = 400, stamp = false } = {}) {
  const params = { w };
  if (bust) params._r = bust;
  if (stamp) params.stamp = 1;
  const res = await http.get(`/events/${eventId}/card-variants/preview/${guestId}`, {
    responseType: 'blob',
    params,
    timeout: 45000,
  });
  return URL.createObjectURL(res.data);
}

// Map of guestId → true|false (has own artwork or matching variant).
export const cardCoverage = (eventId) =>
  http.get(`/events/${eventId}/card-variants/coverage`).then(unwrap);

export async function downloadGuestCardPng(eventId, guestId, filename) {
  // Print-quality but slim: 1600px JPEG (~250-400 KB) instead of the full
  // 2 MB+ PNG that used to abort on slow mobile links. Filename kept as
  // .jpg to match the format.
  const res = await http.get(`/events/${eventId}/card-variants/preview/${guestId}`, {
    responseType: 'blob',
    // stamp=1: bake the QR into the downloaded card (thumbnails never do this).
    params: { w: 1600, stamp: 1 },
    timeout: 90000,
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = (filename || `card-${guestId}`).replace(/\.png$/i, '') + '.jpg';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** Get a signed URL for a variant image (works in <img src>). */
export async function variantImageUrl(eventId, variantId) {
  const res = await http.get(`/events/${eventId}/card-variants/${variantId}/url`);
  return unwrap(res).url;
}

// Download PDF — POST with guestIds (empty = all). Long timeout because the
// first render of each guest is CPU-bound on the 1-vCPU box; subsequent PDFs
// hit the on-disk render cache and finish in a second or two.
export async function downloadPdf(eventId, guestIds = []) {
  const res = await http.post(`/events/${eventId}/card-variants/export/pdf`,
    { guestIds }, { responseType: 'blob', timeout: 180000 });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cards-${eventId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
