import axios from 'axios';

const client = axios.create({ baseURL: '/api/public' });

export async function fetchInvitation(token) {
  const { data } = await client.get(`/g/${encodeURIComponent(token)}`);
  return data.data;
}
export async function submitRsvp(token, payload) {
  const { data } = await client.post(`/g/${encodeURIComponent(token)}/rsvp`, payload);
  return data.data;
}
export async function fetchGallery(token, pin) {
  const { data } = await client.get(`/g/${encodeURIComponent(token)}/gallery`, {
    params: pin ? { pin } : {},
  });
  return data.data;
}
export function icsUrl(token) { return `/api/public/g/${encodeURIComponent(token)}.ics`; }
