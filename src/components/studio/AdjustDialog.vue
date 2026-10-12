<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20" @mousedown.self="cancel">
    <div class="surface-card shadow-card rounded-xl w-80 p-4 space-y-3" @keydown.enter="ok" @keydown.esc="cancel">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold">{{ title }}</h3>
        <label class="flex items-center gap-1.5 text-2xs">
          <input v-model="preview" type="checkbox" class="accent-brand-gold" @change="apply" /> Preview
        </label>
      </div>
      <div v-for="c in controls" :key="c.key" class="space-y-1">
        <div class="flex justify-between text-2xs font-semibold">
          <span>{{ c.label }}</span>
          <input v-model.number="values[c.key]" type="number" :step="c.step || 0.01" :min="c.min" :max="c.max"
                 class="w-16 text-right bg-transparent outline-none tabular-nums" @input="apply" />
        </div>
        <input v-model.number="values[c.key]" type="range" :min="c.min" :max="c.max" :step="c.step || 0.01"
               class="w-full accent-brand-primary" @input="apply" />
      </div>
      <p v-if="!controls.length" class="text-2xs text-surface-slate">Applies instantly — use Undo to remove.</p>
      <div class="flex justify-between pt-1">
        <button class="btn-ghost !text-2xs !py-1.5 !px-3" @click="reset">Reset</button>
        <div class="flex gap-2">
          <button class="btn-ghost !text-2xs !py-1.5 !px-3" @click="cancel">Cancel</button>
          <button class="btn-primary !text-2xs !py-1.5 !px-4" @click="ok">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { rebuildFilterStack } from '@/utils/filtersGallery';

// Live, cancellable edit of an image layer's non-destructive filter stack.
// controls: [{ key, label, kind: 'adj' | 'gallery', min, max, step, default }]
// 'adj' writes data.adjustments[key] (brightness/contrast/saturation/hue);
// 'gallery' writes data.galleryFilters[key]. Both survive save/reload and
// are re-applied by the server card renderer.
const props = defineProps({
  canvas: { type: Object, required: true },
  target: { type: Object, required: true },
  title: { type: String, required: true },
  controls: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'commit']);

const snapshot = JSON.parse(JSON.stringify({
  adjustments: props.target.get('data')?.adjustments || {},
  galleryFilters: props.target.get('data')?.galleryFilters || {},
}));
const values = reactive({});
const preview = ref(true);

function current(c) {
  const bucket = c.kind === 'adj' ? snapshot.adjustments : snapshot.galleryFilters;
  return bucket[c.key] ?? c.default;
}

function write(useValues) {
  const data = props.target.get('data') || {};
  const adjustments = { ...snapshot.adjustments };
  const galleryFilters = { ...snapshot.galleryFilters };
  if (useValues) {
    for (const c of props.controls) {
      const v = Number(values[c.key]);
      const neutral = c.neutral ?? 0;
      const bucket = c.kind === 'adj' ? adjustments : galleryFilters;
      if (Math.abs(v - neutral) < 1e-6) delete bucket[c.key]; else bucket[c.key] = v;
    }
  }
  props.target.set('data', { ...data, adjustments, galleryFilters });
  rebuildFilterStack(props.target);
  props.canvas.requestRenderAll();
}

function apply() { write(preview.value); }
function reset() { for (const c of props.controls) values[c.key] = c.neutral ?? 0; apply(); }
function ok() { write(true); emit('commit'); emit('close'); }
function cancel() { write(false); emit('close'); }

onMounted(() => {
  for (const c of props.controls) values[c.key] = current(c);
  apply();
});
</script>
