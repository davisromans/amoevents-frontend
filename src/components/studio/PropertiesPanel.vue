<template>
  <div class="flex flex-col gap-4">
    <p v-if="!selected.length" class="text-2xs text-surface-slate dark:text-surface-ash">
      Select a layer to edit it.
    </p>

    <template v-else>
      <!-- Multi-select: align & distribute only -->
      <div v-if="selected.length > 1" class="space-y-3">
        <p class="section-eyebrow">{{ selected.length }} layers selected</p>
        <div>
          <p class="field-label mb-1">Align to selection</p>
          <div class="grid grid-cols-3 gap-1">
            <button v-for="m in ALIGN_MODES" :key="m.value" class="btn-ghost !p-1.5" :title="m.label" @click="align(m.value)">
              <component :is="m.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div v-if="selected.length > 2">
          <p class="field-label mb-1">Distribute evenly</p>
          <div class="grid grid-cols-2 gap-1">
            <button class="btn-ghost !text-2xs !py-1.5" @click="distribute('horizontal')">Horizontal</button>
            <button class="btn-ghost !text-2xs !py-1.5" @click="distribute('vertical')">Vertical</button>
          </div>
        </div>
        <div v-if="selected.length === 2">
          <p class="field-label mb-1">Masking</p>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('clip-mask', selected)">
            Clip top shape to bottom layer
          </button>
        </div>
      </div>

      <!-- Single selection -->
      <template v-else>
        <!-- Text controls (Batch 10) -->
        <div v-if="obj.type === 'textbox'" class="space-y-3">
          <div v-if="!currentBinding">
            <p class="field-label mb-1">Text</p>
            <textarea class="field-input !text-xs w-full" rows="3" :value="obj.text" @change="setProp('text', $event.target.value)" />
          </div>
          <div>
            <p class="field-label mb-1">Variable</p>
            <select class="field-input !py-1.5 !text-xs" value="" @mousedown="cacheSelectionForVariable" @change="chooseVariable($event.target.value); $event.target.value = ''">
              <option value="" disabled>{{ hasCachedSelection() ? 'Insert into highlighted text…' : currentBinding ? 'Whole layer: ' + (BINDING_FIELDS.find(f => f.key === currentBinding)?.label || currentBinding) : 'Bind whole layer…' }}</option>
              <option v-if="currentBinding" value="__clear__">— Remove binding —</option>
              <option v-for="f in BINDING_FIELDS" :key="f.key" :value="f.key">{{ f.label }}</option>
            </select>
          </div>
          <div>
            <p class="field-label mb-1">Font{{ currentSelectionLabel }}</p>
            <FontPicker :model-value="currentFontFamily" @update:model-value="setFont" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <p class="field-label mb-1">Size{{ currentSelectionLabel }}</p>
              <input type="number" min="6" max="400" class="field-input !py-1.5 !text-xs"
                     :value="currentFontSize" @input="setTextProp('fontSize', Number($event.target.value))" />
            </div>
          </div>
          <div>
            <p class="field-label mb-1">Fill{{ currentSelectionLabel }}</p>
            <FillPicker :model-value="currentFill" @update:model-value="(v) => setTextProp('fill', v)" />
          </div>
          <div class="flex gap-1">
            <button class="btn-ghost !p-1.5 flex-1" :class="{ 'bg-brand-primary-glow': obj.fontWeight >= 700 }"
                    @click="setTextProp('fontWeight', obj.fontWeight >= 700 ? 400 : 700)">
              <BoldIcon class="w-4 h-4 mx-auto" />
            </button>
            <button class="btn-ghost !p-1.5 flex-1" :class="{ 'bg-brand-primary-glow': obj.fontStyle === 'italic' }"
                    @click="setTextProp('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic')">
              <ItalicIcon class="w-4 h-4 mx-auto" />
            </button>
            <button v-for="a in ['left','center','right']" :key="a" class="btn-ghost !p-1.5 flex-1"
                    :class="{ 'bg-brand-primary-glow': obj.textAlign === a }" @click="setProp('textAlign', a)">
              <component :is="a === 'left' ? Bars3BottomLeftIcon : a === 'center' ? Bars3Icon : Bars3BottomRightIcon" class="w-4 h-4 mx-auto" />
            </button>
          </div>
          <div>
            <p class="field-label mb-1">Line height — {{ obj.lineHeight?.toFixed(2) }}</p>
            <input type="range" min="0.8" max="2.5" step="0.02" class="w-full accent-brand-gold"
                   :value="obj.lineHeight" @input="setProp('lineHeight', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Letter spacing — {{ ((obj.charSpacing || 0) / 10).toFixed(0) }}</p>
            <input type="range" min="-50" max="400" step="5" class="w-full accent-brand-gold"
                   :value="obj.charSpacing" @input="setProp('charSpacing', Number($event.target.value))" />
          </div>
        </div>

        <!-- Shape controls -->
        <div v-else-if="['rect','ellipse','path'].includes(obj.type)" class="space-y-3">
          <div>
            <p class="field-label mb-1">Fill</p>
            <FillPicker :model-value="obj.fill" @update:model-value="(v) => setProp('fill', v)" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke</p>
            <input type="color" class="w-full h-8 rounded-md cursor-pointer" :value="toHex(obj.stroke) || '#000000'" @input="setProp('stroke', $event.target.value)" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke width — {{ obj.strokeWidth }}</p>
            <input type="range" min="0" max="40" class="w-full accent-brand-gold"
                   :value="obj.strokeWidth" @input="setProp('strokeWidth', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke style</p>
            <div class="flex gap-1">
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': !obj.strokeDashArray }" @click="setProp('strokeDashArray', null)">Solid</button>
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': dashKind(obj.strokeDashArray) === 'dashed' }" @click="setProp('strokeDashArray', [12, 6])">Dashed</button>
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': dashKind(obj.strokeDashArray) === 'dotted' }" @click="setProp('strokeDashArray', [2, 4])">Dotted</button>
            </div>
          </div>
          <div>
            <p class="field-label mb-1">Corner join</p>
            <div class="flex gap-1">
              <button v-for="j in ['miter','round','bevel']" :key="j" class="btn-ghost !text-2xs !py-1 flex-1 capitalize"
                      :class="{ 'bg-brand-primary-glow': obj.strokeLineJoin === j }" @click="setProp('strokeLineJoin', j)">{{ j }}</button>
            </div>
          </div>
          <div v-if="obj.type === 'rect'">
            <p class="field-label mb-1">Corner radius — {{ obj.rx || 0 }}</p>
            <input type="range" min="0" max="200" class="w-full accent-brand-gold" :value="obj.rx || 0"
                   @input="setProp('rx', Number($event.target.value)); setProp('ry', Number($event.target.value))" />
          </div>
        </div>

        <div v-else-if="obj.type === 'image'" class="space-y-3">
          <p class="section-eyebrow">Crop & style</p>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('start-crop', obj)">Crop</button>
          <div>
            <p class="field-label mb-1">Straighten — {{ obj.angle?.toFixed(0) }}°</p>
            <input type="range" min="-45" max="45" class="w-full accent-brand-gold" :value="obj.angle || 0" @input="setProp('angle', Number($event.target.value))" />
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button v-for="p in STYLE_PRESETS" :key="p.id" class="btn-ghost !text-2xs !py-1" @click="applyStylePreset(p)">{{ p.label }}</button>
          </div>

          <p class="section-eyebrow pt-2">Adjustments</p>
          <div v-for="a in ADJUSTMENTS" :key="a.key">
            <p class="field-label mb-1">{{ a.label }} — {{ adjustments[a.key] }}</p>
            <input type="range" :min="a.min" :max="a.max" step="0.02" class="w-full accent-brand-gold"
                   :value="adjustments[a.key]" @input="setAdjustment(a.key, Number($event.target.value))" />
          </div>

          <p class="section-eyebrow pt-2">Filters</p>
          <div v-for="f in FILTER_GALLERY" :key="f.id">
            <label class="flex items-center gap-2 text-2xs font-bold">
              <input type="checkbox" class="accent-brand-gold" :checked="!!galleryFilters[f.id]" @change="toggleFilter(f, $event.target.checked)" />
              {{ f.label }}
            </label>
            <input v-if="f.param && galleryFilters[f.id] !== undefined" type="range" :min="f.param.min" :max="f.param.max" step="0.01"
                   class="w-full accent-brand-gold mt-1" :value="galleryFilters[f.id]" @input="setFilterParam(f, Number($event.target.value))" />
          </div>

          <p class="section-eyebrow pt-2">Background</p>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" :disabled="removingBg" @click="removeBg">
            {{ removingBg ? `Removing… ${bgProgress}` : 'Remove background' }}
          </button>

          <p class="section-eyebrow pt-2">Smart object</p>
          <label class="flex items-center gap-2 text-2xs font-bold">
            <input type="checkbox" class="accent-brand-gold" :checked="isShared" @change="$emit('toggle-shared', obj, $event.target.checked)" />
            Shared across templates
          </label>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('replace-source', obj)">Replace source file…</button>
        </div>

        <p v-else class="text-2xs text-surface-slate dark:text-surface-ash">
          {{ obj.type }} — no type-specific controls yet.
        </p>

        <!-- Layer style — drop shadow (Batch 14) -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3 space-y-2">
          <label class="flex items-center gap-2 text-2xs font-bold">
            <input type="checkbox" class="accent-brand-gold" :checked="!!obj.shadow" @change="toggleShadow($event.target.checked)" />
            Drop shadow
          </label>
          <template v-if="obj.shadow">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <p class="field-label mb-1">Offset X</p>
                <input type="range" min="-40" max="40" class="w-full accent-brand-gold" :value="obj.shadow.offsetX" @input="setShadowProp('offsetX', Number($event.target.value))" />
              </div>
              <div>
                <p class="field-label mb-1">Offset Y</p>
                <input type="range" min="-40" max="40" class="w-full accent-brand-gold" :value="obj.shadow.offsetY" @input="setShadowProp('offsetY', Number($event.target.value))" />
              </div>
            </div>
            <div>
              <p class="field-label mb-1">Blur — {{ obj.shadow.blur }}</p>
              <input type="range" min="0" max="80" class="w-full accent-brand-gold" :value="obj.shadow.blur" @input="setShadowProp('blur', Number($event.target.value))" />
            </div>
            <div>
              <p class="field-label mb-1">Color</p>
              <input type="color" class="w-full h-8 rounded-md cursor-pointer" :value="shadowHex" @input="setShadowColor($event.target.value)" />
            </div>
          </template>
        </div>

        <!-- Masking (Batch 12) -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3">
          <p class="field-label mb-1">Masking</p>
          <div class="flex gap-1">
            <button class="btn-ghost !text-2xs !py-1.5 flex-1" @click="$emit('paint-mask', obj)">Paint mask</button>
            <button v-if="obj.clipPath" class="btn-ghost !text-2xs !py-1.5 flex-1" @click="$emit('remove-mask', obj)">Remove mask</button>
          </div>
        </div>

        <!-- Common — every layer type -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3 space-y-3">
          <div>
            <p class="field-label mb-1">Position &amp; size</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">X</span>
                <input type="number" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.left || 0)" @change="setProp('left', Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">Y</span>
                <input type="number" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.top || 0)" @change="setProp('top', Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">W</span>
                <input type="number" min="1" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.getScaledWidth())" @change="setWidthPx(Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">H</span>
                <input type="number" min="1" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.getScaledHeight())" @change="setHeightPx(Number($event.target.value))" />
              </label>
            </div>
            <label class="flex items-center gap-1.5 text-2xs mt-2">
              <input type="checkbox" class="accent-brand-gold" v-model="lockAspect" />
              <span class="text-surface-slate dark:text-surface-ash">Lock aspect ratio (W/H fields)</span>
            </label>
          </div>
          <div>
            <p class="field-label mb-1">Rotation — {{ Math.round(obj.angle || 0) }}°</p>
            <input type="range" min="-180" max="180" class="w-full accent-brand-gold" :value="obj.angle || 0" @input="setProp('angle', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Opacity — {{ Math.round((obj.opacity ?? 1) * 100) }}%</p>
            <input type="range" min="0" max="1" step="0.01" class="w-full accent-brand-gold"
                   :value="obj.opacity" @input="setProp('opacity', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Blend mode</p>
            <select class="field-input !py-1.5 !text-xs" :value="compositeToBlend(obj.globalCompositeOperation)" @change="setBlendMode($event.target.value)">
              <option v-for="m in Object.keys(BLEND_MODE_TO_COMPOSITE)" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-1">
            <button class="btn-ghost !text-2xs !py-1.5" @click="$emit('bring-forward', obj)">Bring forward</button>
            <button class="btn-ghost !text-2xs !py-1.5" @click="$emit('send-backward', obj)">Send backward</button>
          </div>
          <button v-if="obj.type !== 'image'" class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('rasterize', obj)">Rasterize layer</button>
          <button class="btn-danger !text-2xs !py-1.5 w-full" @click="$emit('delete', obj)">Delete layer</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  BoldIcon, ItalicIcon, Bars3BottomLeftIcon, Bars3Icon, Bars3BottomRightIcon,
  Bars3BottomLeftIcon as AlignLeftIcon, ArrowsRightLeftIcon as AlignCenterHIcon, Bars3BottomRightIcon as AlignRightIcon,
  ChevronDoubleUpIcon as AlignTopIcon, ArrowsUpDownIcon as AlignMiddleVIcon, ChevronDoubleDownIcon as AlignBottomIcon,
} from '@heroicons/vue/24/outline';
import FontPicker from './FontPicker.vue';
import FillPicker from './FillPicker.vue';
import { alignObjects, distributeObjects, BLEND_MODE_TO_COMPOSITE, setDropShadow, clearDropShadow } from '@/utils/canvasEngine';
import { FILTER_GALLERY, toggleGalleryFilter, rebuildFilterStack } from '@/utils/filtersGallery';
import { STYLE_PRESETS } from '@/utils/cropTool';
import { BINDING_FIELDS } from '@/utils/bindingRegistry';
import { removeImageBackground } from '@/utils/backgroundRemoval';

const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1 },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1 },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1 },
  { key: 'hue', label: 'Hue', min: -1, max: 1 },
];

const props = defineProps({
  canvas: { type: Object, required: true },
  selected: { type: Array, default: () => [] },
});
defineEmits(['bring-forward', 'send-backward', 'delete', 'clip-mask', 'paint-mask', 'remove-mask', 'toggle-shared', 'replace-source', 'start-crop', 'rasterize']);

// Fabric objects in `selected` are markRaw'd (see TemplateStudioView.vue's
// refreshLayersList comment) — Vue never tracks mutations to them, which
// is correct for the canvas itself (Fabric owns its own render loop) but
// means every `:value="obj.someProp"` binding in this panel goes stale
// the instant you edit that same still-selected object: the canvas
// updates correctly, but the panel's own inputs silently stop reflecting
// reality (a typed Width commits fine, but the Height field next to it —
// or the same field on next render — shows the old number, reading as
// "this didn't work" or "lock aspect ratio doesn't work" even though the
// underlying scale WAS applied correctly). `tick` is bumped on every
// object mutation and read (via `void tick.value`) inside `obj`, so
// Vue's dependency tracking treats every property read through `obj` as
// depending on it — one counter forces the whole panel to re-render
// instead of every single control needing its own workaround.
const tick = ref(0);
let detachTick = null;
watch(() => props.canvas, (canvas) => {
  detachTick?.();
  detachTick = null;
  if (!canvas) return;
  const bump = () => { tick.value++; };
  const events = ['object:modified', 'object:scaling', 'object:moving', 'object:rotating', 'text:changed', 'text:selection:changed', 'text:editing:entered', 'text:editing:exited'];
  events.forEach((ev) => canvas.on(ev, bump));
  detachTick = () => events.forEach((ev) => canvas.off(ev, bump));
}, { immediate: true });
onBeforeUnmount(() => detachTick?.());

const obj = computed(() => { void tick.value; return props.selected[0]; });

function dashKind(arr) {
  if (!arr) return null;
  return arr[0] <= 3 ? 'dotted' : 'dashed';
}

const ALIGN_MODES = [
  { value: 'left', label: 'Align left', icon: AlignLeftIcon },
  { value: 'center-h', label: 'Align center', icon: AlignCenterHIcon },
  { value: 'right', label: 'Align right', icon: AlignRightIcon },
  { value: 'top', label: 'Align top', icon: AlignTopIcon },
  { value: 'middle-v', label: 'Align middle', icon: AlignMiddleVIcon },
  { value: 'bottom', label: 'Align bottom', icon: AlignBottomIcon },
];

function toHex(v) {
  if (!v || typeof v !== 'string') return '#000000';
  return v.startsWith('#') ? v : '#000000';
}

function setProp(key, value) {
  obj.value.set(key, value);
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value }); // feeds the history stack (Batch 8)
}

// ── Numeric W/H fields ───────────────────────────────────────────────────
// Fabric objects always expose their unscaled intrinsic width/height
// regardless of type (Rect, Ellipse, Textbox, Image, Path all support it),
// so resizing via scaleX/scaleY here works uniformly across every layer
// type instead of needing type-specific size logic.
const lockAspect = ref(false);
function setWidthPx(px) {
  if (!px || px <= 0) return;
  const scaleX = px / (obj.value.width || 1);
  if (lockAspect.value) {
    const ratio = obj.value.scaleY / (obj.value.scaleX || 1);
    obj.value.set({ scaleX, scaleY: scaleX * ratio });
  } else {
    obj.value.set('scaleX', scaleX);
  }
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setHeightPx(px) {
  if (!px || px <= 0) return;
  const scaleY = px / (obj.value.height || 1);
  if (lockAspect.value) {
    const ratio = obj.value.scaleX / (obj.value.scaleY || 1);
    obj.value.set({ scaleY, scaleX: scaleY * ratio });
  } else {
    obj.value.set('scaleY', scaleY);
  }
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// Clicking any control in this panel (a <select>, a color input, a number
// field) steals DOM focus away from the hidden <textarea> Fabric uses for
// text editing — which makes Fabric exit editing and clear
// isEditing/selectionStart/selectionEnd before the click handler even
// runs. Without caching, every one of these controls would silently no-op
// the instant you touched them. `cachedSelection` snapshots the live
// selection on the control's OWN mousedown (which fires before the
// resulting blur on the canvas), so the actual `change`/`click` handler
// still has something valid to act on afterward.
const cachedSelection = ref(null); // { obj, start, end }
function captureSelectionNow() {
  const o = obj.value;
  if (o?.type === 'textbox' && o.isEditing && o.selectionStart !== o.selectionEnd) {
    cachedSelection.value = { obj: o, start: o.selectionStart, end: o.selectionEnd };
  }
}
watch(tick, captureSelectionNow);
function cacheSelectionForVariable() { captureSelectionNow(); }

// Range-based (only true once something is actually highlighted, live or cached).
function getEffectiveSelection() {
  const o = obj.value;
  if (!o || o.type !== 'textbox') return null;
  if (o.isEditing && o.selectionStart !== o.selectionEnd) return { obj: o, start: o.selectionStart, end: o.selectionEnd };
  if (cachedSelection.value?.obj === o) return cachedSelection.value;
  return null;
}
function hasCachedSelection() { return !!getEffectiveSelection(); }

// Position-based (works for a plain collapsed cursor too, not just a
// highlighted range) — this is what makes the Font/Size/Fill fields show
// what's actually AT the cursor as you click around a multi-styled text
// layer, instead of always showing the layer's one base style.
function getCursorPosition() {
  const o = obj.value;
  if (!o || o.type !== 'textbox') return null;
  if (o.isEditing) return { obj: o, at: o.selectionStart };
  if (cachedSelection.value?.obj === o) return { obj: o, at: cachedSelection.value.start };
  return null;
}
function readStyleAt(key, fallback) {
  // Fabric objects are markRaw'd (non-reactive), so mutating character
  // styles via setSelectionStyles() is invisible to Vue's dependency
  // tracking — nothing here would ever re-run without this. `tick` is
  // bumped on the canvas's own 'object:modified' et al. (see above); just
  // reading it pulls this computed into that reactivity, which is the
  // whole reason it exists elsewhere in this file. Without it, "FONT
  // (SELECTION)" kept showing whatever font was there before you picked a
  // new one — the picker's own change() had already applied correctly,
  // this readout just never refreshed to reflect it.
  void tick.value;
  const pos = getCursorPosition();
  if (!pos) return fallback;
  const len = (pos.obj.text || '').length;
  if (!len) return fallback;
  const idx = Math.max(0, Math.min(pos.at, len - 1));
  return pos.obj.getSelectionStyles(idx, idx + 1)[0]?.[key] ?? fallback;
}
const currentSelectionLabel = computed(() => (hasCachedSelection() ? ' (selection)' : ''));
const currentFontFamily = computed(() => readStyleAt('fontFamily', obj.value?.fontFamily));
const currentFontSize = computed(() => readStyleAt('fontSize', obj.value?.fontSize));
const currentFill = computed(() => readStyleAt('fill', obj.value?.fill));

// Applies to just the highlighted range when one exists (live or cached),
// or to the whole layer otherwise.
function setTextProp(key, value) {
  const sel = getEffectiveSelection();
  if (sel) {
    sel.obj.setSelectionStyles({ [key]: value }, sel.start, sel.end);
    sel.obj.dirty = true;
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: sel.obj });
  } else {
    setProp(key, value);
  }
}
function setFont(family) {
  setTextProp('fontFamily', family);
}

// ── Variable — one control for both whole-layer binding and inline tokens ──
// With a highlighted range: swaps just that text for a {{binding.key}}
// token (substituteBindings() on the server already replaces every
// {{...}} match in a string, so a layer can carry several of these with
// zero renderer changes). With nothing highlighted: binds the whole layer,
// same as before.
const currentBinding = computed(() => obj.value?.get('data')?.binding || '');
function chooseVariable(key) {
  if (!key) return;
  const sel = getEffectiveSelection();
  if (sel) {
    const token = `{{${key}}}`;
    sel.obj.insertChars(token, undefined, sel.start, sel.end);
    sel.obj.dirty = true;
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: sel.obj });
    cachedSelection.value = null;
    return;
  }
  setBinding(key === '__clear__' ? '' : key);
}
function setBinding(key) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, binding: key || null });
  // Bound layers show their literal {{key}} placeholder as the actual text
  // content — this is what the server-side renderer (Batch 28) finds and
  // substitutes, and what makes a bound layer visually obvious while
  // editing without needing a separate "preview" state per-field.
  obj.value.set('text', key ? `{{${key}}}` : 'Double-click to edit');
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Layer style — drop shadow (Batch 14) ────────────────────────────────
const shadowHex = computed(() => {
  const c = obj.value?.shadow?.color;
  if (!c) return '#000000';
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#000000';
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
});
function toggleShadow(on) {
  if (on) setDropShadow(props.canvas, obj.value, {});
  else clearDropShadow(props.canvas, obj.value);
}
function setShadowProp(key, value) {
  obj.value.shadow.set(key, value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setShadowColor(hex) {
  const alpha = obj.value.shadow.color.match(/[\d.]+\)$/)?.[0]?.replace(')', '') || '0.6';
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  obj.value.shadow.set('color', `rgba(${r},${g},${b},${alpha})`);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Adjustments — image layers only (Batch 15) ──────────────────────────
const adjustments = computed(() => obj.value?.get('data')?.adjustments || { brightness: 0, contrast: 0, saturation: 0, hue: 0 });
function setAdjustment(key, value) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, adjustments: { ...adjustments.value, [key]: value } });
  rebuildFilterStack(obj.value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

function applyStylePreset(preset) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, adjustments: { ...preset.values } });
  rebuildFilterStack(obj.value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Filters gallery (Batch 16) ──────────────────────────────────────────
const galleryFilters = computed(() => obj.value?.get('data')?.galleryFilters || {});
function toggleFilter(f, on) {
  toggleGalleryFilter(obj.value, f.id, on ? (f.param ? f.param.default : true) : null);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setFilterParam(f, value) {
  toggleGalleryFilter(obj.value, f.id, value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Background removal (Batch 19) ───────────────────────────────────────
const removingBg = ref(false);
const bgProgress = ref('');
async function removeBg() {
  removingBg.value = true;
  bgProgress.value = '';
  try {
    await removeImageBackground(obj.value, {
      onProgress: ({ current, total }) => { bgProgress.value = total ? `${Math.round((current / total) * 100)}%` : ''; },
    });
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: obj.value });
  } finally {
    removingBg.value = false;
  }
}

// ── Smart objects (Batch 20) ────────────────────────────────────────────
const isShared = computed(() => !!obj.value?.get('data')?.assetShared);

function compositeToBlend(composite) {
  return Object.keys(BLEND_MODE_TO_COMPOSITE).find((k) => BLEND_MODE_TO_COMPOSITE[k] === composite) || 'normal';
}
function setBlendMode(mode) {
  obj.value.set('globalCompositeOperation', BLEND_MODE_TO_COMPOSITE[mode] || 'source-over');
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

function selectionBounds() {
  const lefts = props.selected.map((o) => o.left);
  const tops = props.selected.map((o) => o.top);
  const rights = props.selected.map((o) => o.left + o.getScaledWidth());
  const bottoms = props.selected.map((o) => o.top + o.getScaledHeight());
  const left = Math.min(...lefts), top = Math.min(...tops);
  return { left, top, width: Math.max(...rights) - left, height: Math.max(...bottoms) - top };
}
function align(mode) {
  alignObjects(props.selected, selectionBounds(), mode);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', {});
}
function distribute(axis) {
  distributeObjects(props.selected, axis);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', {});
}
</script>
