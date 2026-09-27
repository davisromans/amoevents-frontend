import http, { unwrap } from '@/services/http';

export async function bulkUploadCards(eventId, files, onProgress) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const res = await http.post(`/events/${eventId}/cards/bulk`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
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
