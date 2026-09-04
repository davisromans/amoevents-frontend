<template>
  <label class="inline-flex items-start gap-2.5 cursor-pointer select-none" :class="disabled ? 'opacity-50 cursor-not-allowed' : ''">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-describedby="ariaDescribedby"
      class="sr-only peer"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all duration-fast
                 border-surface-mist dark:border-surface-fog bg-surface-cream dark:bg-surface-night
                 peer-checked:bg-brand-primary peer-checked:border-brand-primary
                 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-primary-glow">
      <svg v-if="modelValue" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
    </span>
    <span v-if="label || $slots.default" class="text-md text-surface-charcoal dark:text-surface-bone leading-snug">
      <slot>{{ label }}</slot>
      <span v-if="description" class="block text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ description }}</span>
    </span>
  </label>
</template>

<script setup>
defineProps({
  modelValue:  { type: Boolean, default: false },
  label:       { type: String, default: '' },
  description: { type: String, default: '' },
  disabled:    { type: Boolean, default: false },
  ariaDescribedby: { type: String, default: undefined },
});
defineEmits(['update:modelValue']);
</script>
