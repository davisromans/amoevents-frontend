<template>
  <div>
    <label v-if="label" class="field-label">{{ label }}</label>
    <div class="flex gap-2">
      <select v-model="dial" class="field-input !w-28 shrink-0 font-mono">
        <option v-for="c in COUNTRIES" :key="c.iso" :value="c.dial">
          {{ c.flag }} +{{ c.dial }}
        </option>
      </select>
      <input v-model="local" @blur="emitFull" @input="emitFull"
             class="field-input flex-1" inputmode="numeric"
             :placeholder="placeholder || '712 345 678'" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  defaultDial: { type: String, default: '255' },
});
const emit = defineEmits(['update:modelValue']);

// Kept short on purpose — East Africa first, then wider region. Add more as
// tenants ask. Order matters (Tanzania default).
const COUNTRIES = [
  { iso: 'TZ', dial: '255', flag: '🇹🇿' },
  { iso: 'KE', dial: '254', flag: '🇰🇪' },
  { iso: 'UG', dial: '256', flag: '🇺🇬' },
  { iso: 'RW', dial: '250', flag: '🇷🇼' },
  { iso: 'BI', dial: '257', flag: '🇧🇮' },
  { iso: 'ZM', dial: '260', flag: '🇿🇲' },
  { iso: 'MW', dial: '265', flag: '🇲🇼' },
  { iso: 'ZA', dial: '27',  flag: '🇿🇦' },
  { iso: 'NG', dial: '234', flag: '🇳🇬' },
  { iso: 'GH', dial: '233', flag: '🇬🇭' },
  { iso: 'US', dial: '1',   flag: '🇺🇸' },
  { iso: 'GB', dial: '44',  flag: '🇬🇧' },
];

const dial = ref(props.defaultDial);
const local = ref('');

function parseIncoming(v) {
  if (!v) { local.value = ''; return; }
  const digits = String(v).replace(/\D/g, '');
  const match = COUNTRIES.find((c) => digits.startsWith(c.dial));
  if (match) { dial.value = match.dial; local.value = digits.slice(match.dial.length); }
  else { local.value = digits; }
}

watch(() => props.modelValue, (v) => {
  const current = '+' + dial.value + local.value.replace(/\D/g, '');
  if (v !== current) parseIncoming(v);
}, { immediate: true });

function emitFull() {
  const digits = local.value.replace(/\D/g, '').replace(/^0+/, ''); // strip leading zero
  emit('update:modelValue', digits ? `+${dial.value}${digits}` : '');
}
watch(dial, emitFull);
</script>
