import http, { unwrap } from '@/services/http';

export const getInstructions = (eventId) =>
  http.get(`/events/${eventId}/payments/instructions`).then(unwrap);

export const listMySubmissions = (eventId) =>
  http.get(`/events/${eventId}/payments`).then(unwrap);

export const submitPayment = (eventId, payload) =>
  http.post(`/events/${eventId}/payments`, payload).then(unwrap);

// Super admin
export const listAllSubmissions = (params = {}) =>
  http.get('/admin/payments', { params }).then(unwrap);

export const confirmSubmission = (id, reviewNote = '') =>
  http.post(`/admin/payments/${id}/confirm`, { reviewNote }).then(unwrap);

export const rejectSubmission = (id, reviewNote) =>
  http.post(`/admin/payments/${id}/reject`, { reviewNote }).then(unwrap);

// API-powered package/add-on billing — real catalog (PricingTier/PricingAddon),
// real computed total, real PawaPay checkout. See amoevents-backend's
// modules/payments/billing.service.js.
export const getBillingCatalog = (eventId) =>
  http.get(`/events/${eventId}/payments/catalog`).then(unwrap);

export const getBillingSummary = (eventId) =>
  http.get(`/events/${eventId}/payments/billing`).then(unwrap);

export const selectPackage = (eventId, payload) =>
  http.put(`/events/${eventId}/payments/package`, payload).then(unwrap);

export const checkoutPackage = (eventId, payload) =>
  http.post(`/events/${eventId}/payments/checkout`, payload).then(unwrap);

export const pollCheckout = (eventId, depositId) =>
  http.get(`/events/${eventId}/payments/checkout/${depositId}`).then(unwrap);

// Pay from the tenant's TZS wallet (no PawaPay push). Omit amountTZS to
// pay the full remaining balance; pass an integer to pay a partial amount.
export const checkoutFromWallet = (eventId, amountTZS) =>
  http.post(`/events/${eventId}/payments/checkout-wallet`,
    amountTZS != null ? { amountTZS } : {}).then(unwrap);
