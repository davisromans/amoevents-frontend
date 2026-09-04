<template>
  <label class="block">
    <span v-if="label" class="field-label">{{ label }}</span>
    <select
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="field-input appearance-none cursor-pointer bg-[length:16px] bg-no-repeat"
      style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%23C8A24B%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 12px center; padding-right: 36px;"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: String,
  options: { type: Array, required: true },
  required: Boolean,
  disabled: Boolean,
});
defineEmits(['update:modelValue']);
</script>
