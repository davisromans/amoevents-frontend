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
  const { data } = await http.post(`/messages/${jobId}/retry-failed`, { guestIds });
  return data?.data || data;
}
export async function resendFromJob(jobId, logIds) {
  const res = await http.post(`/messages/${jobId}/resend`, { logIds });
  return unwrap(res);
}
export async function markDeliveryInvited(jobId, payload) {
  const res = await http.post(`/messages/${jobId}/mark-invited`, payload);
  return unwrap(res);
}
export async function exportFailedDeliveries(jobId, logIds = []) {
  try {
    const res = await http.post(
      `/messages/${jobId}/export-failed`,
      { logIds },
      { responseType: 'blob', timeout: 120000 },
    );
    const disposition = String(res.headers?.['content-disposition'] || '');
    const match = disposition.match(/filename="?([^";]+)"?/i);
    return {
      blob: res.data,
      filename: match?.[1] || `failed-deliveries-${jobId}.xlsx`,
      count: Number(res.headers?.['x-amoevents-export-count'] || 0),
    };
  } catch (err) {
    // Axios returns JSON errors as a Blob when responseType is blob. Decode
    // it so the delivery drawer shows the backend reason instead of a generic
    // HTTP status message.
    if (err.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()); } catch (_) { /* keep original */ }
    }
    throw err;
  }
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

export async function listInbox(eventId, q = '', filters = {}) {
  const res = await http.get(`/events/${eventId}/inbox`, { params: { ...(q ? { q } : {}), ...filters } });
  return unwrap(res);
}
export async function inboxConversation(eventId, conversationId) {
  const res = await http.get(`/events/${eventId}/inbox/${conversationId}/messages`);
  return unwrap(res);
}
export async function markInboxRead(eventId, conversationId) {
  const res = await http.post(`/events/${eventId}/inbox/${conversationId}/read`);
  return unwrap(res);
}
export async function replyToInbox(eventId, conversationId, text) {
  const res = await http.post(`/events/${eventId}/inbox/${conversationId}/reply`, { text });
  return unwrap(res);
}
export async function replyToInboxTemplate(eventId, conversationId, payload) {
  const res = await http.post(`/events/${eventId}/inbox/${conversationId}/reply-template`, payload);
  return unwrap(res);
}
