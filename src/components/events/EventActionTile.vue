<template>
  <router-link :to="to" class="surface-card p-5 hover:shadow-gold-soft hover:-translate-y-1 transition-all duration-300 flex flex-col animate-slide-up group">
    <div class="w-11 h-11 rounded-2xl bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft flex items-center justify-center mb-4 group-hover:bg-gradient-gold group-hover:text-surface-charcoal group-hover:shadow-gold-soft transition-all">
      <component :is="icon" class="w-5 h-5" />
    </div>
    <p class="text-md font-extrabold text-surface-charcoal dark:text-surface-bone">{{ title }}</p>
    <p v-if="meta" class="text-xs text-surface-slate dark:text-surface-ash mt-1 truncate">{{ meta }}</p>
  </router-link>
</template>

<script setup>
defineProps({
  to: { type: [String, Object], required: true },
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
  meta: String,
});
</script>
