import http, { unwrap } from '@/services/http';
export const eventOverview = (eventId) => http.get(`/events/${eventId}/analytics/overview`).then(unwrap);
