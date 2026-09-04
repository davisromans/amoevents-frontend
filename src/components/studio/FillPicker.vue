<template>
  <div class="space-y-2">
    <div class="flex gap-1">
      <button v-for="m in MODES" :key="m" class="btn-ghost !text-2xs !py-1 !px-2 flex-1"
              :class="{ 'bg-brand-primary-glow text-brand-primary-deep': mode === m }" @click="mode = m">
        {{ m }}
      </button>
      <button v-if="supportsEyedropper" class="btn-ghost !p-1" title="Pick color from screen" @click="eyedrop">
        <EyeDropperIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Solid -->
    <input v-if="mode === 'solid'" type="color" class="w-full h-8 rounded-md cursor-pointer" :value="solidValue" @input="setSolid($event.target.value)" />

    <!-- Gradient (linear/radial) -->
    <div v-else class="space-y-2">
      <div class="h-8 rounded-md border border-surface-mist dark:border-surface-fog" :style="{ background: previewCss }" />
      <div v-for="(stop, i) in stops" :key="i" class="flex items-center gap-1.5">
        <input type="color" class="w-7 h-7 rounded cursor-pointer shrink-0" :value="stop.color" @input="setStopColor(i, $event.target.value)" />
        <input type="range" min="0" max="100" class="flex-1 accent-brand-gold" :value="stop.offset * 100" @input="setStopOffset(i, Number($event.target.value) / 100)" />
        <button v-if="stops.length > 2" class="p-0.5 shrink-0" @click="removeStop(i)"><XMarkIcon class="w-3 h-3 text-surface-slate" /></button>
      </div>
      <button class="btn-ghost !text-2xs !py-1 w-full" @click="addStop">+ Add stop</button>
    </div>

    <!-- Saved palette -->
    <div>
      <div class="flex items-center justify-between">
        <p class="field-label">Palette</p>
        <button class="text-2xs text-brand-primary font-bold" @click="saveToPalette">+ Save current</button>
      </div>
      <div class="flex flex-wrap gap-1 mt-1">
        <button v-for="(c, i) in palette" :key="i" class="w-5 h-5 rounded-full border border-surface-mist dark:border-surface-fog"
                :style="{ background: c }" @click="applyPaletteColor(c)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { EyeDropperIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import * as fabric from 'fabric';

const props = defineProps({
  modelValue: { type: [String, Object], default: '#000000' }, // string hex OR a fabric.Gradient instance
});
const emit = defineEmits(['update:modelValue']);

const MODES = ['solid', 'linear', 'radial'];
const mode = ref('solid');
const solidValue = ref('#000000');
const stops = ref([{ offset: 0, color: '#7C3AED' }, { offset: 1, color: '#EC4899' }]);
const palette = ref([]);

const PALETTE_KEY = 'studio_saved_palette';

function loadFromModelValue() {
  const v = props.modelValue;
  if (v && typeof v === 'object' && v.colorStops) {
    mode.value = v.type === 'radial' ? 'radial' : 'linear';
    stops.value = v.colorStops.map((s) => ({ offset: s.offset, color: s.color }));
  } else if (typeof v === 'string') {
    mode.value = 'solid';
    solidValue.value = v.startsWith('#') ? v : '#000000';
  }
}

const supportsEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;
async function eyedrop() {
  try {
    const ed = new window.EyeDropper();
    const result = await ed.open();
    if (mode.value === 'solid') setSolid(result.sRGBHex);
    else setStopColor(0, result.sRGBHex);
  } catch { /* user cancelled the picker — nothing to do */ }
}

const previewCss = computed(() => {
  const stopsCss = stops.value.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return mode.value === 'radial' ? `radial-gradient(circle, ${stopsCss})` : `linear-gradient(90deg, ${stopsCss})`;
});

function emitGradient() {
  const gradient = new fabric.Gradient({
    type: mode.value,
    coords: mode.value === 'radial'
      ? { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, r1: 0, r2: 0.5 }
      : { x1: 0, y1: 0, x2: 1, y2: 0 },
    gradientUnits: 'percentage',
    colorStops: stops.value.map((s) => ({ offset: s.offset, color: s.color })),
  });
  emit('update:modelValue', gradient);
}

function setSolid(hex) { solidValue.value = hex; emit('update:modelValue', hex); }
function setStopColor(i, hex) { stops.value[i].color = hex; emitGradient(); }
function setStopOffset(i, offset) { stops.value[i].offset = offset; emitGradient(); }
function addStop() { stops.value.push({ offset: 1, color: '#FFFFFF' }); emitGradient(); }
function removeStop(i) { stops.value.splice(i, 1); emitGradient(); }

watch(mode, (m) => { if (m !== 'solid') emitGradient(); else setSolid(solidValue.value); });

function loadPalette() { palette.value = JSON.parse(localStorage.getItem(PALETTE_KEY) || '[]'); }
function saveToPalette() {
  const color = mode.value === 'solid' ? solidValue.value : stops.value[0].color;
  if (!palette.value.includes(color)) {
    palette.value.push(color);
    localStorage.setItem(PALETTE_KEY, JSON.stringify(palette.value));
  }
}
function applyPaletteColor(c) {
  if (mode.value === 'solid') setSolid(c);
  else setStopColor(0, c);
}

onMounted(() => { loadFromModelValue(); loadPalette(); });
</script>
