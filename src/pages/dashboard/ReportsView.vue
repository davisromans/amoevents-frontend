<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <div v-else-if="!items.length" class="surface-card p-16 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gold-glow flex items-center justify-center">
        <ChartBarSquareIcon class="w-8 h-8 text-brand-gold-deep dark:text-brand-gold-soft" />
      </div>
      <h3 class="text-heading mb-1">No events to report on yet</h3>
      <p class="text-subtext max-w-md mx-auto">
        Create an event and add guests — analytics will appear here per event.
      </p>
    </div>

    <div v-else class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Events" :value="totals.events" />
        <BigStat label="Guests total" :value="totals.guests" tone="gold" />
        <BigStat label="Arrived total" :value="totals.arrived" tone="success" />
        <BigStat label="Cost estimate" :value="formatTZS(totals.cost)" :tone="'default'" />
      </div>

      <div class="surface-card overflow-hidden">
        <div class="p-5 border-b border-surface-mist dark:border-surface-fog flex items-center justify-between">
          <h2 class="text-heading">Per-event breakdown</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-md">
            <thead>
              <tr class="text-left text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash border-b border-surface-mist dark:border-surface-fog">
                <th class="px-5 py-3 font-black">Event</th>
                <th class="px-5 py-3 font-black text-right">Guests</th>
                <th class="px-5 py-3 font-black text-right">RSVP Yes</th>
                <th class="px-5 py-3 font-black text-right">Arrived</th>
                <th class="px-5 py-3 font-black">Payment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in items" :key="e._id"
                  class="border-b border-surface-mist dark:border-surface-fog hover:bg-surface-mist/30 dark:hover:bg-surface-fog/30 transition-colors">
                <td class="px-5 py-4">
                  <router-link :to="`/app/events/${e._id}/analytics`" class="block">
                    <p class="font-extrabold text-surface-charcoal dark:text-surface-bone truncate">{{ e.name }}</p>
                    <p class="text-subtext">{{ formatDate(e.date) }}</p>
                  </router-link>
                </td>
                <td class="px-5 py-4 text-right tabular-nums font-bold">{{ e.guestCount || 0 }}</td>
                <td class="px-5 py-4 text-right tabular-nums">{{ e.rsvpYesCount || 0 }}</td>
                <td class="px-5 py-4 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{{ e.arrivedCount || 0 }}</td>
                <td class="px-5 py-4">
                  <span :class="paymentChip(e.paymentStatus)">{{ e.paymentStatus }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ChartBarSquareIcon } from '@heroicons/vue/24/outline';
import { listEvents } from '@/services/events.service';
import { formatDate, formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import BigStat from '@/components/events/EventBigStat.vue';

const toast = useToast();
const items = ref([]);
const loading = ref(true);

const totals = computed(() => ({
  events: items.value.length,
  guests: items.value.reduce((s, e) => s + (e.guestCount || 0), 0),
  arrived: items.value.reduce((s, e) => s + (e.arrivedCount || 0), 0),
  cost: 0, // placeholder — will be populated from analytics rollups later
}));

function paymentChip(s) {
  return ({ paid: 'chip-success', partial: 'chip-warn', unpaid: 'chip' }[s] || 'chip');
}

onMounted(async () => {
  try { const { items: list } = await listEvents({ limit: 100 }); items.value = list; }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
