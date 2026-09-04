<template>
  <div class="inline-flex items-center gap-2 text-sm text-surface-slate dark:text-surface-ash">
    <span class="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-gold border-r-transparent animate-spin" />
    <span v-if="label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({ label: { type: String, default: 'Loading…' } });
</script>
