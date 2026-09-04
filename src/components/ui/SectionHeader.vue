<template>
  <div class="flex items-end justify-between gap-3 mb-4">
    <div class="min-w-0">
      <h2 :class="titleClass">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm text-surface-slate dark:text-surface-ash">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  /** page (h1, largest) | section (h2, default) | subsection (h3, smaller) */
  level:       { type: String, default: 'section' },
});

// One h-per-role — no eyebrow soup. Design principle: structure > sub-headers.
const titleClass = computed(() => ({
  page:       'text-2xl sm:text-3xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone',
  section:    'text-lg font-black tracking-tight text-surface-charcoal dark:text-surface-bone',
  subsection: 'text-md font-bold text-surface-charcoal dark:text-surface-bone',
})[props.level] || 'text-lg font-black tracking-tight text-surface-charcoal dark:text-surface-bone');
</script>
