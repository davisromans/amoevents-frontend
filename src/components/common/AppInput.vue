<template>
  <label class="block">
    <span v-if="label" class="field-label">{{ label }}</span>
    <div v-if="type !== 'textarea'" class="relative">
      <input
        :type="isPassword ? (visible ? 'text' : 'password') : (thousands ? 'text' : type)"
        :value="displayValue"
        :placeholder="placeholder"
        :required="required"
        :autocomplete="autocomplete"
        :inputmode="effectiveInputmode"
        :disabled="disabled"
        class="field-input"
        :class="{ 'pr-11': isPassword, 'tabular-nums': thousands }"
        @input="onInput"
      />
      <button
        v-if="isPassword"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-surface-slate hover:text-surface-charcoal dark:text-surface-ash dark:hover:text-surface-bone"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <EyeSlashIcon v-if="visible" class="w-4 h-4" />
        <EyeIcon v-else class="w-4 h-4" />
      </button>
    </div>
    <textarea
      v-else
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      class="field-input resize-y min-h-[80px]"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="help && !error" class="field-help">{{ help }}</span>
    <span v-if="error" class="field-error">{{ error }}</span>
  </label>
</template>

<script setup>
import { computed, ref } from 'vue';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  required: Boolean,
  autocomplete: String,
  inputmode: String,
  disabled: Boolean,
  rows: { type: Number, default: 3 },
  help: String,
  error: String,
  thousands: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const isPassword = computed(() => props.type === 'password');
const visible = ref(false);

const effectiveInputmode = computed(() => {
  if (props.inputmode) return props.inputmode;
  if (props.type === 'number' || props.thousands) return 'numeric';
  return undefined;
});

function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = String(v).replace(/[^\d]/g, '');
  if (!n) return '';
  return Number(n).toLocaleString('en-US');
}

const displayValue = computed(() => (props.thousands ? fmt(props.modelValue) : props.modelValue));

function onInput(e) {
  if (props.thousands) {
    const digits = e.target.value.replace(/[^\d]/g, '');
    const num = digits ? Number(digits) : null;
    e.target.value = fmt(digits);
    emit('update:modelValue', num);
  } else {
    emit('update:modelValue', e.target.value);
  }
}
</script>
