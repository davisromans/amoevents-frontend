import http, { unwrap } from '@/services/http';
export const listTags = (eventId) => http.get(`/events/${eventId}/tags`).then(unwrap);
export const createTag = (eventId, payload) => http.post(`/events/${eventId}/tags`, payload).then(unwrap);
export const updateTag = (eventId, tagId, patch) => http.patch(`/events/${eventId}/tags/${tagId}`, patch).then(unwrap);
export const deleteTag = (eventId, tagId) => http.delete(`/events/${eventId}/tags/${tagId}`).then(unwrap);
export const assignTag = (eventId, tagId, guestId) => http.post(`/events/${eventId}/tags/${tagId}/assign/${guestId}`).then(unwrap);
export const unassignTag = (eventId, tagId, guestId) => http.delete(`/events/${eventId}/tags/${tagId}/assign/${guestId}`).then(unwrap);
