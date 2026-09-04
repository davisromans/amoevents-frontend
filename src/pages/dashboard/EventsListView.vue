<template>
  <PageShell title="Events" description="Everything you've ever run — active, past, and drafts.">
    <template #actions>
      <router-link to="/app/events/new">
        <Button variant="primary">
          <template #leading><PlusIcon class="w-4 h-4" /></template>
          New event
        </Button>
      </router-link>
    </template>

    <!-- Filter bar — search + status chips. Sticky at top of the content
         area so it stays reachable while scrolling long lists. -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash pointer-events-none" />
        <input v-model="q" type="text" placeholder="Search events by name or venue…"
               class="field-input !pl-10 w-full" />
      </div>
      <div class="flex items-center gap-1 p-1 rounded-xl surface-inset">
        <button v-for="opt in STATUS_FILTERS" :key="opt.value"
                type="button"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast',
                         statusFilter === opt.value
                           ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                           : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                @click="statusFilter = opt.value">
          {{ opt.label }}
          <span v-if="counts[opt.value]" class="ml-1 text-2xs opacity-70 tabular-nums">{{ counts[opt.value] }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <!-- Empty — no events at all -->
    <EmptyState v-else-if="!items.length"
                title="No events yet"
                description="Create your first event to start inviting guests, sending reminders, and running the gate.">
      <template #icon>
        <CalendarDaysIcon class="w-7 h-7" />
      </template>
      <template #actions>
        <router-link to="/app/events/new">
          <Button variant="primary">Create your first event</Button>
        </router-link>
      </template>
    </EmptyState>

    <!-- Empty — nothing matches filter/search -->
    <EmptyState v-else-if="!filtered.length"
                :title="`No ${statusFilter === 'all' ? '' : statusFilter} events match your search`"
                :description="q ? `Try a different search or clear the filter.` : `You don't have any events in this bucket yet.`">
      <template #icon>
        <MagnifyingGlassIcon class="w-7 h-7" />
      </template>
      <template #actions>
        <Button variant="secondary" @click="q = ''; statusFilter = 'all'">Clear filters</Button>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <EventCard v-for="e in filtered" :key="e._id" :event="e" />
    </div>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { PlusIcon, CalendarDaysIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import { listEvents } from '@/services/events.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PageShell from '@/components/shell/PageShell.vue';
import { Button, EmptyState } from '@/components/ui';
import EventCard from '@/components/events/EventCard.vue';

const items = ref([]);
const loading = ref(true);
const q = ref('');
const statusFilter = ref('upcoming'); // upcoming | past | draft | all
const toast = useToast();

const STATUS_FILTERS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past',     label: 'Past' },
  { value: 'draft',    label: 'Drafts' },
  { value: 'all',      label: 'All' },
];

// Bucket each event once so the filter chips can show counts without
// re-scanning per-bucket.
function bucketFor(e) {
  if (e.status === 'archived') return 'past';
  if (e.status === 'draft')    return 'draft';
  const d = new Date(e.date).getTime();
  return isNaN(d) || d < Date.now() ? (isNaN(d) ? 'draft' : 'past') : 'upcoming';
}

const buckets = computed(() => {
  const map = { upcoming: [], past: [], draft: [], all: items.value };
  for (const e of items.value) map[bucketFor(e)].push(e);
  return map;
});

const counts = computed(() => ({
  upcoming: buckets.value.upcoming.length,
  past:     buckets.value.past.length,
  draft:    buckets.value.draft.length,
  all:      items.value.length,
}));

const filtered = computed(() => {
  const list = buckets.value[statusFilter.value] || [];
  const s = q.value.trim().toLowerCase();
  if (!s) return list;
  return list.filter((e) => `${e.name} ${e.venue?.name || ''}`.toLowerCase().includes(s));
});

onMounted(async () => {
  try {
    const res = await listEvents();
    items.value = res.items || [];
    // If the default "Upcoming" bucket would render empty but the user
    // actually has events (drafts, or past events they just archived),
    // slide the filter to "All" instead of showing an empty state that
    // silently hides everything they own. Fixes the "I have 1 event but
    // Events tab is empty" complaint.
    if (items.value.length && !buckets.value.upcoming.length) {
      statusFilter.value = 'all';
    }
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
