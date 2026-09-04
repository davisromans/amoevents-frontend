<template>
  <div class="surface-card p-5 hover:shadow-gold-soft transition-shadow duration-300">
    <p class="text-2xs uppercase font-bold tracking-[0.15em] text-surface-slate dark:text-surface-ash">{{ label }}</p>
    <p class="text-xl sm:text-2xl lg:text-3xl font-black tabular-nums mt-2 leading-tight break-words" :class="toneClass">{{ typeof value === 'string' ? value : formatNumber(value) }}</p>
    <p v-if="meta" class="text-2xs text-surface-slate dark:text-surface-ash mt-1.5">{{ meta }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatNumber } from '@/utils/format';
const props = defineProps({
  label: String,
  value: [String, Number],
  meta: { type: String, default: '' },
  tone: { type: String, default: 'default' }, // default | gold | success | warn
});
const toneClass = computed(() => ({
  gold: 'text-brand-gold-deep dark:text-brand-gold-soft',
  success: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  default: 'text-surface-charcoal dark:text-surface-bone',
}[props.tone] || 'text-surface-charcoal dark:text-surface-bone'));
</script>
