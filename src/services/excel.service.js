import http, { unwrap } from '@/services/http';

export async function previewExcel(eventId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post(`/events/${eventId}/excel/preview`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(res);
}

export async function applyExcel(eventId, filePath, removeMissing) {
  const res = await http.post(`/events/${eventId}/excel/apply`, { filePath, removeMissing });
  return unwrap(res);
}

export async function discardExcel(eventId, filePath) {
  const res = await http.delete(`/events/${eventId}/excel/discard`, { data: { filePath } });
  return unwrap(res);
}
