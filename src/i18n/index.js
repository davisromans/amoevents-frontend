import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import sw from './locales/sw.json';

const STORAGE_KEY = 'gc.locale';
const SUPPORTED = ['en', 'sw'];
const DEFAULT = 'en';

function initialLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch (_) { /* no-op */ }
  return DEFAULT;
}

const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, sw },
});

export function setLocale(loc) {
  if (!SUPPORTED.includes(loc)) return;
  i18n.global.locale.value = loc;
  try {
    localStorage.setItem(STORAGE_KEY, loc);
    document.documentElement.setAttribute('lang', loc);
  } catch (_) { /* no-op */ }
}

export function currentLocale() { return i18n.global.locale.value; }
export const LOCALES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'sw', label: 'Kiswahili', flag: 'SW' },
];

// Ensure the initial <html lang> matches.
try { document.documentElement.setAttribute('lang', initialLocale()); } catch (_) { /* no-op */ }

export default i18n;
