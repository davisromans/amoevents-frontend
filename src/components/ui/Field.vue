<template>
  <div :class="wrapperClass">
    <label v-if="label" :for="id" class="field-label flex items-center gap-1.5">
      {{ label }}
      <span v-if="required" class="text-state-danger normal-case tracking-normal">*</span>
      <span v-if="optional" class="text-surface-slate dark:text-surface-ash text-2xs normal-case tracking-normal font-medium">(optional)</span>
    </label>

    <slot :id="id" :invalid="!!error" :aria-describedby="describedBy" />

    <p v-if="error" :id="`${id}-err`" class="field-error">{{ error }}</p>
    <p v-else-if="help" :id="`${id}-help`" class="field-help">{{ help }}</p>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue';

const props = defineProps({
  label:    { type: String, default: '' },
  help:     { type: String, default: '' },
  error:    { type: String, default: '' },
  required: { type: Boolean, default: false },
  optional: { type: Boolean, default: false }, // only shows when true — never both.
  inline:   { type: Boolean, default: false }, // for a horizontal label/input pair.
});

// One id per field, threaded through to <label for="…"> and to
// aria-describedby on the input. Every form primitive that renders inside
// this Field reads `id` off the default-slot props.
const id = useId ? useId() : `field-${Math.random().toString(36).slice(2, 8)}`;

const wrapperClass = computed(() => props.inline
  ? 'flex items-center gap-3'
  : 'block');

const describedBy = computed(() => (props.error ? `${id}-err` : props.help ? `${id}-help` : undefined));
</script>
