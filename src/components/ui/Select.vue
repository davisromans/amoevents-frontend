<template>
  <div class="relative">
    <select
      :id="id"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-describedby="ariaDescribedby"
      :class="['field-input appearance-none cursor-pointer pr-10', invalid ? 'field-input--invalid' : '']"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-surface-slate dark:text-surface-ash"
         viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8l4 4 4-4" />
    </svg>
  </div>
</template>

<script setup>
defineProps({
  modelValue:  { type: [String, Number, null], default: '' },
  options:     { type: Array, required: true }, // [{ value, label }]
  id:          { type: String, default: undefined },
  placeholder: { type: String, default: '' },
  required:    { type: Boolean, default: false },
  disabled:    { type: Boolean, default: false },
  invalid:     { type: Boolean, default: false },
  ariaDescribedby: { type: String, default: undefined },
});
defineEmits(['update:modelValue']);
</script>
