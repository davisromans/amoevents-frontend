import http, { unwrap } from '@/services/http';

// Super-admin defined event types + defaults. Any authed user can list; only
// super-admin can create/edit/delete.
export async function listEventTypes()      { return unwrap(await http.get('/event-types')); }
export async function createEventType(p)    { return unwrap(await http.post('/event-types', p)); }
export async function updateEventType(id,p) { return unwrap(await http.patch(`/event-types/${id}`, p)); }
export async function deleteEventType(id)   { return unwrap(await http.delete(`/event-types/${id}`)); }
