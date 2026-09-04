<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <router-link :to="`/app/events/${route.params.id}`" class="btn-ghost !text-sm !px-2 !py-1 mb-1">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Back to event
    </router-link>
    <h1 class="section-title text-2xl mb-5">Analytics</h1>

    <div v-if="loading" class="flex justify-center py-8"><LoadingSpinner /></div>

    <div v-else-if="data" class="space-y-5">
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Guests" :value="data.guests.total" />
        <StatTile label="RSVP rate" :value="`${data.rates.rsvpRate}%`" tone="gold" />
        <StatTile label="Arrival rate" :value="`${data.rates.arrivalRate}%`" tone="success" />
        <StatTile label="No-show rate" :value="`${data.rates.noShowRate}%`" :tone="data.rates.noShowRate > 20 ? 'warn' : 'default'" />
      </section>

      <section class="surface-card p-6">
        <p class="section-eyebrow mb-3">RSVP breakdown</p>
        <div class="space-y-2">
          <Row label="Yes" :value="data.guests.rsvp.yes" :max="data.guests.total" color="#10b981" />
          <Row label="Maybe" :value="data.guests.rsvp.maybe" :max="data.guests.total" color="#f59e0b" />
          <Row label="No" :value="data.guests.rsvp.no" :max="data.guests.total" color="#ef4444" />
          <Row label="Pending" :value="data.guests.rsvp.pending" :max="data.guests.total" color="#9A7B2E" />
        </div>
      </section>

      <section class="surface-card p-6">
        <p class="section-eyebrow mb-3">WhatsApp availability</p>
        <div class="space-y-2">
          <Row label="Available" :value="data.guests.whatsapp.available" :max="data.guests.total" color="#25D366" />
          <Row label="Not available" :value="data.guests.whatsapp.notAvailable" :max="data.guests.total" color="#6b7280" />
          <Row label="Unknown (not checked)" :value="data.guests.whatsapp.unknown" :max="data.guests.total" color="#9A7B2E" />
        </div>
      </section>

      <section class="surface-card p-6">
        <p class="section-eyebrow mb-3">Messaging costs</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total sent" :value="data.messages.total" />
          <StatTile label="WA sent" :value="data.messages.whatsapp.sent" />
          <StatTile label="SMS sent" :value="data.messages.sms.sent" />
          <StatTile label="Cost / msg" :value="`${data.messages.costPerDeliveredTZS} TZS`" tone="gold" />
        </div>
        <div class="mt-4 flex items-center justify-between border-t border-surface-mist dark:border-surface-fog pt-3">
          <p class="text-heading">Total spend</p>
          <p class="text-lg font-black tabular-nums text-brand-gold-deep dark:text-brand-gold-soft">{{ formatTZS(data.messages.totalCostTZS) }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, defineComponent, h } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import { eventOverview } from '@/services/analytics.service';
import { formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatTile from '@/components/events/EventBigStat.vue';

// Inline lightweight bar component
const Row = defineComponent({
  props: ['label', 'value', 'max', 'color'],
  setup(props) {
    return () => {
      const pct = props.max > 0 ? Math.round((props.value / props.max) * 100) : 0;
      return h('div', { class: 'flex items-center gap-3' }, [
        h('span', { class: 'w-32 shrink-0 text-heading' }, props.label),
        h('div', { class: 'flex-1 h-2 bg-surface-mist dark:bg-surface-fog rounded-full overflow-hidden' }, [
          h('div', { class: 'h-full', style: { width: `${pct}%`, background: props.color } }),
        ]),
        h('span', { class: 'w-16 text-right text-sm tabular-nums font-bold text-surface-charcoal dark:text-surface-bone' }, `${props.value} · ${pct}%`),
      ]);
    };
  },
});

const route = useRoute();
const toast = useToast();
const data = ref(null);
const loading = ref(true);

onMounted(async () => {
  try { data.value = await eventOverview(route.params.id); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
