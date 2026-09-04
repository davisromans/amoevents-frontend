<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else-if="data" class="space-y-5">
      <PageHeader :title="data.event.name" back="/app/my-invitations">
        <template #actions>
          <span :class="rsvpClass(data.guest.rsvpStatus)">{{ rsvpLabel(data.guest.rsvpStatus) }}</span>
        </template>
      </PageHeader>

      <p class="text-subtext -mt-3">
        {{ formatDateTime(data.event.date) }}
        <template v-if="data.event.venue?.name || data.event.venue?.address">
          ·
          <a v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener" class="underline decoration-dotted hover:text-brand-gold-deep dark:hover:text-brand-gold-soft">
            {{ data.event.venue.name || data.event.venue.address }}
          </a>
          <span v-else>{{ data.event.venue.name }}</span>
        </template>
      </p>

      <!-- Tab strip -->
      <div class="flex gap-1 border-b border-surface-mist dark:border-surface-fog">
        <button v-for="t in TABS" :key="t.id"
                class="px-3 py-2 text-sm font-bold border-b-2 transition"
                :class="tab === t.id
                  ? 'border-brand-gold text-brand-gold-deep dark:text-brand-gold-soft'
                  : 'border-transparent text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'"
                @click="tab = t.id">{{ t.label }}</button>
      </div>

      <!-- Card tab -->
      <div v-if="tab === 'card'" class="surface-card p-5 space-y-4">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gradient-gold text-white flex items-center justify-center text-2xl font-black shrink-0">
            {{ (data.guest.firstName || '?')[0] }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xl font-black text-surface-charcoal dark:text-surface-bone truncate">
              {{ data.guest.firstName }} {{ data.guest.lastName }}
            </p>
            <p class="text-subtext">
              {{ data.guest.type }}{{ data.guest.type === 'family' ? ` (${data.guest.familySize} seats)` : '' }}
              <span v-if="data.guest.isVip" class="ml-2 chip-gold !text-2xs">★ VIP</span>
            </p>
            <p class="text-2xs font-mono text-brand-gold-deep dark:text-brand-gold-soft mt-1">{{ data.guest.shortCode }}</p>
          </div>
        </div>
      </div>

      <!-- RSVP tab -->
      <div v-if="tab === 'rsvp'" class="surface-card p-5 space-y-3">
        <p class="text-heading">Will you be there?</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="opt in RSVP_OPTIONS" :key="opt.value"
                  class="px-4 py-2 rounded-xl text-sm font-bold border-2 transition"
                  :class="data.guest.rsvpStatus === opt.value
                    ? 'border-brand-gold bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft'
                    : 'border-surface-mist dark:border-surface-fog text-surface-charcoal dark:text-surface-bone hover:border-brand-gold/60'"
                  :disabled="rsvpBusy"
                  @click="submitRsvp(opt.value)">{{ opt.label }}</button>
        </div>
        <p v-if="rsvpAt" class="text-2xs text-surface-slate dark:text-surface-ash">Last updated {{ formatDateTime(rsvpAt) }}.</p>
      </div>

      <!-- Pledges tab -->
      <div v-if="tab === 'pledge'" class="surface-card p-5 space-y-3">
        <p class="text-heading">My contribution</p>
        <div v-if="data.guest.pledge?.amount > 0" class="grid grid-cols-3 gap-3 text-center">
          <div><p class="text-2xs uppercase text-surface-slate dark:text-surface-ash">Pledged</p><p class="text-md font-black">{{ formatTZS(data.guest.pledge.amount) }}</p></div>
          <div><p class="text-2xs uppercase text-surface-slate dark:text-surface-ash">Paid</p><p class="text-md font-black text-emerald-600 dark:text-emerald-400">{{ formatTZS(data.guest.pledge.receivedTZS || 0) }}</p></div>
          <div><p class="text-2xs uppercase text-surface-slate dark:text-surface-ash">Outstanding</p><p class="text-md font-black" :class="outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-surface-slate'">{{ formatTZS(outstanding) }}</p></div>
        </div>
        <p v-else class="text-subtext">No pledge on record for this event.</p>
      </div>

      <!-- Guest list tab (gated) -->
      <div v-if="tab === 'guests'" class="surface-card p-5 space-y-3">
        <div v-if="guestListLoading" class="flex justify-center py-6"><LoadingSpinner /></div>
        <div v-else-if="guestListError" class="text-subtext">{{ guestListError }}</div>
        <div v-else-if="guestList.length" class="divide-y divide-surface-mist dark:divide-surface-fog">
          <div v-for="g in guestList" :key="g._id" class="py-2 flex items-center gap-2">
            <span class="text-heading">{{ g.firstName }} {{ g.lastName }}</span>
            <span v-if="g.isVip" class="chip-gold !text-2xs">★</span>
            <span v-if="g.arrivalStatus === 'arrived'" class="chip-success text-2xs !py-0 !px-2">✓</span>
            <span v-if="g.phone" class="text-2xs text-surface-slate dark:text-surface-ash ml-auto font-mono">{{ g.phone }}</span>
          </div>
        </div>
      </div>

      <!-- Gallery + program (thin cards linking out) -->
      <div v-if="tab === 'gallery'" class="surface-card p-5">
        <p class="text-heading mb-2">Event gallery</p>
        <a :href="data.galleryUrl" target="_blank" class="btn-primary inline-flex">Open gallery</a>
      </div>

      <div v-if="tab === 'program'" class="surface-card p-5 space-y-4">
        <div v-if="data.event.church?.enabled" class="rounded-xl surface-inset p-3 flex items-start gap-2">
          <span class="text-lg leading-none">⛪</span>
          <div class="text-sm text-surface-charcoal dark:text-surface-bone">
            <p class="font-bold">{{ data.event.church.name }}</p>
            <p v-if="data.event.church.address" class="text-subtext">{{ data.event.church.address }}</p>
            <p v-if="data.event.church.serviceTime" class="text-2xs mt-1">Service at {{ data.event.church.serviceTime }}</p>
            <p v-if="data.event.church.arrivalTime" class="text-2xs text-surface-slate dark:text-surface-ash">Arrive by {{ data.event.church.arrivalTime }}</p>
          </div>
        </div>

        <p class="text-heading">Schedule</p>
        <p v-if="!data.event.program?.length" class="text-subtext">
          No detailed program shared. Check with the organiser.
        </p>
        <div v-else class="space-y-3">
          <div v-for="(item, i) in data.event.program" :key="i" class="flex items-start gap-3">
            <span class="w-14 shrink-0 text-2xs font-black text-brand-gold-deep dark:text-brand-gold-soft">{{ item.time }}</span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-surface-charcoal dark:text-surface-bone">{{ item.title }}</p>
              <p v-if="item.description" class="text-2xs text-surface-slate dark:text-surface-ash">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getMyEvent, getEventGuestList, submitMyRsvp } from '@/services/guestPortal.service';
import { formatDate, formatDateTime, formatTZS } from '@/utils/format';
import PageHeader from '@/components/layout/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/services/http';

const route = useRoute();
const toast = useToast();
const loading = ref(true);
const data = ref(null);
const tab = ref('card');
const rsvpBusy = ref(false);
const rsvpAt = ref(null);

const TABS = [
  { id: 'card',    label: 'My card' },
  { id: 'rsvp',    label: 'RSVP' },
  { id: 'pledge',  label: 'Pledge' },
  { id: 'guests',  label: 'Guest list' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'program', label: 'Program' },
];
const RSVP_OPTIONS = [
  { value: 'yes', label: 'Nitakuja' },
  { value: 'no',  label: 'Sitakuja' },
  { value: 'maybe', label: 'Sijui bado' },
];
const outstanding = computed(() => {
  const p = data.value?.guest?.pledge;
  return p ? Math.max(0, (p.amount || 0) - (p.receivedTZS || 0)) : 0;
});
const mapsUrl = computed(() => {
  const v = data.value?.event?.venue;
  if (!v) return '';
  const query = (v.lat != null && v.lng != null)
    ? `${v.lat},${v.lng}`
    : encodeURIComponent([v.name, v.address].filter(Boolean).join(', '));
  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
});

function rsvpLabel(s) { return ({ yes: 'Attending', no: 'Not attending', maybe: 'Maybe', pending: 'Awaiting reply' })[s] || 'Awaiting reply'; }
function rsvpClass(s) {
  const base = 'chip text-2xs !py-1 !px-3';
  return ({
    yes:   `${base} !bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300`,
    no:    `${base} !bg-red-500/15 !text-red-600 dark:!text-red-400`,
    maybe: `${base} !bg-amber-500/15 !text-amber-600 dark:!text-amber-400`,
  })[s] || base;
}

async function refresh() {
  loading.value = true;
  try { data.value = await getMyEvent(route.params.id); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function submitRsvp(status) {
  rsvpBusy.value = true;
  try {
    const r = await submitMyRsvp(route.params.id, status);
    data.value.guest.rsvpStatus = r.rsvpStatus;
    rsvpAt.value = r.rsvpAt;
    toast.success('RSVP saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { rsvpBusy.value = false; }
}

// Guest list — lazy-load on tab open, respects the event's visibility gate.
const guestList = ref([]);
const guestListLoading = ref(false);
const guestListError = ref('');
async function loadGuestList() {
  guestListLoading.value = true; guestListError.value = '';
  try {
    const r = await getEventGuestList(route.params.id);
    guestList.value = r.guests || [];
  } catch (err) {
    guestListError.value = err.response?.data?.error?.message || 'Not available.';
  } finally { guestListLoading.value = false; }
}
watch(tab, (t) => { if (t === 'guests' && !guestList.value.length) loadGuestList(); });

onMounted(refresh);
</script>
