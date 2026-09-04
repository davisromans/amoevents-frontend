<template>
  <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
    <div class="flex items-center gap-2 min-w-0">
      <router-link v-if="back" :to="back" class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog text-surface-charcoal dark:text-surface-bone hover:border-brand-gold transition shrink-0" :aria-label="'Back'">
        <ChevronLeftIcon class="w-4 h-4" />
      </router-link>
      <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-surface-charcoal dark:text-surface-bone truncate">{{ title }}</h1>
      <span v-if="badge" class="ml-1">
        <slot name="badge" />
      </span>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 flex-wrap">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
defineProps({
  title: { type: String, required: true },
  back: { type: [String, Object], default: null },
  badge: { type: Boolean, default: false },
});
</script>
