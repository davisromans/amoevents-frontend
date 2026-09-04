import http from './http';

export async function parseImportFile(eventId, file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post(`/events/${eventId}/smart-import/parse`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data || data;
}

export async function getSavedLayout(eventId) {
  const { data } = await http.get(`/events/${eventId}/smart-import/layout`);
  return (data?.data || data)?.layout || null;
}

export async function commitImport(eventId, rows, { saveLayout, allowNoPhone } = {}) {
  // Large sheets (100+ rows) each do a DB lookup + QR render + CDN upload
  // server-side — well past the global 20s axios timeout. Give this call
  // room proportional to the row count.
  const timeout = Math.max(30000, rows.length * 800);
  const { data } = await http.post(`/events/${eventId}/smart-import/commit`, {
    rows, saveLayout, allowNoPhone,
  }, { timeout });
  return data?.data || data;
}
