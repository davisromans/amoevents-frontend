<template>
  <div class="flex items-center gap-2 justify-between max-w-sm">
    <input
      v-for="(_, i) in length"
      :key="i"
      :ref="(el) => (boxRefs[i] = el)"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      :value="chars[i]"
      :aria-label="`Digit ${i + 1}`"
      class="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black tabular-nums rounded-xl border border-surface-mist dark:border-surface-fog bg-surface-cream dark:bg-surface-night text-surface-charcoal dark:text-surface-bone focus:border-brand-primary focus:ring-4 focus:ring-brand-primary-glow outline-none transition-all duration-fast"
      @input="onInput(i, $event)"
      @keydown="onKey(i, $event)"
      @paste="onPaste"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  length:     { type: Number, default: 6 },
});
const emit = defineEmits(['update:modelValue', 'complete']);

const boxRefs = ref([]);
const chars = computed(() => {
  const s = String(props.modelValue || '').padEnd(props.length, ' ').slice(0, props.length);
  return [...s];
});

function setDigit(i, v) {
  const arr = [...(props.modelValue || '').padEnd(props.length, ' ').slice(0, props.length)];
  arr[i] = v || ' ';
  const next = arr.join('').replace(/\s/g, '');
  emit('update:modelValue', next);
  if (next.length === props.length) emit('complete', next);
}

function focus(i) {
  const box = boxRefs.value[i];
  if (box) { box.focus(); box.select(); }
}

function onInput(i, e) {
  // Strip anything non-digit and take the last char (handles Android
  // "one-time-code" autofill dumping the whole SMS code into box 0).
  const digits = String(e.target.value || '').replace(/\D/g, '');
  if (digits.length > 1) {
    // Pasted / autofilled multiple digits — distribute across boxes.
    for (let k = 0; k < Math.min(digits.length, props.length - i); k++) {
      setDigit(i + k, digits[k]);
    }
    nextTick(() => focus(Math.min(i + digits.length, props.length - 1)));
    return;
  }
  const ch = digits.slice(-1);
  setDigit(i, ch);
  e.target.value = ch;
  if (ch && i < props.length - 1) nextTick(() => focus(i + 1));
}

function onKey(i, e) {
  if (e.key === 'Backspace' && !chars.value[i].trim() && i > 0) {
    setDigit(i - 1, '');
    nextTick(() => focus(i - 1));
  } else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); focus(i - 1); }
  else if (e.key === 'ArrowRight' && i < props.length - 1) { e.preventDefault(); focus(i + 1); }
}

function onPaste(e) {
  const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, props.length);
  if (!text) return;
  e.preventDefault();
  emit('update:modelValue', text);
  nextTick(() => focus(Math.min(text.length, props.length - 1)));
  if (text.length === props.length) emit('complete', text);
}

// External clears (form.reset) should snap focus back to the first box.
watch(() => props.modelValue, (v) => { if (!v) nextTick(() => focus(0)); });
</script>
