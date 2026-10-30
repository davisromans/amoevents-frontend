import http, { unwrap } from '@/services/http';

export async function listGuests(eventId, params = {}) {
  const res = await http.get(`/events/${eventId}/guests`, { params });
  return { items: unwrap(res), meta: res.data.meta };
}

export async function guestStats(eventId) {
  const res = await http.get(`/events/${eventId}/guests/stats`);
  return unwrap(res);
}

export async function exportGuestDeliverySummary(eventId) {
  try {
    const res = await http.get(`/events/${eventId}/guests/export-delivery`, {
      responseType: 'blob',
      timeout: 120000,
    });
    const disposition = String(res.headers?.['content-disposition'] || '');
    const match = disposition.match(/filename="?([^";]+)"?/i);
    return {
      blob: res.data,
      filename: match?.[1] || 'guest-delivery-summary.xlsx',
      count: Number(res.headers?.['x-amoevents-export-count'] || 0),
    };
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()); } catch (_) { /* retain the Blob error */ }
    }
    throw err;
  }
}

export async function reconcileSmsDelivery(eventId) {
  const res = await http.post(`/events/${eventId}/guests/reconcile-sms-delivery`, {}, { timeout: 120000 });
  return unwrap(res);
}

export async function createGuest(eventId, payload) {
  const res = await http.post(`/events/${eventId}/guests`, payload);
  return unwrap(res);
}

export async function updateGuest(eventId, guestId, patch) {
  const res = await http.patch(`/events/${eventId}/guests/${guestId}`, patch);
  return unwrap(res);
}

export async function markGuestCalled(eventId, guestId, called = true) {
  const res = await http.post(`/events/${eventId}/guests/${guestId}/called`, { called });
  return unwrap(res);
}

// Preview is read-only; applying repeats the selected rule only after the
// organiser explicitly confirms it.
export async function previewGuestStandardization(eventId, options) {
  const res = await http.post(`/events/${eventId}/guests/standardize/preview`, options);
  return unwrap(res);
}

export async function applyGuestStandardization(eventId, options) {
  const res = await http.post(`/events/${eventId}/guests/standardize/apply`, options);
  return unwrap(res);
}

export async function listPledges(eventId) {
  const res = await http.get(`/events/${eventId}/guests/pledges`);
  return unwrap(res);
}

export async function sendPledgeReminders(eventId, payload) {
  const res = await http.post(`/events/${eventId}/pledges/remind`, payload);
  return unwrap(res);
}

export async function recomputePledgeCards(eventId) {
  const res = await http.post(`/events/${eventId}/pledges/recompute`);
  return res.data?.data || res.data;
}

export async function getGallerySharedUrl(eventId) {
  const res = await http.get(`/events/${eventId}/gallery/share-url`);
  return res.data?.data || res.data;
}

export async function addPledgeReceipt(eventId, guestId, payload) {
  const res = await http.post(`/events/${eventId}/pledges/${guestId}/receipts`, payload);
  return unwrap(res);
}

export async function deletePledgeReceipt(eventId, guestId, receiptId) {
  const res = await http.delete(`/events/${eventId}/pledges/${guestId}/receipts/${receiptId}`);
  return unwrap(res);
}

export async function updatePledgeReceipt(eventId, guestId, receiptId, payload) {
  const res = await http.patch(`/events/${eventId}/pledges/${guestId}/receipts/${receiptId}`, payload);
  return unwrap(res);
}

export async function deleteGuest(eventId, guestId) {
  const res = await http.delete(`/events/${eventId}/guests/${guestId}`);
  return unwrap(res);
}

export async function getGuestQrUrl(eventId, guestId) {
  const res = await http.get(`/events/${eventId}/qr/${guestId}/url`);
  return unwrap(res);
}

/** Fetch the QR PNG as a Blob and return an object URL (works in <img>). */
export async function fetchGuestQrBlobUrl(eventId, guestId) {
  const { url } = await getGuestQrUrl(eventId, guestId);
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch (_) { /* ignore */ }
    throw new Error(`QR fetch failed (${res.status}): ${detail || res.statusText}`);
  }
  const blob = await res.blob();
  return { objectUrl: URL.createObjectURL(blob), blob };
}

/** Force-download a QR image as PNG. */
export async function downloadGuestQr(eventId, guestId, filename = 'qr.png') {
  const { blob } = await fetchGuestQrBlobUrl(eventId, guestId);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}
