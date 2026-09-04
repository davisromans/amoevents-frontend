<template>
  <div>
    <div :class="listClasses" role="tablist">
      <component
        v-for="t in tabs" :key="t.value"
        :is="t.to ? 'router-link' : 'button'"
        :to="t.to"
        :type="t.to ? undefined : 'button'"
        role="tab"
        :aria-selected="isActive(t)"
        :class="[
          'inline-flex items-center gap-1.5 transition-all duration-fast whitespace-nowrap font-semibold',
          variantClasses.item,
          isActive(t) ? variantClasses.active : variantClasses.inactive,
        ]"
        @click="onClick(t)"
      >
        <component :is="t.icon" v-if="t.icon" class="w-4 h-4" />
        <span>{{ t.label }}</span>
        <span v-if="t.badge != null" :class="[variantClasses.badge]">{{ t.badge }}</span>
      </component>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  /**
   * tabs: [{ value, label, icon?, to?, badge?, disabled? }]
   * - Use `to` for router-driven tabs; else use v-model on `modelValue`.
   */
  tabs:       { type: Array, required: true },
  modelValue: { type: String, default: '' },
  /** underline (default, page-level) | pill (compact, in-card) */
  variant:    { type: String, default: 'underline' },
});
const emit = defineEmits(['update:modelValue', 'change']);

const route = useRoute();

function isActive(t) {
  if (t.to) return route.path === (typeof t.to === 'string' ? t.to : t.to.path);
  return props.modelValue === t.value;
}

function onClick(t) {
  if (t.disabled) return;
  if (!t.to) {
    emit('update:modelValue', t.value);
    emit('change', t.value);
  }
}

const variantClasses = computed(() => props.variant === 'pill' ? {
  // Pill tabs — compact, sit inline (in-card use). Left-aligned, hugs
  // content. Deliberately NOT full width so a "Yes / Maybe / No" pill
  // group doesn't stretch across a wide table.
  container: 'inline-flex items-center gap-1 p-1 rounded-xl surface-inset',
  item:     'text-sm rounded-lg px-3 py-1.5',
  active:   'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone',
  inactive: 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone',
  badge:    'ml-1 px-1.5 py-0.5 rounded text-2xs font-bold bg-surface-mist dark:bg-surface-fog',
} : {
  // Underline tabs — page-level. Bottom border spans the full container
  // width so the underline connects across the whole tab strip visually,
  // not just under the pills. Overflow-scroll on narrow viewports.
  container: 'flex items-stretch border-b border-surface-mist dark:border-surface-fog overflow-x-auto hide-scrollbar',
  item:     'text-md px-4 py-3 border-b-2 -mb-px whitespace-nowrap',
  active:   'border-brand-primary text-surface-charcoal dark:text-surface-bone',
  inactive: 'border-transparent text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone hover:border-surface-mist dark:hover:border-surface-fog',
  badge:    'ml-1 px-1.5 py-0.5 rounded text-2xs font-bold bg-surface-mist dark:bg-surface-fog',
});

const listClasses = computed(() => variantClasses.value.container);
</script>
