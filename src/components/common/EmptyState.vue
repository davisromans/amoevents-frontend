<template>
  <div class="surface-inset p-8 text-center">
    <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft mb-3">
      <slot name="icon" />
    </div>
    <h3 class="text-lg font-extrabold text-surface-charcoal dark:text-surface-bone mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-surface-slate dark:text-surface-ash max-w-md mx-auto">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4 flex items-center justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, required: true }, description: String });
</script>
