<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20" @mousedown.self="$emit('close')">
    <div class="surface-card shadow-card rounded-xl w-80 p-4 space-y-3" @keydown.esc="$emit('close')">
      <h3 class="text-sm font-bold">{{ mode === 'canvas' ? 'Canvas Size' : 'Image Size' }}</h3>
      <p class="text-2xs text-surface-slate">Current: {{ width }} × {{ height }} px</p>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-2xs font-semibold space-y-1">Width (px)
          <input v-model.number="w" type="number" min="1" class="field-input !py-1 !text-sm" @input="onW" />
        </label>
        <label class="text-2xs font-semibold space-y-1">Height (px)
          <input v-model.number="h" type="number" min="1" class="field-input !py-1 !text-sm" @input="onH" />
        </label>
      </div>
      <label v-if="mode === 'image'" class="flex items-center gap-2 text-2xs">
        <input v-model="lockRatio" type="checkbox" class="accent-brand-gold" /> Constrain proportions
      </label>
      <div v-if="mode === 'canvas'" class="space-y-1">
        <p class="text-2xs font-semibold">Anchor</p>
        <div class="grid grid-cols-3 gap-1 w-24">
          <button v-for="a in ANCHORS" :key="a" type="button" class="h-7 rounded border text-2xs"
                  :class="anchor === a ? 'bg-brand-primary text-white border-brand-primary' : 'border-surface-mist dark:border-surface-fog'"
                  @click="anchor = a">{{ anchor === a ? '●' : '' }}</button>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button class="btn-ghost !text-2xs !py-1.5 !px-3" @click="$emit('close')">Cancel</button>
        <button class="btn-primary !text-2xs !py-1.5 !px-4" :disabled="!(w > 0 && h > 0)" @click="ok">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  mode: { type: String, required: true }, // 'canvas' | 'image'
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});
const emit = defineEmits(['close', 'apply']);

const ANCHORS = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'];
const w = ref(props.width);
const h = ref(props.height);
const anchor = ref('c');
const lockRatio = ref(true);
const ratio = props.width / props.height;

function onW() { if (props.mode === 'image' && lockRatio.value && w.value > 0) h.value = Math.round(w.value / ratio); }
function onH() { if (props.mode === 'image' && lockRatio.value && h.value > 0) w.value = Math.round(h.value * ratio); }
function ok() {
  emit('apply', { width: Math.round(w.value), height: Math.round(h.value), anchor: anchor.value });
  emit('close');
}
</script>
