import http, { unwrap } from '@/services/http';

// Guest portal — the invited-side view. Every route requires auth.
export const guestMe            = ()          => http.get('/guest/me').then(unwrap);
export const listMyInvitations  = ()          => http.get('/guest/me/invitations').then(unwrap);
export const listMyPledges      = ()          => http.get('/guest/me/pledges').then(unwrap);
// Organiser-side: every unique phone that ever appeared on any of my events,
// aggregated with running pledged/received totals. Powers "My people".
export const listContributors   = ()          => http.get('/guest/me/contributors').then(unwrap);
export const getMyEvent         = (eventId)   => http.get(`/guest/me/events/${eventId}`).then(unwrap);
export const getEventGuestList  = (eventId)   => http.get(`/guest/me/events/${eventId}/guest-list`).then(unwrap);
export const submitMyRsvp       = (eventId, status) => http.post(`/guest/me/events/${eventId}/rsvp`, { status }).then(unwrap);
export const linkByCode         = (code)      => http.post('/guest/me/link-by-code', { code }).then(unwrap);

// Recognize-only join for a shared link's token (gallery or personal QR
// link) — see amoevents-backend's guestPortal.routes.js for the full rule:
// never creates a new guest, only ever recognizes someone already on the
// organiser's list. Requires an authenticated AmoEvents session.
export const joinByToken        = (token)     => http.post('/guest/me/join-by-token', { token }).then(unwrap);
