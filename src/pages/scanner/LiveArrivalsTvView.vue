<template>
  <div class="min-h-screen bg-black text-white relative overflow-hidden" @dblclick="toggleFullscreen">
    <!-- Ambient purple wash — one radial per corner. Purely decorative. -->
    <div class="absolute inset-0 pointer-events-none"
         aria-hidden="true"
         style="background: radial-gradient(circle at 15% 20%, rgba(208,132,255,0.15), transparent 55%), radial-gradient(circle at 85% 80%, rgba(155,89,182,0.20), transparent 60%);" />

    <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <div v-else-if="event" class="relative h-screen flex flex-col p-8 sm:p-12 lg:p-16">
      <!-- Header — event name + live indicator -->
      <header class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <p class="text-xs sm:text-sm uppercase font-black tracking-widest text-white/60">{{ eventTypeLabel }}</p>
          <h1 class="mt-2 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight truncate">{{ event.name }}</h1>
          <p class="mt-2 text-md sm:text-lg text-white/70">{{ formatDateTime(event.date) }}<span v-if="event.venue?.name"> · {{ event.venue.name }}</span></p>
        </div>
        <div class="shrink-0 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 sm:px-4 py-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-success opacity-75" />
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-state-success" />
          </span>
          <span class="text-xs sm:text-sm font-black uppercase tracking-widest">Live</span>
          <span class="text-2xs text-white/60 tabular-nums hidden sm:inline">· {{ clock }}</span>
        </div>
      </header>

      <!-- Center — the hero counter. Massive. Nothing else on this row. -->
      <div class="flex-1 flex flex-col justify-center items-center py-6 sm:py-10">
        <p class="text-md sm:text-xl uppercase font-black tracking-widest text-white/60 mb-4">Arrived</p>
        <div class="flex items-baseline gap-4 sm:gap-6">
          <p class="text-[120px] sm:text-[200px] lg:text-[280px] font-black tabular-nums leading-none bg-gradient-to-b from-white to-brand-primary-soft bg-clip-text text-transparent">
            {{ (stats.arrived || 0).toLocaleString() }}
          </p>
          <p class="text-xl sm:text-3xl lg:text-4xl font-black text-white/40 tabular-nums">/ {{ (stats.total || 0).toLocaleString() }}</p>
        </div>

        <!-- Big progress bar. High contrast for far-back viewing. -->
        <div class="mt-8 sm:mt-12 w-full max-w-4xl">
          <div class="flex items-center justify-between text-lg sm:text-xl font-black text-white mb-3">
            <span class="tabular-nums">{{ arrivalPct }}% of confirmed guests</span>
            <span class="tabular-nums text-white/60">{{ stats.rsvpYes || 0 }} yes · {{ stats.rsvpPending || 0 }} pending</span>
          </div>
          <div class="h-3 sm:h-4 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full bg-gradient-primary rounded-full transition-all duration-slow" :style="{ width: arrivalPct + '%' }" />
          </div>
        </div>
      </div>

      <!-- Bottom — recent-arrival ticker + secondary stats -->
      <footer class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-end">
        <div class="lg:col-span-2 min-h-[100px]">
          <p class="text-xs sm:text-sm uppercase font-black tracking-widest text-white/50 mb-3">Latest arrivals</p>
          <div class="flex flex-wrap gap-2">
            <transition-group
              enter-active-class="transition duration-base ease-out"
              enter-from-class="opacity-0 scale-90"
            >
              <div v-for="g in recentArrivals" :key="`${g._id}-${g.at}`"
                   class="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-2xs font-black text-white shrink-0"
                      :style="{ background: gradientForName(g.name) }">{{ initials(g.name) }}</span>
                <span class="text-sm sm:text-md font-bold text-white truncate max-w-[200px]">{{ g.name }}</span>
                <span class="text-2xs text-white/50 tabular-nums">{{ timeAgo(g.at) }}</span>
              </div>
              <div v-if="!recentArrivals.length" key="empty" class="text-sm text-white/40">Waiting for arrivals…</div>
            </transition-group>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 lg:gap-4">
          <div>
            <p class="text-2xs uppercase font-black tracking-widest text-white/50">Yes</p>
            <p class="text-2xl sm:text-3xl font-black tabular-nums text-state-success mt-1">{{ stats.rsvpYes || 0 }}</p>
          </div>
          <div>
            <p class="text-2xs uppercase font-black tracking-widest text-white/50">Maybe</p>
            <p class="text-2xl sm:text-3xl font-black tabular-nums text-state-warning mt-1">{{ stats.rsvpMaybe || 0 }}</p>
          </div>
          <div>
            <p class="text-2xs uppercase font-black tracking-widest text-white/50">No</p>
            <p class="text-2xl sm:text-3xl font-black tabular-nums text-state-danger mt-1">{{ stats.rsvpNo || 0 }}</p>
          </div>
        </div>
      </footer>
    </div>

    <!-- Corner controls — hidden until hover so they don't clutter the projection. -->
    <div class="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button type="button" @click="toggleFullscreen"
              class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white"
              title="Toggle fullscreen (double-click anywhere)">
        <ArrowsPointingOutIcon v-if="!isFullscreen" class="w-4 h-4" />
        <ArrowsPointingInIcon v-else class="w-4 h-4" />
      </button>
      <router-link :to="`/scanner/${route.params.eventId}`"
                   class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white"
                   title="Back to scanner">
        <XMarkIcon class="w-4 h-4" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon,
} from '@heroicons/vue/24/outline';
import { getEvent } from '@/services/events.service';
import { guestStats, listGuests } from '@/services/guests.service';
import { formatDateTime } from '@/utils/format';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const route = useRoute();
const loading = ref(true);
const event = ref(null);
const stats = ref({ total: 0, arrived: 0, rsvpYes: 0, rsvpNo: 0, rsvpMaybe: 0, rsvpPending: 0 });
const recentArrivals = ref([]);
let pollTimer = null;
let clockTimer = null;
const now = ref(Date.now());
const clock = computed(() => new Date(now.value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

const arrivalPct = computed(() => {
  const confirmed = stats.value.rsvpYes || stats.value.total || 0;
  return confirmed ? Math.min(100, Math.round(((stats.value.arrived || 0) / confirmed) * 100)) : 0;
});

const eventTypeLabel = computed(() => {
  const t = String(event.value?.eventType || 'event').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
});

// Deterministic gradient per name — matches EventCard so the same guest
// gets the same color across every surface they appear in.
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
function gradientForName(name) {
  let h = 0; for (const ch of (name || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
function initials(name) { return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// Poll every 6 seconds — stats + recent arrivals. Cheap enough for a
// venue's WiFi, live enough that "someone just arrived" shows within a
// couple heartbeats.
async function refresh() {
  try {
    const [s, g] = await Promise.all([
      guestStats(route.params.eventId),
      listGuests(route.params.eventId, { arrivalStatus: 'arrived', limit: 200 }),
    ]);
    stats.value = s;
    // Sort by lastArrivedAt (newest first) — falls back to updatedAt if
    // the backend doesn't stamp arrivals separately. Take last 12 as ticker.
    const sorted = [...(g.items || [])]
      .filter((x) => x.arrivalStatus === 'arrived')
      .sort((a, b) => new Date(b.lastArrivedAt || b.updatedAt).getTime() - new Date(a.lastArrivedAt || a.updatedAt).getTime())
      .slice(0, 12);
    recentArrivals.value = sorted.map((x) => ({
      _id: x._id,
      name: `${x.firstName || ''} ${x.lastName || ''}`.trim() || 'Guest',
      at: x.lastArrivedAt || x.updatedAt,
    }));
  } catch (_) { /* fail silent — TV dashboard should keep showing last-known state */ }
}

// Fullscreen toggle — double-click anywhere or click the corner button.
const isFullscreen = ref(false);
function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
}
function onFsChange() { isFullscreen.value = !!document.fullscreenElement; }

onMounted(async () => {
  try {
    const { event: e } = await getEvent(route.params.eventId);
    event.value = e;
  } catch (_) {}
  await refresh();
  loading.value = false;
  pollTimer = setInterval(refresh, 6000);
  clockTimer = setInterval(() => (now.value = Date.now()), 1000);
  document.addEventListener('fullscreenchange', onFsChange);
});
onBeforeUnmount(() => {
  clearInterval(pollTimer);
  clearInterval(clockTimer);
  document.removeEventListener('fullscreenchange', onFsChange);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
});
</script>
