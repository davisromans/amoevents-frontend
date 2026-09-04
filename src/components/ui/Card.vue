<template>
  <component :is="tag" :class="classes">
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  tag:     { type: String, default: 'div' },
  /** default | inset | glass — matches the .surface-* CSS classes. */
  variant: { type: String, default: 'default' },
  /** none | sm (p-4) | md (p-5) | lg (p-6) | xl (p-8) */
  padding: { type: String, default: 'md' },
  interactive: { type: Boolean, default: false }, // hover elevation + cursor
});

const classes = computed(() => {
  const surface = ({
    default: 'surface-card',
    inset:   'surface-inset',
    glass:   'surface-glass',
  })[props.variant] || 'surface-card';
  const pad = ({ none: '', sm: 'p-4', md: 'p-5', lg: 'p-6', xl: 'p-8' })[props.padding] || 'p-5';
  const hover = props.interactive
    ? 'cursor-pointer hover:shadow-elev-3 hover:border-brand-primary/40 transition-all duration-fast'
    : '';
  return [surface, pad, hover].filter(Boolean).join(' ');
});
</script>
