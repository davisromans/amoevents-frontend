import { ref, watch } from 'vue';

const STORAGE_KEY = 'gc.theme';
const initial = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (_) { /* no-op */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();

const theme = ref(initial);

function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

watch(theme, (v) => {
  try { localStorage.setItem(STORAGE_KEY, v); } catch (_) { /* no-op */ }
  applyTheme(v);
}, { immediate: true });

function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; }
function setTheme(v) { if (v === 'light' || v === 'dark') theme.value = v; }

export function useTheme() {
  return { theme, toggleTheme, setTheme };
}
