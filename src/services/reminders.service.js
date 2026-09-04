import http, { unwrap } from '@/services/http';

// Reminder cascade — an ordered set of "steps" that fire relative to the
// event date. Managed via the Reminders page under an event.
export const getCascade      = (eventId)         => http.get(`/events/${eventId}/reminders`).then(unwrap);
export const getDefaultSteps = (eventId)         => http.get(`/events/${eventId}/reminders/defaults`).then(unwrap);
export const upsertCascade   = (eventId, body)   => http.put(`/events/${eventId}/reminders`, body).then(unwrap);
export const addStep         = (eventId, step)   => http.post(`/events/${eventId}/reminders/steps`, step).then(unwrap);
export const patchStep       = (eventId, sid, s) => http.patch(`/events/${eventId}/reminders/steps/${sid}`, s).then(unwrap);
export const deleteStep      = (eventId, sid)    => http.delete(`/events/${eventId}/reminders/steps/${sid}`).then(unwrap);
export const pauseCascade    = (eventId)         => http.post(`/events/${eventId}/reminders/pause`).then(unwrap);
