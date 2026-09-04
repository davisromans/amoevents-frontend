import http, { unwrap } from '@/services/http';

export const listTemplates = (category) =>
  http.get('/message-templates', { params: category ? { category } : {} }).then(unwrap);
export const listMetaTemplates = () =>
  http.get('/message-templates/meta').then(unwrap);
export const submitTemplateToMeta = (id) =>
  http.post(`/message-templates/${id}/submit-to-meta`).then(unwrap);
export const refreshMetaStatus = (id) =>
  http.get(`/message-templates/${id}/meta-status`).then(unwrap);

export const createTemplate = (payload) => http.post('/message-templates', payload).then(unwrap);
export const updateTemplate = (id, patch) => http.patch(`/message-templates/${id}`, patch).then(unwrap);
export const deleteTemplate = (id) => http.delete(`/message-templates/${id}`).then(unwrap);

export async function uploadTemplateImage(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post('/message-templates/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(res);
}
