<template>
  <textarea
    :id="id"
    :value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :rows="rows"
    :maxlength="maxlength"
    :aria-invalid="invalid || undefined"
    :aria-describedby="ariaDescribedby"
    :class="['field-input resize-y min-h-[92px]', invalid ? 'field-input--invalid' : '']"
    @input="$emit('update:modelValue', $event.target.value)"
    @blur="$emit('blur', $event)"
  />
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  id:         { type: String, default: undefined },
  placeholder:{ type: String, default: '' },
  required:   { type: Boolean, default: false },
  disabled:   { type: Boolean, default: false },
  readonly:   { type: Boolean, default: false },
  invalid:    { type: Boolean, default: false },
  ariaDescribedby: { type: String, default: undefined },
  rows:       { type: Number, default: 4 },
  maxlength:  { type: Number, default: undefined },
});
defineEmits(['update:modelValue', 'blur']);
</script>
