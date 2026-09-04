<template>
  <div class="surface-inset px-2.5 py-2 text-center">
    <p class="text-xs text-surface-slate dark:text-surface-ash font-medium">{{ label }}</p>
    <p class="text-lg font-extrabold text-surface-charcoal dark:text-surface-bone tabular-nums">{{ formatNumber(value) }}</p>
  </div>
</template>

<script setup>
import { formatNumber } from '@/utils/format';
defineProps({ label: String, value: [String, Number] });
</script>
