<template>
  <div class="surface-inset p-3 rounded-xl">
    <p class="text-2xs uppercase font-black tracking-widest" :class="toneText">{{ label }}</p>
    <p class="text-xl font-black tabular-nums text-surface-charcoal dark:text-surface-bone">{{ value }}</p>
    <p v-if="sub" class="text-2xs text-surface-slate dark:text-surface-ash">{{ sub }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'default' },
});
const toneText = computed(() => ({
  emerald: 'text-emerald-600 dark:text-emerald-400',
  gold: 'text-brand-gold-deep dark:text-brand-gold-soft',
  rose: 'text-red-600 dark:text-red-400',
}[props.tone] || 'text-surface-slate dark:text-surface-ash'));
</script>
