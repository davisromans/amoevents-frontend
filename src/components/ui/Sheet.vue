<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-fast"
      leave-active-class="transition-opacity duration-fast"
      enter-from-class="opacity-0" leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[100] bg-surface-charcoal/60 dark:bg-black/70 backdrop-blur-sm" @click.self="dismiss" />
    </transition>
    <transition
      :enter-active-class="`transition-transform duration-base ease-out ${sideClasses.enter}`"
      :leave-active-class="`transition-transform duration-fast ease-out ${sideClasses.leave}`"
      :enter-from-class="sideClasses.from"
      :leave-to-class="sideClasses.from"
    >
      <aside v-if="modelValue"
             role="dialog" aria-modal="true"
             :class="[
               'fixed z-[101] bg-surface-ivory dark:bg-surface-coal shadow-elev-4 flex flex-col',
               'border border-surface-mist dark:border-surface-fog',
               sideClasses.position,
             ]"
             :style="dimensionStyle">
        <header v-if="title || $slots.header" class="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-start justify-between gap-3 border-b border-surface-mist dark:border-surface-fog shrink-0">
          <div class="min-w-0">
            <slot name="header">
              <h2 class="text-lg font-black tracking-tight text-surface-charcoal dark:text-surface-bone">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-sm text-surface-slate dark:text-surface-ash">{{ description }}</p>
            </slot>
          </div>
          <button type="button" aria-label="Close" class="btn-ghost !h-8 !w-8 !p-0 shrink-0" @click="dismiss">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-5 sm:p-6">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="px-5 sm:px-6 py-4 border-t border-surface-mist dark:border-surface-fog shrink-0 flex items-center justify-end gap-2">
          <slot name="footer" />
        </footer>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** right (default) | left | bottom */
  side:       { type: String, default: 'right' },
  title:      { type: String, default: '' },
  description:{ type: String, default: '' },
  /** For side=right/left: max width in px. For bottom: max height in px. */
  size:       { type: Number, default: 480 },
});
const emit = defineEmits(['update:modelValue', 'close']);

const sideClasses = computed(() => ({
  right: {
    position: 'inset-y-0 right-0 w-full',
    from: 'translate-x-full',
    enter: 'ease-out',
    leave: 'ease-out',
  },
  left: {
    position: 'inset-y-0 left-0 w-full',
    from: '-translate-x-full',
    enter: 'ease-out',
    leave: 'ease-out',
  },
  bottom: {
    position: 'inset-x-0 bottom-0 rounded-t-3xl',
    from: 'translate-y-full',
    enter: 'ease-out',
    leave: 'ease-out',
  },
})[props.side] || {
  position: 'inset-y-0 right-0 w-full', from: 'translate-x-full', enter: 'ease-out', leave: 'ease-out',
});

const dimensionStyle = computed(() => props.side === 'bottom'
  ? { maxHeight: `${props.size}px` }
  : { maxWidth: `${props.size}px` });

function dismiss() { emit('update:modelValue', false); emit('close'); }

let prevOverflow = '';
function onKey(e) { if (e.key === 'Escape' && props.modelValue) dismiss(); }
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
