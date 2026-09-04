// Batch 22 — the dynamic data-binding registry. This is the single list
// of fields any text (or QR) layer can be tagged with — the Template
// Studio's binding picker reads from it, and the server-side renderer
// (Batch 28) reads the SAME list to know what a given key means when it
// substitutes real guest/event data at export time. New bindable fields
// get added here once, not once per consumer of the concept.
export const BINDING_FIELDS = [
  { key: 'guest.firstName', label: 'Guest first name', sample: 'Amara' },
  { key: 'guest.lastName', label: 'Guest last name', sample: 'Kimaro' },
  { key: 'guest.fullName', label: 'Guest full name', sample: 'Amara Kimaro' },
  { key: 'guest.phone', label: 'Guest phone', sample: '+255 712 345 678' },
  { key: 'guest.memberId', label: 'Guest member ID', sample: '2026-0142' },
  { key: 'guest.tableNumber', label: 'Table number', sample: '12' },
  { key: 'event.name', label: 'Event name', sample: 'Amara & Kitos Wedding' },
  { key: 'event.coupleNames', label: 'Couple names', sample: 'Amara & Kitos' },
  { key: 'event.date', label: 'Event date', sample: 'Saturday, 14 March 2026' },
  { key: 'event.time', label: 'Event time', sample: '2:00 PM' },
  { key: 'event.venueName', label: 'Venue name', sample: 'Sea Cliff Gardens' },
  { key: 'event.venueAddress', label: 'Venue address', sample: 'Msasani Peninsula, Dar es Salaam' },
  { key: 'event.hostText', label: 'Host text', sample: 'The Kimaro & Mushi families invite you' },
  { key: 'event.dressCode', label: 'Dress code', sample: 'Gold & Ivory' },
];

export function findBinding(key) {
  return BINDING_FIELDS.find((f) => f.key === key) || null;
}

/** Sample text for the Studio's own preview — real substitution happens server-side at export (Batch 28). */
export function sampleValueFor(key) {
  return findBinding(key)?.sample ?? `{{${key}}}`;
}
