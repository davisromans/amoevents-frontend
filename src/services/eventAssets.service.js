import http, { unwrap } from '@/services/http';

export async function listAssets(eventId) {
  return unwrap(await http.get(`/events/${eventId}/assets`));
}
export async function uploadAsset(eventId, file, slug, label) {
  const fd = new FormData();
  fd.append('file', file);
  if (slug) fd.append('slug', slug);
  if (label) fd.append('label', label);
  return unwrap(await http.post(`/events/${eventId}/assets`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
}
export async function deleteAsset(eventId, id) {
  return unwrap(await http.delete(`/events/${eventId}/assets/${id}`));
}
export async function setCoverAsset(eventId, id) {
  return unwrap(await http.post(`/events/${eventId}/assets/${id}/set-cover`));
}
