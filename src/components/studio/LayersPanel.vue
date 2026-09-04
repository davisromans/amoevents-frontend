<template>
  <div class="flex flex-col gap-0.5">
    <div v-for="(row, i) in rows" :key="layerKey(row.obj)"
         :draggable="row.depth === 0"
         class="group flex items-center gap-2 py-1.5 rounded-md text-xs cursor-pointer"
         :style="{ paddingLeft: (8 + row.depth * 16) + 'px', paddingRight: '8px' }"
         :class="[isSelected(row.obj) ? 'bg-brand-primary-glow text-brand-primary-deep' : 'hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50', dragOverIndex === i ? 'outline outline-1 outline-brand-primary' : '']"
         @click="$emit('select', row.obj, $event)"
         @contextmenu.prevent="openContextMenu(row, $event)"
         @dragstart="onDragStart(i, $event)"
         @dragover.prevent="row.depth === 0 && (dragOverIndex = i)"
         @dragleave="dragOverIndex = dragOverIndex === i ? null : dragOverIndex"
         @drop="onDrop(i, $event)">
      <button v-if="row.obj.type === 'group'" class="p-0 shrink-0" title="Expand/collapse" @click.stop="toggleExpanded(row.obj)">
        <ChevronRightIcon class="w-3 h-3 transition-transform" :class="{ 'rotate-90': isExpanded(row.obj) }" />
      </button>
      <span v-else class="w-3 shrink-0" />

      <!-- Real per-layer thumbnail — a small live rasterization of the
           layer at its current appearance, updated on any object change
           via the parent's tick. Falls back to a type icon while the
           thumbnail is still generating (first render for a fresh layer). -->
      <div class="w-8 h-8 shrink-0 rounded border border-surface-mist dark:border-surface-fog overflow-hidden bg-surface-mist/40 dark:bg-surface-fog/40 flex items-center justify-center">
        <img v-if="thumbnails[layerKey(row.obj)]" :src="thumbnails[layerKey(row.obj)]" class="w-full h-full object-contain" alt="" />
        <component v-else :is="icon(row.obj)" class="w-3.5 h-3.5 opacity-60" />
      </div>

      <input v-if="renamingKey === layerKey(row.obj)" ref="renameInputRef" v-model="renameDraft" class="truncate flex-1 bg-transparent outline-none border-b border-brand-primary"
             @click.stop @keydown.enter="commitRename(row.obj)" @keydown.esc="renamingKey = null" @blur="commitRename(row.obj)" />
      <span v-else class="truncate flex-1" @dblclick.stop="startRename(row.obj)">{{ layerName(row.obj) }}</span>

      <button class="p-0.5 rounded hover:bg-surface-mist dark:hover:bg-surface-fog shrink-0" @click.stop="$emit('toggle-lock', row.obj)">
        <LockClosedIcon v-if="isLocked(row.obj)" class="w-3 h-3 text-brand-primary" />
        <LockOpenIcon v-else class="w-3 h-3 opacity-40" />
      </button>
      <button class="p-0.5 rounded hover:bg-surface-mist dark:hover:bg-surface-fog shrink-0" @click.stop="$emit('toggle-visible', row.obj)">
        <EyeIcon v-if="row.obj.visible !== false" class="w-3 h-3 opacity-70" />
        <EyeSlashIcon v-else class="w-3 h-3 opacity-40" />
      </button>
    </div>

    <p v-if="!rows.length" class="text-2xs text-surface-slate dark:text-surface-ash px-2 py-2">
      No layers yet — use the toolbar above the canvas to add text, shapes, or images.
    </p>

    <!-- Context menu, teleported so it can escape the panel's scroll box. -->
    <Teleport to="body">
      <div v-if="ctxMenu" ref="ctxMenuRef" class="fixed z-50 surface-card shadow-card p-1 rounded-lg min-w-40" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }">
        <button class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" :disabled="selected.length < 2" @click="onCtxAction('group')">Group ({{ selected.length }} selected)</button>
        <button v-if="ctxMenu.row?.parent" class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" @click="onCtxAction('ungroup')">Ungroup</button>
        <button v-if="ctxMenu.row?.obj?.type === 'group'" class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" @click="onCtxAction('ungroup-this')">Ungroup this</button>
        <div class="border-t border-surface-mist dark:border-surface-fog my-0.5" />
        <button class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" @click="onCtxAction('duplicate')">Duplicate</button>
        <button v-if="!['image','group'].includes(ctxMenu.row?.obj?.type)" class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" @click="onCtxAction('rasterize')">Rasterize</button>
        <button v-if="selected.length >= 2" class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start" @click="onCtxAction('merge')">Merge selected → single image</button>
        <div class="border-t border-surface-mist dark:border-surface-fog my-0.5" />
        <button class="btn-ghost !text-xs !py-1.5 !px-2 w-full !justify-start text-red-500" @click="onCtxAction('delete')">Delete</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ChevronRightIcon, LockClosedIcon, LockOpenIcon, EyeIcon, EyeSlashIcon,
  DocumentTextIcon, PhotoIcon, RectangleGroupIcon, Square3Stack3DIcon, QrCodeIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps({
  layers: { type: Array, default: () => [] },      // top-level Fabric objects, top-of-stack first (display order)
  selected: { type: Array, default: () => [] },
});
const emit = defineEmits(['select', 'toggle-lock', 'toggle-visible', 'reorder', 'duplicate', 'delete', 'rename', 'move-to', 'rasterize', 'group', 'ungroup', 'merge']);

function layerKey(obj) {
  if (!obj._layerKey) obj._layerKey = obj.get('data')?.layerId || obj.type + '_' + Math.random().toString(36).slice(2, 10);
  return obj._layerKey;
}
function layerName(obj) { return obj.get('data')?.name || (obj.type === 'textbox' ? (obj.text || '').slice(0, 24) || 'Text' : obj.type); }
function isSelected(obj) { return props.selected.includes(obj); }
function isLocked(obj) { return !!obj.get('data')?.locked; }
function icon(obj) {
  if (obj.type === 'textbox') return DocumentTextIcon;
  if (obj.type === 'image') return PhotoIcon;
  if (obj.type === 'group') return RectangleGroupIcon;
  if (obj.get('data')?.name === 'QR code') return QrCodeIcon;
  return Square3Stack3DIcon;
}

// Groups default to expanded — a PSD import with nested folders (flowers,
// backgrounds) should show everything immediately, not hide 26 layers
// behind a click the first time someone opens the document.
const collapsed = new Set();
const expandedTick = ref(0);
function isExpanded(obj) { void expandedTick.value; return !collapsed.has(layerKey(obj)); }
function toggleExpanded(obj) {
  const key = layerKey(obj);
  if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
  expandedTick.value++;
}

// Flattens the (possibly nested) Fabric object tree into display rows.
const rows = computed(() => {
  void expandedTick.value;
  const out = [];
  function walk(objs, depth, parent) {
    for (const obj of objs) {
      markRaw(obj);
      out.push({ obj, depth, parent });
      if (obj.type === 'group' && isExpanded(obj)) {
        walk([...obj.getObjects()].reverse(), depth + 1, obj);
      }
    }
  }
  walk(props.layers, 0, null);
  return out;
});

// ── Thumbnails ──────────────────────────────────────────────────────────
// Every layer gets a small live rendering of itself, refreshed whenever
// the row list changes (add/remove/reorder) or the layer's own contents
// change (paint stroke, rasterize, size). Fabric's toDataURL() on a
// single object is cheap — clamped to a 32×32 target so it stays trivial
// even for the largest photo layer.
const thumbnails = ref({});
function generateThumbnails() {
  const next = {};
  for (const row of rows.value) {
    const key = layerKey(row.obj);
    try {
      const w = row.obj.getScaledWidth?.() || 1;
      const h = row.obj.getScaledHeight?.() || 1;
      const scale = Math.min(64 / w, 64 / h, 1);
      next[key] = row.obj.toDataURL({ format: 'png', multiplier: scale, enableRetinaScaling: false });
    } catch {
      next[key] = null;
    }
  }
  thumbnails.value = next;
}
watch(rows, () => nextTick(generateThumbnails), { immediate: true });
// Also refresh when the selected object's contents change (paint stroke etc).
watch(() => props.selected.map((o) => o?.dirty ? Math.random() : null), () => nextTick(generateThumbnails));

// Inline rename — double-click a layer's name to edit it in place.
const renamingKey = ref(null);
const renameDraft = ref('');
const renameInputRef = ref(null);
function startRename(obj) {
  renamingKey.value = layerKey(obj);
  renameDraft.value = layerName(obj);
  nextTick(() => renameInputRef.value?.[0]?.focus());
}
function commitRename(obj) {
  if (renamingKey.value === null) return;
  const name = renameDraft.value.trim();
  if (name) emit('rename', obj, name);
  renamingKey.value = null;
}

// Drag-to-reorder — top-level layers only.
const dragOverIndex = ref(null);
let dragFromIndex = null;
function onDragStart(i, e) {
  if (rows.value[i]?.depth !== 0) { e.preventDefault(); return; }
  dragFromIndex = i;
  e.dataTransfer.effectAllowed = 'move';
}
function onDrop(i, e) {
  e.preventDefault();
  dragOverIndex.value = null;
  if (dragFromIndex === null || rows.value[i]?.depth !== 0) return;
  const fromDisplayIndex = props.layers.indexOf(rows.value[dragFromIndex].obj);
  const toDisplayIndex = props.layers.indexOf(rows.value[i].obj);
  if (fromDisplayIndex === -1 || toDisplayIndex === -1 || fromDisplayIndex === toDisplayIndex) { dragFromIndex = null; return; }
  emit('move-to', fromDisplayIndex, toDisplayIndex);
  dragFromIndex = null;
}

// Right-click context menu — Photoshop convention.
const ctxMenu = ref(null);
const ctxMenuRef = ref(null);
function openContextMenu(row, e) {
  // Position the menu, clamp to viewport so it never opens off-screen.
  const mx = Math.min(e.clientX, window.innerWidth - 220);
  const my = Math.min(e.clientY, window.innerHeight - 260);
  ctxMenu.value = { row, x: mx, y: my };
  // If the right-clicked row wasn't in the current selection, treat it
  // like a normal click — select it — so subsequent actions target it.
  if (!isSelected(row.obj)) emit('select', row.obj, e);
}
function onCtxAction(action) {
  const row = ctxMenu.value.row;
  ctxMenu.value = null;
  if (action === 'group') emit('group', props.selected);
  else if (action === 'ungroup') emit('ungroup', row.parent);
  else if (action === 'ungroup-this') emit('ungroup', row.obj);
  else if (action === 'duplicate') emit('duplicate', row.obj, row.parent);
  else if (action === 'rasterize') emit('rasterize', row.obj);
  else if (action === 'merge') emit('merge', props.selected);
  else if (action === 'delete') {
    if (props.selected.length > 1) props.selected.forEach((o) => emit('delete', o, null));
    else emit('delete', row.obj, row.parent);
  }
}
function onGlobalClickCloseCtx(e) {
  if (!ctxMenu.value) return;
  if (ctxMenuRef.value?.contains(e.target)) return;
  ctxMenu.value = null;
}
onMounted(() => window.addEventListener('mousedown', onGlobalClickCloseCtx));
onBeforeUnmount(() => window.removeEventListener('mousedown', onGlobalClickCloseCtx));
</script>
