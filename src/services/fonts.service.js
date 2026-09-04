import http, { unwrap } from '@/services/http';

// Active roster — fonts already added to the Studio's picker (both Google
// families an admin has explicitly enabled and every uploaded custom font).
// `params` can include `q` (substring search) / `category` / `limit` — the
// roster is capped server-side (1,500+ fonts after the bulk import), so the
// picker searches server-side instead of fetching everything to filter
// locally.
export const listFonts = (params) => http.get('/fonts', { params: params || {} }).then(unwrap);

// Exact-match lookup for one or more family names, regardless of the
// roster's pagination/search state — used to resolve a document's own
// `fontFamilies` to real file URLs so it always renders in its real face,
// not just whichever fonts happen to be on the picker's current page.
export const getFontsByFamilies = (families) => {
  const list = (families || []).filter(Boolean);
  if (!list.length) return Promise.resolve([]);
  return http.get('/fonts', { params: { family: list.join(',') } }).then(unwrap);
};

// The full curated Google Fonts catalog for search/browse, independent of
// what's already been "added" — see googleFontsCatalog.js on the backend.
export const searchGoogleCatalog = (params) => http.get('/fonts/google-catalog', { params }).then(unwrap);

export const addGoogleFont = (family) => http.post('/admin/fonts/google', { family }).then(unwrap);

export async function uploadFontVariant(file, { family, weight, style, category }) {
  const form = new FormData();
  form.append('file', file);
  form.append('family', family);
  form.append('weight', String(weight ?? 400));
  form.append('style', style || 'normal');
  if (category) form.append('category', category);
  const res = await http.post('/admin/fonts/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return unwrap(res);
}

export const deleteFont = (id) => http.delete(`/admin/fonts/${id}`).then(unwrap);
