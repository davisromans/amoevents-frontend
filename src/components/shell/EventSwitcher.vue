<template>
  <Popover align="start" side="bottom">
    <template #trigger="{ open }">
      <button type="button"
              :class="[
                'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors duration-fast',
                'hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60',
                open ? 'bg-surface-mist/60 dark:bg-surface-fog/60' : '',
              ]">
        <span class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white font-black text-2xs"
              :style="{ background: currentEvent ? gradientFor(currentEvent.name) : 'linear-gradient(135deg,#D084FF,#9B59B6)' }">
          <template v-if="currentEvent">{{ initials(currentEvent.name) }}</template>
          <CalendarDaysIcon v-else class="w-4 h-4" />
        </span>
        <span class="min-w-0 flex-1 text-left">
          <span class="block text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash truncate">Event</span>
          <span class="block text-sm font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ currentEvent?.name || 'All events' }}</span>
        </span>
        <svg class="w-4 h-4 text-surface-slate dark:text-surface-ash shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </template>
    <template #default="{ close }">
      <div class="w-72 max-h-[60vh] flex flex-col">
        <div class="px-3 py-2 border-b border-surface-mist dark:border-surface-fog">
          <input v-model="filter"
                 type="text" placeholder="Filter events…"
                 class="w-full bg-transparent outline-none text-sm text-surface-charcoal dark:text-surface-bone placeholder:text-surface-slate/60 dark:placeholder:text-surface-ash/60" />
        </div>
        <div class="flex-1 overflow-y-auto py-1">
          <router-link
            to="/app/events"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-slate dark:text-surface-ash hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60"
            @click="close"
          >
            <svg class="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>
            All events
          </router-link>
          <div v-if="shell.eventsLoading" class="px-3 py-4 text-center text-xs text-surface-slate dark:text-surface-ash">Loading…</div>
          <button v-for="e in filtered" :key="e._id"
                  type="button"
                  :class="[
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-fast',
                    e._id === currentEvent?._id
                      ? 'bg-brand-primary-glow'
                      : 'hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60',
                  ]"
                  @click="pick(e, close)">
            <span class="w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-white font-black text-2xs"
                  :style="{ background: gradientFor(e.name) }">{{ initials(e.name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-surface-charcoal dark:text-surface-bone truncate">{{ e.name }}</span>
              <span class="block text-2xs text-surface-slate dark:text-surface-ash">{{ formatDate(e.date) }}</span>
            </span>
            <svg v-if="e._id === currentEvent?._id" class="w-3.5 h-3.5 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          </button>
        </div>
        <div class="border-t border-surface-mist dark:border-surface-fog p-2">
          <router-link to="/app/events/new" class="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-brand-primary-deep dark:text-brand-primary-soft rounded-lg hover:bg-brand-primary-glow" @click="close">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Create event
          </router-link>
        </div>
      </div>
    </template>
  </Popover>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { CalendarDaysIcon } from '@heroicons/vue/24/outline';
import { useShellStore } from '@/stores/shell';
import Popover from '@/components/ui/Popover.vue';

const route = useRoute();
const shell = useShellStore();
const filter = ref('');

onMounted(() => shell.ensureEvents());

// Match the current event by route param. Fetched-events-first so we
// prefer the loaded record; falls back to a synthetic if the route id
// isn't cached yet (rare — sidebar loads eagerly).
const currentEvent = computed(() => {
  const id = route.params.id;
  if (!id) return null;
  return shell.events.find((e) => String(e._id) === String(id))
    || { _id: id, name: 'Loading…', date: null };
});

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return shell.events;
  return shell.events.filter((e) => (e.name || '').toLowerCase().includes(q));
});

function pick(e, close) {
  // Router-link would do this but we're inside a <button>. Use imperative nav.
  window.location.assign(`/app/events/${e._id}`);
  close();
}

function initials(n) { return (n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

// Deterministic gradient — same event, same colors, forever.
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
function gradientFor(name) {
  let h = 0; for (const ch of (name || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}
</script>
