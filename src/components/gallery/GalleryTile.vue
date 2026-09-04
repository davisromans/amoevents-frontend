<template>
  <button type="button"
          class="group relative w-full block rounded-2xl overflow-hidden bg-surface-mist dark:bg-surface-fog aspect-square cursor-pointer transition-transform duration-fast hover:scale-[1.01]"
          @click="$emit('open')">
    <!-- Every tile is the same aspect ratio (photos AND videos) so the
         grid reads as one consistent wall instead of a jumble of whatever
         size each source file happened to be — object-cover crops to fill
         rather than distorting or letterboxing. -->
    <img v-if="item.kind !== 'video'"
         :src="item.thumbUrl"
         :alt="item.caption || ''"
         loading="lazy"
         class="w-full h-full object-cover block" />
    <div v-else class="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
      <div class="w-14 h-14 rounded-full bg-black/40 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
        <svg class="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>

    <!-- Corner badges -->
    <span v-if="item.amoviewVideoId"
          class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur text-white text-2xs font-bold"
          :title="'Published on Amoview'">
      <CheckBadgeIcon class="w-3 h-3" /> Amoview
    </span>
    <a v-else-if="item.amoviewPromoteStatus === 'NOT_A_CREATOR'"
       href="https://app.amoview.com"
       target="_blank" rel="noopener"
       class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-gold-deep/90 backdrop-blur text-white text-2xs font-bold hover:bg-brand-gold-deep"
       title="Become a creator on Amoview to unlock likes, comments, and sharing for this video"
       @click.stop>
      <VideoCameraIcon class="w-3 h-3" /> Become a creator
    </a>
    <span v-else-if="item.kind === 'video'"
          class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur text-white text-2xs font-bold">
      <VideoCameraIcon class="w-3 h-3" /> Video
    </span>

    <!-- Hover action bar -->
    <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end gap-1">
      <a v-if="item.downloadUrl"
         :href="item.downloadUrl"
         target="_blank" rel="noopener"
         :download="item.caption || undefined"
         class="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-surface-charcoal flex items-center justify-center transition-colors"
         :title="'Download'"
         @click.stop>
        <ArrowDownTrayIcon class="w-3.5 h-3.5" />
      </a>
      <button type="button"
              class="w-8 h-8 rounded-full bg-white/90 hover:bg-state-danger hover:text-white text-surface-charcoal flex items-center justify-center transition-colors"
              :title="'Delete'"
              @click.stop="$emit('delete')">
        <TrashIcon class="w-3.5 h-3.5" />
      </button>
    </div>
  </button>
</template>

<script setup>
import { CheckBadgeIcon, VideoCameraIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/vue/24/outline';

defineProps({ item: { type: Object, required: true } });
defineEmits(['open', 'delete']);
</script>
