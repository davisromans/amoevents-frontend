<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-fast"
      leave-active-class="transition-opacity duration-fast"
      enter-from-class="opacity-0" leave-to-class="opacity-0"
    >
      <div v-if="index !== null"
           class="fixed inset-0 z-[150] bg-black flex flex-col select-none"
           @click.self="close"
           @touchstart.passive="onTouchStart"
           @touchend.passive="onTouchEnd">
        <!-- Top bar -->
        <header class="shrink-0 flex items-center justify-between px-4 py-3 text-white bg-gradient-to-b from-black/80 to-transparent">
          <span class="text-sm font-semibold flex items-center gap-2">
            <span class="tabular-nums">{{ index + 1 }} / {{ items.length }}</span>
            <span v-if="current?.amoviewVideoId"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/15 text-2xs font-bold">
              <CheckBadgeIcon class="w-3 h-3" /> On Amoview
            </span>
          </span>
          <div class="flex items-center gap-1">
            <a v-if="current?.downloadUrl"
               :href="current.downloadUrl"
               target="_blank" rel="noopener"
               class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              <ArrowDownTrayIcon class="w-4 h-4" />
              Download
            </a>
            <button type="button" class="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white transition-colors" @click="close">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Main media -->
        <div class="flex-1 flex items-center justify-center min-h-0 px-4 relative">
          <button type="button" v-if="index > 0"
                  class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10 transition-colors"
                  @click.stop="step(-1)">
            <ChevronLeftIcon class="w-6 h-6" />
          </button>
          <button type="button" v-if="index < items.length - 1"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10 transition-colors"
                  @click.stop="step(1)">
            <ChevronRightIcon class="w-6 h-6" />
          </button>

          <video v-if="current?.kind === 'video'"
                 :key="`v-${current._id}`"
                 :src="current.downloadUrl"
                 controls autoplay
                 class="max-h-full max-w-full rounded-lg"
                 @click.stop />
          <img v-else
               :key="`i-${current?._id}`"
               :src="current?.previewUrl || current?.thumbUrl"
               :alt="current?.caption || ''"
               class="max-h-full max-w-full object-contain rounded-lg"
               @click.stop />
        </div>

        <!-- Filmstrip — scrollable, active tile centered on step -->
        <div ref="stripRef" class="shrink-0 flex gap-1.5 overflow-x-auto py-2 px-3 bg-black/40 backdrop-blur-sm">
          <button v-for="(t, i) in items" :key="t._id"
                  :ref="(el) => (thumbRefs[i] = el)"
                  type="button"
                  :class="['shrink-0 h-14 sm:h-16 aspect-square rounded-md overflow-hidden transition-all',
                           i === index ? 'ring-2 ring-brand-primary scale-105 opacity-100' : 'opacity-60 hover:opacity-90']"
                  @click.stop="$emit('update:index', i)">
            <div v-if="t.kind === 'video'" class="w-full h-full bg-slate-800 flex items-center justify-center">
              <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <img v-else :src="t.thumbUrl" loading="lazy" class="w-full h-full object-cover" alt="" />
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { CheckBadgeIcon, ArrowDownTrayIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  items: { type: Array, required: true },
  index: { type: Number, default: null },
});
const emit = defineEmits(['update:index', 'close']);

const current = computed(() => props.index != null ? props.items[props.index] : null);

// Keyboard: arrows navigate, Esc closes. Attached only while open so
// arrow keys on other pages behave normally.
function onKey(e) {
  if (props.index == null) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
}

// Touch swipe — >40px horizontal wins over vertical.
let touchX = 0, touchY = 0;
function onTouchStart(e) { const t = e.touches[0]; touchX = t.clientX; touchY = t.clientY; }
function onTouchEnd(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchX, dy = t.clientY - touchY;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
}

function step(delta) {
  const next = props.index + delta;
  if (next < 0 || next >= props.items.length) return;
  emit('update:index', next);
}
function close() { emit('update:index', null); emit('close'); }

const stripRef = ref(null);
const thumbRefs = ref([]);
// Center the active filmstrip tile whenever index changes.
watch(() => props.index, (i) => {
  if (i == null) return;
  nextTick(() => {
    const el = thumbRefs.value[i];
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
});

// Lock body scroll while open; attach/detach keydown listener with it.
let prevOverflow = '';
watch(() => props.index, (i) => {
  if (typeof document === 'undefined') return;
  if (i != null) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
  } else {
    document.body.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
  }
}, { immediate: true });
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  if (props.index != null) document.body.style.overflow = prevOverflow;
});
</script>
