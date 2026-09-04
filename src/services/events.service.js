import http, { unwrap } from '@/services/http';

export async function listEvents(params = {}) {
  const res = await http.get('/events', { params });
  return { items: unwrap(res), meta: res.data.meta };
}

export async function getEvent(id) {
  const res = await http.get(`/events/${id}`);
  return unwrap(res);
}

export async function createEvent(payload) {
  const res = await http.post('/events', payload);
  return unwrap(res);
}

export async function updateEvent(id, patch) {
  const res = await http.patch(`/events/${id}`, patch);
  return unwrap(res);
}

export async function archiveEvent(id) {
  const res = await http.post(`/events/${id}/archive`);
  return unwrap(res);
}

export async function deleteEvent(id) {
  const res = await http.delete(`/events/${id}`);
  return unwrap(res);
}
