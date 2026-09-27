import http, { unwrap } from '@/services/http';

// opts.onDuplicate: 'replace' (default — overwrite an existing card) |
// 'skip' (leave the guest's current card untouched, drop the new file).
export async function bulkUploadCards(eventId, files, opts = {}) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  if (opts.onDuplicate) form.append('onDuplicate', opts.onDuplicate);
  // One file per request now (CardsView batches at the call site), so a
  // flat generous timeout is enough — no need to scale by count anymore.
  const res = await http.post(`/events/${eventId}/cards/bulk`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: opts.onProgress,
    timeout: 45000,
  });
  return unwrap(res);
}

export async function assignStagedCard(eventId, stagedPath, guestId) {
  const res = await http.post(`/events/${eventId}/cards/assign`, { stagedPath, guestId });
  return unwrap(res);
}

export async function discardStagedCard(eventId, stagedPath) {
  const res = await http.delete(`/events/${eventId}/cards/staged`, { data: { stagedPath } });
  return unwrap(res);
}

export async function removeGuestCard(eventId, guestId) {
  const res = await http.delete(`/events/${eventId}/cards/${guestId}`);
  return unwrap(res);
}

export async function getCardUrl(eventId, guestId) {
  const res = await http.get(`/events/${eventId}/cards/${guestId}/url`);
  return unwrap(res);
}

export async function listCards(eventId, search = '') {
  const res = await http.get(`/events/${eventId}/cards`, { params: search ? { search } : {} });
  return unwrap(res);
}

// Streams the raw uploaded card artwork as a download. Uses fetch+blob so
// the browser saves via a synthetic <a> click — the same trick the PDF
// download uses in cardVariants.service.
export async function downloadCard(eventId, guestId, filename) {
  const res = await http.get(`/events/${eventId}/cards/${guestId}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${guestId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
