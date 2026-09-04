<template>
  <div :class="wrapper">
    <div :class="fill" :style="{ width: `${pct}%` }" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: Number, required: true },
  max:   { type: Number, default: 100 },
  /** neutral | primary (default) | success | warning | danger */
  tone:  { type: String, default: 'primary' },
  /** sm (h-1) | md (h-1.5) | lg (h-2) */
  size:  { type: String, default: 'md' },
});

const pct = computed(() => Math.max(0, Math.min(100, (props.value / props.max) * 100)));

const wrapper = computed(() => {
  const h = ({ sm: 'h-1', md: 'h-1.5', lg: 'h-2' })[props.size] || 'h-1.5';
  return `w-full ${h} rounded-full bg-surface-mist dark:bg-surface-fog overflow-hidden`;
});

const fill = computed(() => {
  const bg = ({
    neutral: 'bg-surface-slate dark:bg-surface-ash',
    primary: 'bg-gradient-primary',
    success: 'bg-state-success',
    warning: 'bg-state-warning',
    danger:  'bg-state-danger',
  })[props.tone] || 'bg-gradient-primary';
  return `h-full rounded-full transition-all duration-slow ${bg}`;
});
</script>
