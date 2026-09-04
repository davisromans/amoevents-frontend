<template>
  <div class="min-h-full">
    <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div class="text-center mb-8">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-soft mb-2">Gate scanner</p>
        <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Choose an event to scan</h1>
        <p class="text-sm text-white/60 mt-2">Any phone becomes a professional gate scanner. Multiple gates share one live count.</p>
      </div>

      <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

      <div v-else-if="!items.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4">
          <CameraIcon class="w-6 h-6 text-white/50" />
        </div>
        <p class="text-md text-white/80 font-bold">No events assigned to you</p>
        <p class="text-sm text-white/50 mt-1">Ask the event owner to invite you as a scanner.</p>
      </div>

      <div v-else class="space-y-3">
        <button v-for="e in items" :key="e._id"
                type="button"
                class="w-full text-left group rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-primary/40 p-4 sm:p-5 transition-all"
                @click="openScanner(e)">
          <div class="flex items-center gap-4">
            <!-- Cover thumbnail — deterministic gradient. -->
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-lg shadow-elev-2"
                 :style="{ background: gradientFor(e) }">{{ initials(e) }}</div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-md sm:text-lg font-black text-white truncate">{{ e.name }}</p>
                <span v-if="isToday(e.date)" class="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-state-success text-white">LIVE</span>
              </div>
              <p class="text-xs text-white/60 mt-0.5">{{ formatDate(e.date) }}<span v-if="e.venue?.name"> · {{ e.venue.name }}</span></p>

              <!-- Arrival progress bar -->
              <div class="mt-3">
                <div class="flex items-center justify-between text-2xs text-white/70 mb-1">
                  <span><span class="tabular-nums font-black text-white">{{ e.arrivedCount || 0 }}</span> / {{ e.guestCount || 0 }} arrived</span>
                  <span class="tabular-nums">{{ arrivalPct(e) }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div class="h-full bg-gradient-primary rounded-full transition-all duration-slow" :style="{ width: arrivalPct(e) + '%' }" />
                </div>
              </div>
            </div>

            <div class="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <span class="btn-primary !py-2 !px-3 !text-xs pointer-events-none">
                Open scanner
                <ChevronRightIcon class="w-3.5 h-3.5" />
              </span>
              <router-link :to="`/scanner/${e._id}/tv`" class="text-2xs font-bold text-white/60 hover:text-white transition-colors inline-flex items-center gap-1" @click.stop>
                <TvIcon class="w-3.5 h-3.5" /> TV mode
              </router-link>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronRightIcon, CameraIcon, TvIcon } from '@heroicons/vue/24/outline';
import { listEvents } from '@/services/events.service';
import { formatDate } from '@/utils/format';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const router = useRouter();
const items = ref([]);
const loading = ref(true);

function openScanner(e) { router.push(`/scanner/${e._id}`); }

function initials(e) {
  const n = e.name || '?';
  return n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// Deterministic — same event, same colors — matches EventCard/EventHero.
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
function gradientFor(e) {
  const key = String(e?.name || '?');
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function arrivalPct(e) {
  const total = e.guestCount || 0;
  return total ? Math.min(100, Math.round(((e.arrivedCount || 0) / total) * 100)) : 0;
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

onMounted(async () => {
  try {
    const { items: list } = await listEvents({ status: 'active' });
    items.value = list;
    if (!items.value.length) {
      const all = await listEvents();
      items.value = all.items;
    }
    // Sort: today first, then upcoming (nearest first), then past (newest first).
    items.value.sort((a, b) => {
      const at = new Date(a.date).getTime();
      const bt = new Date(b.date).getTime();
      const aToday = isToday(a.date) ? -1 : 0;
      const bToday = isToday(b.date) ? -1 : 0;
      if (aToday !== bToday) return aToday - bToday;
      const now = Date.now();
      const aUp = at >= now, bUp = bt >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? at - bt : bt - at;
    });
  } finally { loading.value = false; }
});
</script>
