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
      <div class="flex items-center gap-2">
        <label v-if="mode === 'linear'" class="text-2xs font-semibold flex-1">Angle — {{ angle }}°
          <input v-model.number="angle" type="range" min="0" max="360" step="1" class="w-full accent-brand-gold" @input="emitGradient" />
        </label>
        <button class="btn-ghost !text-2xs !py-1 shrink-0" @click="reverseStops">Reverse</button>
      </div>
      <div v-for="(stop, i) in stops" :key="i" class="flex items-center gap-1.5">
        <input type="color" class="w-7 h-7 rounded cursor-pointer shrink-0" :value="stop.color" @input="setStopColor(i, $event.target.value)" />
        <input type="range" min="0" max="100" class="flex-1 accent-brand-gold" :value="stop.offset * 100" @input="setStopOffset(i, Number($event.target.value) / 100)" />
        <input type="number" min="0" max="100" class="field-input !py-1 !px-1 !text-[10px] w-12" title="Opacity percent" :value="Math.round((stop.opacity ?? 1) * 100)" @input="setStopOpacity(i, Number($event.target.value) / 100)" />
        <button v-if="stops.length > 2" class="p-0.5 shrink-0" @click="removeStop(i)"><XMarkIcon class="w-3 h-3 text-surface-slate" /></button>
      </div>
      <div class="grid grid-cols-2 gap-1"><button class="btn-ghost !text-2xs !py-1" @click="addStop">+ Add stop</button><button class="btn-ghost !text-2xs !py-1" @click="saveGradientPreset">Save gradient</button></div>
      <div v-if="gradientPresets.length" class="flex gap-1 overflow-x-auto pb-1">
        <button v-for="preset in gradientPresets" :key="preset.id" class="w-12 h-7 rounded-md border border-surface-mist dark:border-surface-fog shrink-0" :style="{ background: gradientCss(preset) }" :title="preset.name" @click="applyGradientPreset(preset)" />
      </div>
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
const stops = ref([{ offset: 0, color: '#7C3AED', opacity: 1 }, { offset: 1, color: '#EC4899', opacity: 1 }]);
const angle = ref(90);
const palette = ref([]);
const gradientPresets = ref([]);

const PALETTE_KEY = 'studio_saved_palette';
const GRADIENT_KEY = 'studio_saved_gradients_v1';

function loadFromModelValue() {
  const v = props.modelValue;
  if (v && typeof v === 'object' && v.colorStops) {
    mode.value = v.type === 'radial' ? 'radial' : 'linear';
    stops.value = v.colorStops.map((s) => ({ offset: s.offset, color: normalizeColor(s.color), opacity: colorOpacity(s.color) }));
    if (v.type !== 'radial' && v.coords) angle.value = Math.round((Math.atan2((v.coords.y2 || 0) - (v.coords.y1 || 0), (v.coords.x2 || 0) - (v.coords.x1 || 0)) * 180 / Math.PI + 360) % 360);
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
  return gradientCss({ type: mode.value, angle: angle.value, stops: stops.value });
});

function normalizeColor(color) { return String(color || '#000000').match(/^#[0-9a-f]{6}/i)?.[0] || '#000000'; }
function colorOpacity(color) { const match = String(color || '').match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/i); return match ? Number(match[1]) : 1; }
function rgba(hex, opacity) {
  if ((opacity ?? 1) >= 0.999) return hex;
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${Math.max(0, Math.min(1, opacity))})`;
}
function gradientCss(value) {
  const list = (value.stops || []).map((s) => `${rgba(s.color, s.opacity)} ${Math.round(s.offset * 100)}%`).join(', ');
  return value.type === 'radial' ? `radial-gradient(circle, ${list})` : `linear-gradient(${value.angle ?? 90}deg, ${list})`;
}

function emitGradient() {
  const radians = angle.value * Math.PI / 180;
  const x = Math.cos(radians) * 0.5;
  const y = Math.sin(radians) * 0.5;
  const gradient = new fabric.Gradient({
    type: mode.value,
    coords: mode.value === 'radial'
      ? { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, r1: 0, r2: 0.5 }
      : { x1: 0.5 - x, y1: 0.5 - y, x2: 0.5 + x, y2: 0.5 + y },
    gradientUnits: 'percentage',
    colorStops: [...stops.value].sort((a, b) => a.offset - b.offset).map((s) => ({ offset: s.offset, color: rgba(s.color, s.opacity) })),
  });
  emit('update:modelValue', gradient);
}

function setSolid(hex) { solidValue.value = hex; emit('update:modelValue', hex); }
function setStopColor(i, hex) { stops.value[i].color = hex; emitGradient(); }
function setStopOffset(i, offset) { stops.value[i].offset = offset; emitGradient(); }
function setStopOpacity(i, opacity) { stops.value[i].opacity = Math.max(0, Math.min(1, opacity)); emitGradient(); }
function addStop() { stops.value.push({ offset: 0.5, color: '#FFFFFF', opacity: 1 }); emitGradient(); }
function removeStop(i) { stops.value.splice(i, 1); emitGradient(); }
function reverseStops() { stops.value = stops.value.map((s) => ({ ...s, offset: 1 - s.offset })).reverse(); emitGradient(); }

function saveGradientPreset() {
  const name = window.prompt('Gradient name', `Gradient ${gradientPresets.value.length + 1}`)?.trim();
  if (!name) return;
  gradientPresets.value.push({ id: `gradient-${Date.now()}`, name, type: mode.value, angle: angle.value, stops: stops.value.map((s) => ({ ...s })) });
  localStorage.setItem(GRADIENT_KEY, JSON.stringify(gradientPresets.value));
}
function applyGradientPreset(preset) { mode.value = preset.type; angle.value = preset.angle ?? 90; stops.value = preset.stops.map((s) => ({ ...s })); emitGradient(); }

watch(mode, (m) => { if (m !== 'solid') emitGradient(); else setSolid(solidValue.value); });
// The Studio keeps this control mounted while the selection changes. Without
// watching the prop, the picker continued to edit the *previous* layer's
// colour after the user selected another rectangle — it looked like swatches
// and colour actions did nothing to the newly selected shape.
watch(() => props.modelValue, loadFromModelValue, { deep: true });

function loadPalette() {
  palette.value = JSON.parse(localStorage.getItem(PALETTE_KEY) || '[]');
  gradientPresets.value = JSON.parse(localStorage.getItem(GRADIENT_KEY) || '[]');
}
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
