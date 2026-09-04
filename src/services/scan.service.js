import http, { unwrap } from '@/services/http';

export async function submitScan(qrPayload, expectedEventId) {
  const res = await http.post('/scan', { qrPayload, expectedEventId });
  return unwrap(res);
}

/**
 * Send a raw frame (Blob/File) to the backend for decoding.
 * Backend returns 200 with a full scan result when a code is decoded,
 * or 204 when nothing was found (client should try the next frame).
 */
export async function submitScanImage(blob, expectedEventId) {
  const form = new FormData();
  form.append('image', blob, 'frame.jpg');
  if (expectedEventId) form.append('expectedEventId', expectedEventId);
  const res = await http.post('/scan/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
  });
  if (res.status === 204) return null;
  return unwrap(res);
}

export async function manualEntry(eventId, guestId, reason) {
  const res = await http.post(`/events/${eventId}/scan/manual`, { guestId, reason });
  return unwrap(res);
}

export async function searchGuestsAtGate(eventId, q) {
  const res = await http.get(`/events/${eventId}/scan/search`, { params: { q } });
  return unwrap(res);
}

export async function recentScans(eventId) {
  const res = await http.get(`/events/${eventId}/scan/recent`);
  return unwrap(res);
}

export async function undoScan(eventId, scanId) {
  const res = await http.delete(`/events/${eventId}/scan/${scanId}`);
  return unwrap(res);
}
