// Normalize phone numbers pasted from contacts/WhatsApp before sending them
// to the API. Pasted values can contain NBSPs and invisible bidi/formatting
// marks that look like ordinary spaces but fail numeric validation.
export function normalizePhoneInput(raw, defaultCountryCode = '255') {
  const value = String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u2060\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  if (!value) return '';

  const cleaned = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) return `+${defaultCountryCode}${cleaned.slice(1)}`;
  if (cleaned.startsWith(defaultCountryCode)) return `+${cleaned}`;
  if (cleaned.length === 9) return `+${defaultCountryCode}${cleaned}`;
  return `+${cleaned}`;
}
