import http, { unwrap } from '@/services/http';

// Cached list of Meta-approved WhatsApp templates. Populated by clicking
// "Sync from Meta" in the messaging view — no automatic polling.
export async function listWhatsAppTemplates() {
  const res = await http.get('/whatsapp-templates');
  return unwrap(res); // { items, bodyTokens, urlTokens }
}

export async function syncWhatsAppTemplates() {
  const res = await http.post('/whatsapp-templates/sync');
  return unwrap(res);
}

export async function updateVarMap(id, { varMap, urlButtonMap }) {
  const res = await http.patch(`/whatsapp-templates/${id}/varmap`, { varMap, urlButtonMap });
  return unwrap(res);
}
