<template>
  <!-- Anchor lives inline; the tooltip itself teleports to <body> so it
       escapes any scrolling / overflow-hidden ancestor (the sidebar was
       clipping it — labels appeared inside the panel instead of outside). -->
  <span ref="anchor" class="relative inline-flex" @mouseenter="open" @mouseleave="close" @focusin="open" @focusout="close">
    <slot />
    <Teleport to="body">
      <transition
        enter-active-class="transition duration-fast ease-out"
        leave-active-class="transition duration-instant ease-out"
        enter-from-class="opacity-0 scale-95" leave-to-class="opacity-0 scale-95"
      >
        <span v-if="visible && label"
              role="tooltip"
              :style="tooltipStyle"
              class="pointer-events-none fixed z-[9999] whitespace-nowrap
                     px-2 py-1 rounded-md text-2xs font-semibold
                     bg-surface-charcoal text-white dark:bg-surface-bone dark:text-surface-charcoal
                     shadow-elev-3">
          {{ label }}
        </span>
      </transition>
    </Teleport>
  </span>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  /** top (default) | bottom | left | right */
  side:  { type: String, default: 'top' },
  /** Delay before showing in ms. */
  delay: { type: Number, default: 350 },
});

const visible = ref(false);
const anchor  = ref(null);
const rect    = ref({ top: 0, left: 0, width: 0, height: 0 });
let timer = null;

function measure() {
  if (!anchor.value) return;
  const r = anchor.value.getBoundingClientRect();
  rect.value = { top: r.top, left: r.left, width: r.width, height: r.height };
}

function open() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    measure();
    visible.value = true;
    await nextTick();
    measure();
  }, props.delay);
}
function close() { clearTimeout(timer); visible.value = false; }
onBeforeUnmount(() => clearTimeout(timer));

// Re-measure on window scroll/resize while open — otherwise the tooltip
// stays glued to its stale coordinates as content shifts under the cursor.
watch(visible, (v) => {
  if (typeof window === 'undefined') return;
  if (v) {
    window.addEventListener('scroll',  measure, true);
    window.addEventListener('resize', measure);
  } else {
    window.removeEventListener('scroll',  measure, true);
    window.removeEventListener('resize', measure);
  }
});

// Position the fixed pill relative to the anchor rect. Uses translate so
// the offset accounts for the tooltip's own dimensions cleanly.
const tooltipStyle = computed(() => {
  const { top, left, width, height } = rect.value;
  const gap = 6;
  switch (props.side) {
    case 'bottom':
      return { top: `${top + height + gap}px`, left: `${left + width / 2}px`, transform: 'translateX(-50%)' };
    case 'left':
      return { top: `${top + height / 2}px`, left: `${left - gap}px`, transform: 'translate(-100%, -50%)' };
    case 'right':
      return { top: `${top + height / 2}px`, left: `${left + width + gap}px`, transform: 'translateY(-50%)' };
    case 'top':
    default:
      return { top: `${top - gap}px`, left: `${left + width / 2}px`, transform: 'translate(-50%, -100%)' };
  }
});
</script>
