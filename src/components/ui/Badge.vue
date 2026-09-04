<template>
  <span :class="classes">
    <slot name="leading" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: [String, Number], default: '' },
  /** neutral | primary | success | warning | danger | info */
  tone:  { type: String, default: 'neutral' },
  /** sm | md */
  size:  { type: String, default: 'sm' },
});

const classes = computed(() => {
  const base = 'inline-flex items-center gap-1 font-semibold rounded-md';
  const sz = props.size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-2xs';
  const tone = ({
    neutral: 'bg-surface-mist/60 dark:bg-surface-fog/60 text-surface-charcoal dark:text-surface-bone',
    primary: 'bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft font-bold',
    success: 'bg-state-success-bg text-state-success',
    warning: 'bg-state-warning-bg text-state-warning',
    danger:  'bg-state-danger-bg text-state-danger',
    info:    'bg-state-info-bg text-state-info',
  })[props.tone] || 'bg-surface-mist/60 dark:bg-surface-fog/60 text-surface-charcoal dark:text-surface-bone';
  return `${base} ${sz} ${tone}`;
});
</script>
