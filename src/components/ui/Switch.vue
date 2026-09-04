<template>
  <label class="inline-flex items-center gap-3 cursor-pointer select-none" :class="disabled ? 'opacity-50 cursor-not-allowed' : ''">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-fast focus-visible:ring-4 focus-visible:ring-brand-primary-glow"
      :class="modelValue ? 'bg-brand-primary' : 'bg-surface-mist dark:bg-surface-fog'"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span
        class="inline-block h-5 w-5 rounded-full bg-white shadow-elev-1 transform transition-transform duration-fast ease-out-quart"
        :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"
      />
    </button>
    <span v-if="label || $slots.default" class="text-md text-surface-charcoal dark:text-surface-bone">
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
});
defineEmits(['update:modelValue']);
</script>
