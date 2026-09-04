<template>
  <div class="surface-card p-6 animate-slide-up hover:shadow-gold-soft transition-all duration-300">
    <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft mb-3">
      <slot name="icon" />
    </div>
    <h3 class="text-lg font-extrabold text-surface-charcoal dark:text-surface-bone mb-1">{{ title }}</h3>
    <p class="text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ description }}</p>
  </div>
</template>

<script setup>
defineProps({ title: String, description: String });
</script>
