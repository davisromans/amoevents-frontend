<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-fast"
      leave-active-class="transition-opacity duration-fast"
      enter-from-class="opacity-0" leave-to-class="opacity-0"
    >
      <div v-if="modelValue"
           class="fixed inset-0 z-[100] bg-surface-charcoal/70 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
           @click.self="dismiss">
        <transition
          enter-active-class="transition duration-base ease-out"
          leave-active-class="transition duration-fast ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:scale-95" leave-to-class="opacity-0 sm:scale-95"
        >
          <div v-if="modelValue"
               role="dialog" aria-modal="true"
               :class="[
                 'relative w-full bg-surface-ivory dark:bg-surface-coal shadow-elev-4',
                 'border border-surface-mist dark:border-surface-fog',
                 'max-h-[92vh] flex flex-col',
                 'rounded-t-2xl sm:rounded-2xl',
               ]"
               :style="{ maxWidth: `${maxWidth}px` }">
            <header v-if="title || $slots.header" class="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-start justify-between gap-3 border-b border-surface-mist dark:border-surface-fog shrink-0">
              <div class="min-w-0">
                <slot name="header">
                  <h2 class="text-lg font-black tracking-tight text-surface-charcoal dark:text-surface-bone">{{ title }}</h2>
                  <p v-if="description" class="mt-1 text-sm text-surface-slate dark:text-surface-ash">{{ description }}</p>
                </slot>
              </div>
              <button v-if="dismissible" type="button" aria-label="Close" class="btn-ghost !h-8 !w-8 !p-0 shrink-0" @click="dismiss">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
              </button>
            </header>

            <div class="flex-1 overflow-y-auto p-5 sm:p-6">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="px-5 sm:px-6 py-4 border-t border-surface-mist dark:border-surface-fog shrink-0 flex items-center justify-end gap-2">
              <slot name="footer" />
            </footer>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  maxWidth:    { type: Number, default: 520 },
  dismissible: { type: Boolean, default: true },
  /** Set false to force explicit close (a destructive-confirm modal etc.). */
  closeOnEsc:  { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue', 'close']);

function dismiss() {
  if (!props.dismissible || !props.closeOnBackdrop) return;
  emit('update:modelValue', false);
  emit('close');
}

// Lock body scroll while open; Esc closes; restore prior overflow on unmount.
let prevOverflow = '';
function onKey(e) {
  if (e.key === 'Escape' && props.modelValue && props.closeOnEsc && props.dismissible) dismiss();
}
watch(() => props.modelValue, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
  } else {
    document.body.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
  }
}, { immediate: true });
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  if (props.modelValue) document.body.style.overflow = prevOverflow;
});
</script>
