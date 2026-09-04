<template>
  <span :class="['relative inline-flex items-center justify-center shrink-0 select-none', sizeClass, shapeClass]"
        :style="!src ? { background: gradient } : undefined">
    <img v-if="src" :src="src" :alt="alt || name || ''" class="w-full h-full object-cover" :class="shapeClass" />
    <span v-else class="text-white font-black" :class="textSize">{{ initials }}</span>
    <span v-if="statusTone"
          class="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface-ivory dark:border-surface-coal"
          :class="[statusClass, statusSize]" />
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  src:   { type: String, default: '' },
  alt:   { type: String, default: '' },
  name:  { type: String, default: '' },
  /** xs (h-6) | sm (h-8) | md (h-10) | lg (h-12) | xl (h-16) */
  size:  { type: String, default: 'md' },
  /** round | square (rounded-lg) */
  shape: { type: String, default: 'round' },
  /** success | warning | danger */
  statusTone: { type: String, default: '' },
});

const sizeClass = computed(() => ({
  xs: 'h-6 w-6', sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12', xl: 'h-16 w-16',
})[props.size] || 'h-10 w-10');

const textSize = computed(() => ({
  xs: 'text-2xs', sm: 'text-2xs', md: 'text-xs', lg: 'text-sm', xl: 'text-md',
})[props.size] || 'text-xs');

const shapeClass = computed(() => props.shape === 'square' ? 'rounded-lg overflow-hidden' : 'rounded-full overflow-hidden');

const statusClass = computed(() => ({
  success: 'bg-state-success', warning: 'bg-state-warning', danger: 'bg-state-danger',
})[props.statusTone] || '');
const statusSize = computed(() => ({
  xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5',
})[props.size] || 'w-2.5 h-2.5');

// Deterministic gradient from name so the same person always has the
// same avatar color — never random per-render.
const initials = computed(() => (props.name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase());
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
const gradient = computed(() => {
  const key = String(props.name || '?');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
});
</script>
