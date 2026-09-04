import { ref } from 'vue';

// Single reactive state shared across the app — one mount at the root
// (see ConfirmDialog.vue) reads it and renders the modal. `askConfirm`
// returns a Promise<boolean>.
const state = ref(null);

export function useConfirm() {
  function askConfirm(opts) {
    // Accept either askConfirm('are you sure?') or askConfirm({ ... })
    const cfg = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      state.value = {
        title: cfg.title || 'Confirm',
        message: cfg.message || 'Are you sure?',
        confirmText: cfg.confirmText || 'Confirm',
        cancelText: cfg.cancelText || 'Cancel',
        danger: !!cfg.danger,
        resolve,
      };
    });
  }
  return { state, askConfirm };
}

export const { state: confirmState, askConfirm } = useConfirm();
