import axios from 'axios';

// Unauthenticated stats — marketing site pulls this for the hero KPI strip
// and the auth brand panel. Backend caches for 5 minutes so it's cheap to
// call on every landing render.
const client = axios.create({ baseURL: '/api/public' });

export async function fetchPublicStats() {
  try {
    const { data } = await client.get('/stats');
    return data.data;
  } catch (_) {
    // Marketing surfaces render fallback floor values when the API can't
    // reach — a dead landing page over a network hiccup is worse than a
    // slightly-stale number.
    return { displayEvents: 200, displayGuests: 15000, arrived: 0 };
  }
}
