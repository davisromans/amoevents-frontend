import http, { unwrap } from '@/services/http';
export const listCollaborators = (eventId) => http.get(`/events/${eventId}/collaborators`).then(unwrap);
export const inviteCollaborator = (eventId, payload) => http.post(`/events/${eventId}/collaborators`, payload).then(unwrap);
export const updateCollaborator = (eventId, collabId, patch) => http.patch(`/events/${eventId}/collaborators/${collabId}`, patch).then(unwrap);
export const revokeCollaborator = (eventId, collabId) => http.delete(`/events/${eventId}/collaborators/${collabId}`).then(unwrap);

// Co-owner invites — invite an existing Amoview account (the bride/groom's
// own account) instead of creating a fresh phone/password AmoEvents user.
// Requires their explicit accept; see pending-invites below.
export const searchAmoviewUsers = (eventId, q) =>
  http.get(`/events/${eventId}/collaborators/search-amoview`, { params: { q } }).then(unwrap);
export const inviteAmoviewUser = (eventId, payload) =>
  http.post(`/events/${eventId}/collaborators/invite-amoview-user`, payload).then(unwrap);

// This user's own pending co-owner invites, across every event — the web
// accept path for someone without (or not currently using) the Amoview app.
export const listMyPendingInvites = () => http.get('/collaborators/pending-invites').then(unwrap);
export const respondToInvite = (collabId, action) =>
  http.post(`/collaborators/pending-invites/${collabId}/respond`, { action }).then(unwrap);
