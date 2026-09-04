<template>
  <PageShell
    title="My people"
    description="Every person who's ever been on any of your guest lists — with what they pledged and paid. This is your address book for future events."
  >
    <div class="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="relative flex-1 max-w-md">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash pointer-events-none" />
        <input v-model="q" type="text" placeholder="Search name or phone…" class="field-input !pl-10 w-full" />
      </div>
      <div class="flex items-center gap-1 p-1 rounded-xl surface-inset">
        <button v-for="s in SORTS" :key="s.value"
                type="button"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast',
                         sort === s.value
                           ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                           : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                @click="sort = s.value">
          {{ s.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <EmptyState v-else-if="!people.length"
                title="No contributors yet"
                description="Once someone shows up on any of your guest lists, they'll appear here with a running tally of what they've pledged and paid — across every event you've ever run.">
      <template #icon><UsersIcon class="w-7 h-7" /></template>
    </EmptyState>

    <EmptyState v-else-if="!filtered.length"
                title="Nothing matches your search"
                description="Clear the search to see everyone.">
      <template #icon><MagnifyingGlassIcon class="w-7 h-7" /></template>
      <template #actions>
        <Button variant="secondary" @click="q = ''">Clear search</Button>
      </template>
    </EmptyState>

    <div v-else class="surface-card overflow-hidden">
      <div class="grid grid-cols-12 px-5 py-3 border-b border-surface-mist dark:border-surface-fog text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">
        <div class="col-span-5">Person</div>
        <div class="col-span-2 text-right">Events</div>
        <div class="col-span-2 text-right">Pledged</div>
        <div class="col-span-2 text-right">Received</div>
        <div class="col-span-1"></div>
      </div>
      <ul class="divide-y divide-surface-mist dark:divide-surface-fog">
        <li v-for="p in filtered" :key="p.phone" class="grid grid-cols-12 items-center px-5 py-4 hover:bg-surface-mist/40 dark:hover:bg-surface-fog/40 transition-colors">
          <div class="col-span-5 min-w-0">
            <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ p.name || 'Unknown' }}</p>
            <p class="text-sm text-surface-slate dark:text-surface-ash truncate tabular-nums">{{ p.phone }}</p>
          </div>
          <div class="col-span-2 text-right tabular-nums">
            <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">{{ p.eventsCount }}</p>
            <p v-if="p.arrivedCount" class="text-2xs text-state-success">{{ p.arrivedCount }} arrived</p>
          </div>
          <div class="col-span-2 text-right tabular-nums">
            <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">{{ formatTZS(p.pledgedTZS) }}</p>
          </div>
          <div class="col-span-2 text-right tabular-nums">
            <p class="text-md font-bold"
               :class="p.receivedTZS >= p.pledgedTZS && p.pledgedTZS > 0 ? 'text-state-success' : 'text-surface-charcoal dark:text-surface-bone'">
              {{ formatTZS(p.receivedTZS) }}
            </p>
          </div>
          <div class="col-span-1 text-right">
            <button class="btn-ghost !p-2" :title="`Copy ${p.phone}`" @click="copyPhone(p.phone)">
              <ClipboardIcon class="w-4 h-4" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { MagnifyingGlassIcon, UsersIcon, ClipboardIcon } from '@heroicons/vue/24/outline';
import { listContributors } from '@/services/guestPortal.service';
import { formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { Button, EmptyState } from '@/components/ui';

const toast = useToast();
const loading = ref(true);
const people  = ref([]);
const q       = ref('');
const sort    = ref('received');

const SORTS = [
  { value: 'received', label: 'Top payers' },
  { value: 'events',   label: 'Most events' },
  { value: 'recent',   label: 'Most recent' },
];

const filtered = computed(() => {
  let list = people.value;
  const s = q.value.trim().toLowerCase();
  if (s) list = list.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(s));
  return [...list].sort((a, b) => {
    if (sort.value === 'events')  return b.eventsCount  - a.eventsCount;
    if (sort.value === 'recent')  return new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0);
    return (b.receivedTZS - a.receivedTZS) || (b.eventsCount - a.eventsCount);
  });
});

async function copyPhone(phone) {
  try { await navigator.clipboard.writeText(phone); toast.success('Phone copied'); }
  catch (_) { toast.error('Copy failed — copy the number manually'); }
}

onMounted(async () => {
  try { people.value = await listContributors(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
