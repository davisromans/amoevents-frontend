import http, { unwrap } from '@/services/http';

export async function startMessageJob(eventId, payload) {
  const res = await http.post(`/events/${eventId}/messages`, payload);
  return unwrap(res);
}
export async function previewMessageCost(eventId, payload) {
  const res = await http.post(`/events/${eventId}/messages/preview-cost`, payload);
  return unwrap(res);
}
export async function listMessageJobs(eventId) {
  const res = await http.get(`/events/${eventId}/messages`);
  return unwrap(res);
}
export async function sendTestMessage(eventId, payload) {
  const res = await http.post(`/events/${eventId}/messages/test`, payload);
  return unwrap(res);
}
export async function jobLogs(jobId) {
  const res = await http.get(`/messages/${jobId}/logs`);
  return unwrap(res);
}
export async function guestMessageHistory(eventId, guestId) {
  const res = await http.get(`/events/${eventId}/guests/${guestId}/messages`);
  return unwrap(res);
}
export async function retryFailedFromJob(jobId, guestIds = []) {
  const { data } = await http.post(`/messaging/jobs/${jobId}/retry-failed`, { guestIds });
  return data?.data || data;
}

export async function cancelJob(jobId) {
  const res = await http.post(`/messages/${jobId}/cancel`);
  return unwrap(res);
}

// WhatsApp availability
export async function checkGuestWa(eventId, guestId, force = false) {
  const res = await http.post(`/events/${eventId}/wa-check/${guestId}`, { force });
  return unwrap(res);
}
export async function checkAllWa(eventId, force = false) {
  // Backend checks every guest sequentially (Meta rate-limit pacing, 250ms
  // between calls) — for large guest lists that easily exceeds the global
  // 20s axios timeout. No row count known client-side, so give it a large
  // flat allowance instead.
  const res = await http.post(`/events/${eventId}/wa-check/all`, { force }, { timeout: 180000 });
  return unwrap(res);
}
