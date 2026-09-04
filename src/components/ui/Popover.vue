<template>
  <div class="relative inline-block" ref="rootRef">
    <div @click="toggle">
      <slot name="trigger" :open="isOpen" :toggle="toggle" />
    </div>
    <transition
      enter-active-class="transition duration-fast ease-out"
      leave-active-class="transition duration-instant ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div v-if="isOpen"
           :class="[
             'absolute z-50 min-w-[10rem] surface-glass shadow-elev-3',
             'origin-top', alignmentClasses,
             offset,
           ]"
           :style="{ marginTop: `${gap}px` }"
           role="menu">
        <slot :close="close" />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const props = defineProps({
  /** start (default, left-anchored) | end (right-anchored) | center */
  align: { type: String, default: 'start' },
  /** bottom (default) | top */
  side:  { type: String, default: 'bottom' },
  gap:   { type: Number, default: 4 },
});

const rootRef = ref(null);
const isOpen = ref(false);

const alignmentClasses = computed(() => {
  const horizontal = props.align === 'end' ? 'right-0'
    : props.align === 'center' ? 'left-1/2 -translate-x-1/2'
    : 'left-0';
  const vertical = props.side === 'top' ? 'bottom-full' : 'top-full';
  return `${horizontal} ${vertical}`;
});

const offset = computed(() => props.side === 'top' ? 'mb-1' : 'mt-1');

function toggle() { isOpen.value = !isOpen.value; }
function close() { isOpen.value = false; }

// Close on click outside — capture phase so it fires before any children.
function onDocClick(e) {
  if (!isOpen.value || !rootRef.value) return;
  if (!rootRef.value.contains(e.target)) close();
}
function onKey(e) { if (e.key === 'Escape') close(); }

if (typeof document !== 'undefined') {
  document.addEventListener('mousedown', onDocClick, true);
  document.addEventListener('keydown', onKey);
}
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick, true);
  document.removeEventListener('keydown', onKey);
});

defineExpose({ close, isOpen });
</script>
