import { ref } from 'vue';

const toasts = ref([]);
let seq = 0;

function push(kind, message, opts = {}) {
  const id = ++seq;
  const toast = { id, kind, message, ttl: opts.ttl ?? 4000 };
  toasts.value.push(toast);
  setTimeout(() => dismiss(id), toast.ttl);
  return id;
}

function dismiss(id) { toasts.value = toasts.value.filter((t) => t.id !== id); }

export function useToast() {
  return {
    toasts,
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    dismiss,
  };
}
