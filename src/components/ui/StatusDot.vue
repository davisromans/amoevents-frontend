<template>
  <span :class="['relative inline-flex', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5']">
    <span v-if="pulse" :class="['absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', toneBg]" />
    <span :class="['relative inline-flex rounded-full', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5', toneBg]" />
  </span>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  /** success | warning | danger | info | primary | neutral */
  tone:  { type: String, default: 'success' },
  size:  { type: String, default: 'md' },
  pulse: { type: Boolean, default: false },
});
const toneBg = computed(() => ({
  success: 'bg-state-success',
  warning: 'bg-state-warning',
  danger:  'bg-state-danger',
  info:    'bg-state-info',
  primary: 'bg-brand-primary',
  neutral: 'bg-surface-slate dark:bg-surface-ash',
})[props.tone] || 'bg-state-success');
</script>
