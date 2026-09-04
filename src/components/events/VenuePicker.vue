<template>
  <div class="space-y-3">
    <AppInput
      v-model="local.name"
      label="Venue name"
      placeholder="e.g. Serena Hotel"
      @update:modelValue="emitAll"
    />
    <AppInput
      v-model="local.address"
      label="Address"
      placeholder="e.g. Kilimanjaro Street, Dar es Salaam"
      @update:modelValue="emitAll"
    />

    <div>
      <label class="field-label">Paste Google Maps coordinates</label>
      <div class="relative">
        <input
          v-model="coordPaste"
          @input="parseCoords"
          @paste="onPaste"
          class="field-input pr-10 tabular-nums"
          placeholder="-6.842238, 39.180852"
        />
        <MapPinIcon class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-slate" />
      </div>
      <p class="field-help">
        In Google Maps: long-press the location → tap the coordinates that appear at the top → paste them here.
      </p>
      <p v-if="parseError" class="field-error">{{ parseError }}</p>
    </div>

    <div v-if="local.lat && local.lng" class="surface-inset p-3 flex items-center justify-between gap-3">
      <p class="text-sm text-surface-charcoal dark:text-surface-bone tabular-nums">
        📍 {{ local.lat.toFixed(6) }}, {{ local.lng.toFixed(6) }}
      </p>
      <a
        class="text-brand-gold-deep dark:text-brand-gold-soft text-sm font-bold hover:underline shrink-0"
        :href="`https://www.google.com/maps/search/?api=1&query=${local.lat},${local.lng}`"
        target="_blank" rel="noopener"
      >Open in Maps</a>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { MapPinIcon } from '@heroicons/vue/24/outline';
import AppInput from '@/components/common/AppInput.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({ name: '', address: '', lat: null, lng: null }) },
});
const emit = defineEmits(['update:modelValue']);

const local = reactive({
  name: props.modelValue?.name || '',
  address: props.modelValue?.address || '',
  lat: props.modelValue?.lat ?? null,
  lng: props.modelValue?.lng ?? null,
});

const coordPaste = ref(local.lat && local.lng ? `${local.lat}, ${local.lng}` : '');
const parseError = ref('');

// Accepts many shapes people paste:
//   "-6.842238, 39.180852"
//   "-6.842238,39.180852"
//   "-6.842238 39.180852"
//   "@-6.842238,39.180852,17z"  (from a Google Maps URL)
function parseCoords() {
  parseError.value = '';
  const raw = String(coordPaste.value || '').trim();
  if (!raw) { local.lat = null; local.lng = null; emitAll(); return; }
  const m = raw.match(/(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) { parseError.value = 'Paste two numbers like: -6.842238, 39.180852'; return; }
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    parseError.value = 'Coordinates out of range'; return;
  }
  local.lat = lat;
  local.lng = lng;
  emitAll();
}

function onPaste(e) {
  // If the user pastes a full google-maps URL, extract the @lat,lng,zoom fragment.
  const text = e.clipboardData?.getData('text');
  if (!text) return;
  const m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    e.preventDefault();
    coordPaste.value = `${m[1]}, ${m[2]}`;
    parseCoords();
  }
}

function emitAll() {
  emit('update:modelValue', { name: local.name, address: local.address, lat: local.lat, lng: local.lng });
}

watch(() => props.modelValue, (v) => {
  if (!v) return;
  local.name = v.name || '';
  local.address = v.address || '';
  local.lat = v.lat ?? null;
  local.lng = v.lng ?? null;
  coordPaste.value = local.lat && local.lng ? `${local.lat}, ${local.lng}` : '';
}, { deep: true });
</script>
