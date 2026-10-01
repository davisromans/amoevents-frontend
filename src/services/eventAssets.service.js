import http, { unwrap } from '@/services/http';

export async function listAssets(eventId) {
  return unwrap(await http.get(`/events/${eventId}/assets`));
}
export async function uploadAsset(eventId, file, slug, label) {
  const fd = new FormData();
  fd.append('file', file);
  if (slug) fd.append('slug', slug);
  if (label) fd.append('label', label);
  // Image processing and remote CDN storage can take longer than the normal
  // 20-second API timeout, especially through Cloudflare on mobile networks.
  // Keep the longer timeout local to this upload instead of slowing every API
  // request in the dashboard.
  return unwrap(await http.post(`/events/${eventId}/assets`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  }));
}
export async function deleteAsset(eventId, id) {
  return unwrap(await http.delete(`/events/${eventId}/assets/${id}`));
}
export async function setCoverAsset(eventId, id) {
  return unwrap(await http.post(`/events/${eventId}/assets/${id}/set-cover`));
}
