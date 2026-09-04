import http, { unwrap } from '@/services/http';

export async function togglePayment(eventId, payload) {
  const res = await http.post(`/events/${eventId}/payment`, payload);
  return unwrap(res);
}
