import { computed } from 'vue';

// Single map of every domain this build serves. Adding a new white-label
// tenant = one entry here (+ their nameserver pointing at events.amoview.com,
// once we wire the nginx vhost). Fallback for anything not listed is the
// AmoEvents brand — that's what events.amoview.com and localhost dev see.
const BRANDS = {
  // default (used for events.amoview.com, localhost, and anything unlisted)
  _default: {
    name: 'Amo Events',
    domain: 'events.amoview.com',
    supportEmail: 'info@amoview.com',
    // Legal operating entity — shown in the footer. Must stay identical to
    // amoview.com's About page and to what's registered with Meta, since
    // mismatched business names/emails between the website and the
    // WhatsApp Business Account block Meta's business verification.
    legalEntity: 'Davintech Labs',
    tagline: 'Event management, ticketing, streaming',
    logoUrl: '/logo.png',
  },
};

function resolve(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return BRANDS[h] || BRANDS._default;
}

let cached = null;
export function useBrand() {
  if (!cached) cached = resolve(typeof window !== 'undefined' ? window.location.hostname : '');
  const brand = computed(() => cached);
  return { brand };
}

// One-shot helper for places that need the raw value (e.g. document.title,
// template chip strings) outside a Vue setup context.
export function currentBrand() {
  if (!cached) cached = resolve(typeof window !== 'undefined' ? window.location.hostname : '');
  return cached;
}
