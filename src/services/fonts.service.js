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

export async function uploadFontVariant(file, { family, category } = {}) {
  const form = new FormData();
  form.append('file', file);
  // Family/weight/style come from the font's own name and OS/2 tables. A
  // family hint is only used by the missing-PSD-font flow, where Photoshop's
  // embedded alias must remain the CSS family used by that document.
  if (family) form.append('familyHint', family);
  if (category) form.append('category', category);
  try {
    // Font uploads are small, but a slow client-to-origin path can lose the
    // response after the server has already committed the file. Give it more
    // room than ordinary JSON calls so a successful upload is not presented
    // as a generic network failure.
    const res = await http.post('/admin/fonts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return unwrap(res);
  } catch (error) {
    // POST is idempotent for detected family + weight + style: the backend
    // replaces that variant. If its response was lost, reconcile with the
    // roster before declaring failure. This is the case that previously left
    // BellMTBold stored successfully while the modal said "network error".
    const responseLost = !error?.response || ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error?.code);
    if (responseLost && family) {
      try {
        const rows = await getFontsByFamilies([family]);
        const wanted = family.toLowerCase();
        const saved = rows.find((row) => row.family?.toLowerCase() === wanted
          || (row.aliases || []).some((alias) => alias.toLowerCase() === wanted));
        if (saved) return saved;
      } catch { /* retain the original upload error */ }
    }
    throw error;
  }
}

export async function uploadFontFiles(files) {
  const list = [...(files || [])];
  if (!list.length) return { fonts: [], failed: [], total: 0 };
  const form = new FormData();
  list.forEach((file) => form.append('files', file));
  const response = await http.post('/admin/fonts/upload-batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });
  return unwrap(response);
}

export const deleteFont = (id) => http.delete(`/admin/fonts/${id}`).then(unwrap);
