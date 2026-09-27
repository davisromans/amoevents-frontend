import http, { unwrap } from '@/services/http';

// Cached list of Meta-approved WhatsApp templates. Populated by clicking
// "Sync from Meta" in the messaging view — no automatic polling.
export async function listWhatsAppTemplates() {
  const res = await http.get('/whatsapp-templates');
  return unwrap(res); // { items, bodyTokens, urlTokens }
}

export async function syncWhatsAppTemplates() {
  // Depends on an external API (Infobip or Meta's Graph API) whose latency
  // we don't control — the global 20s axios default is too tight for a
  // slow moment on their end, and the request would otherwise die
  // client-side ("timing out") even though the server-side sync (normally
  // well under 1s for a small template set) would have finished fine.
  const res = await http.post('/whatsapp-templates/sync', {}, { timeout: 60000 });
  return unwrap(res);
}

export async function updateVarMap(id, { varMap, urlButtonMap }) {
  const res = await http.patch(`/whatsapp-templates/${id}/varmap`, { varMap, urlButtonMap });
  return unwrap(res);
}
