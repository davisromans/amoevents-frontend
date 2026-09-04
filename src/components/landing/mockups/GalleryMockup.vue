<template>
  <div class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card-lg overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-surface-mist dark:border-surface-fog">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
        <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
        <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
        <span class="ml-3 text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">Gallery · 247 items</span>
      </div>
      <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft text-2xs font-bold">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 15l4-4 4 4 4-4 4 4"/></svg>
        5-year storage
      </span>
    </div>

    <div class="p-3 grid grid-cols-4 gap-1.5">
      <div v-for="(tile, i) in TILES" :key="i" class="aspect-square rounded-lg relative overflow-hidden"
           :style="{ background: tile.bg }">
        <div v-if="tile.video" class="absolute inset-0 flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div v-if="tile.badge" class="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/50 text-white text-2xs font-bold flex items-center gap-0.5">
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
          Amoview
        </div>
      </div>
    </div>

    <div class="px-4 py-3 border-t border-surface-mist dark:border-surface-fog bg-surface-cream dark:bg-surface-night flex items-center justify-between">
      <div class="flex items-center gap-2 text-2xs text-surface-slate dark:text-surface-ash">
        <span class="inline-flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Storage secured
        </span>
        <span>· 4.2 GB · 21,000 TZS charged</span>
      </div>
      <button class="text-2xs font-bold text-brand-gold-deep dark:text-brand-gold-soft">Share link →</button>
    </div>
  </div>
</template>

<script setup>
// Alternating soft gradients so the grid looks like a real photo/video mix,
// with two 'Amoview' badges + two video overlays.
const TILES = [
  { bg: 'linear-gradient(135deg,#FFB86B,#E5722F)', badge: true },
  { bg: 'linear-gradient(135deg,#D084FF,#9B59B6)' },
  { bg: 'linear-gradient(135deg,#79E0B3,#2FA675)', video: true, badge: true },
  { bg: 'linear-gradient(135deg,#7CC5FF,#3B7BD9)' },
  { bg: 'linear-gradient(135deg,#FFB0D4,#D9457A)' },
  { bg: 'linear-gradient(135deg,#FFE07B,#E5B32F)', video: true },
  { bg: 'linear-gradient(135deg,#B79CFF,#6C4CD9)' },
  { bg: 'linear-gradient(135deg,#8FE0FF,#3BB5E5)' },
  { bg: 'linear-gradient(135deg,#FF9E9E,#D93B3B)' },
  { bg: 'linear-gradient(135deg,#B4E883,#7BC236)' },
  { bg: 'linear-gradient(135deg,#FFA97C,#E56A2F)' },
  { bg: 'linear-gradient(135deg,#C9B8FF,#7A5CD9)' },
];
</script>
