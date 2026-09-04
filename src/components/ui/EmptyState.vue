<template>
  <div class="text-center py-12 px-6">
    <div v-if="$slots.icon" class="w-14 h-14 rounded-2xl bg-surface-mist/50 dark:bg-surface-fog/50 flex items-center justify-center mx-auto mb-4 text-surface-slate dark:text-surface-ash">
      <slot name="icon" />
    </div>
    <h3 class="text-lg font-black text-surface-charcoal dark:text-surface-bone">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 text-sm text-surface-slate dark:text-surface-ash max-w-sm mx-auto leading-relaxed">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-6 flex items-center justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
});
</script>
