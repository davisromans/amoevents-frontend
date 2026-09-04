<template>
  <span :class="['block rounded-md bg-surface-mist/70 dark:bg-surface-fog/70 relative overflow-hidden', className]"
        :style="{ width, height }" aria-hidden="true">
    <span class="absolute inset-0 animate-shimmer"
          style="background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%); background-size: 200% 100%;" />
  </span>
</template>

<script setup>
defineProps({
  width:     { type: String, default: '100%' },
  height:    { type: String, default: '1rem' },
  className: { type: String, default: '' }, // for custom shapes (e.g. rounded-full for a fake avatar)
});
</script>
