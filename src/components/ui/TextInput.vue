<template>
  <div class="relative">
    <span v-if="$slots.leading" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash pointer-events-none">
      <slot name="leading" />
    </span>
    <input
      :id="id"
      :type="effectiveType"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="invalid || undefined"
      :aria-describedby="ariaDescribedby"
      :class="[
        'field-input',
        invalid ? 'field-input--invalid' : '',
        $slots.leading ? 'pl-10' : '',
        (togglePassword || $slots.trailing) ? 'pr-11' : '',
        thousands ? 'tabular-nums' : '',
      ]"
      @input="onInput"
      @blur="$emit('blur', $event)"
    />
    <button
      v-if="togglePassword"
      type="button"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-surface-slate hover:text-surface-charcoal dark:text-surface-ash dark:hover:text-surface-bone hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 transition-colors duration-fast"
      @click="visible = !visible"
    >
      <EyeSlashIcon v-if="visible" class="w-4 h-4" />
      <EyeIcon v-else class="w-4 h-4" />
    </button>
    <span v-else-if="$slots.trailing" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash">
      <slot name="trailing" />
    </span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue:   { type: [String, Number], default: '' },
  id:           { type: String, default: undefined },
  type:         { type: String, default: 'text' },
  placeholder:  { type: String, default: '' },
  required:     { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
  inputmode:    { type: String, default: undefined },
  disabled:     { type: Boolean, default: false },
  readonly:     { type: Boolean, default: false },
  invalid:      { type: Boolean, default: false },
  ariaDescribedby: { type: String, default: undefined },
  /** Adds thousands-separator display + numeric emit. Emits a Number. */
  thousands:    { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'blur']);

const visible = ref(false);
const togglePassword = computed(() => props.type === 'password');
const effectiveType = computed(() => {
  if (togglePassword.value) return visible.value ? 'text' : 'password';
  return props.thousands ? 'text' : props.type;
});

function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = String(v).replace(/[^\d]/g, '');
  return n ? Number(n).toLocaleString('en-US') : '';
}

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
