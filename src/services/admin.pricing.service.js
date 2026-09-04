import http, { unwrap } from '@/services/http';

// Tiers
export const listTiers = () => http.get('/admin/pricing/tiers').then(unwrap);
export const createTier = (payload) => http.post('/admin/pricing/tiers', payload).then(unwrap);
export const updateTier = (id, patch) => http.patch(`/admin/pricing/tiers/${id}`, patch).then(unwrap);
export const deleteTier = (id) => http.delete(`/admin/pricing/tiers/${id}`).then(unwrap);
export const deactivateTier = (id) => http.post(`/admin/pricing/tiers/${id}/deactivate`).then(unwrap);

// Addons
export const listAddons = () => http.get('/admin/pricing/addons').then(unwrap);
export const createAddon = (payload) => http.post('/admin/pricing/addons', payload).then(unwrap);
export const updateAddon = (id, patch) => http.patch(`/admin/pricing/addons/${id}`, patch).then(unwrap);
export const deleteAddon = (id) => http.delete(`/admin/pricing/addons/${id}`).then(unwrap);
export const deactivateAddon = (id) => http.post(`/admin/pricing/addons/${id}/deactivate`).then(unwrap);

// Per-card
export const getPerCard = () => http.get('/admin/pricing/per-card').then(unwrap);
export const setPerCard = (rateTZS) => http.post('/admin/pricing/per-card', { rateTZS }).then(unwrap);
