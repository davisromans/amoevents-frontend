<template>
  <router-link :to="`/app/events/${event._id}`"
               class="group block rounded-2xl overflow-hidden surface-card !p-0 hover:shadow-elev-3 hover:border-brand-primary/40 transition-all">
    <!-- Cover — either a real image (if uploaded) or a deterministic
         gradient from the event name. Overlay carries name + date. -->
    <div class="relative aspect-[16/9] overflow-hidden"
         :style="!event.coverImageUrl ? { background: gradient } : undefined">
      <img v-if="event.coverImageUrl" :src="event.coverImageUrl" :alt="event.name"
           class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-slow" />
      <div v-else class="absolute inset-0 opacity-30" aria-hidden="true"
           style="background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25), transparent 50%);" />

      <!-- Gradient shade so text reads over any cover. -->
      <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

      <div class="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <Badge :tone="statusTone" size="sm" class="!bg-white/20 !backdrop-blur !text-white">{{ statusLabel }}</Badge>
        <Badge :tone="paymentTone" size="sm">{{ paymentLabel }}</Badge>
      </div>

      <div class="absolute bottom-3 left-4 right-4 text-white">
        <p class="text-2xs uppercase font-black tracking-widest opacity-80">{{ eventTypeLabel }}</p>
        <h3 class="text-lg font-black tracking-tight truncate">{{ event.name }}</h3>
        <p class="text-2xs opacity-80 mt-0.5">{{ formatDate(event.date) }}<span v-if="event.venue?.name"> · {{ event.venue.name }}</span></p>
      </div>
    </div>

    <!-- Metrics + progress meter -->
    <div class="p-4">
      <div class="grid grid-cols-3 gap-3 text-center">
        <div>
          <p class="text-lg font-black text-surface-charcoal dark:text-surface-bone tabular-nums leading-none">{{ event.guestCount || 0 }}</p>
          <p class="text-2xs uppercase font-bold tracking-widest text-surface-slate dark:text-surface-ash mt-1">Guests</p>
        </div>
        <div>
          <p class="text-lg font-black text-state-success tabular-nums leading-none">{{ event.rsvpYesCount || 0 }}</p>
          <p class="text-2xs uppercase font-bold tracking-widest text-surface-slate dark:text-surface-ash mt-1">RSVP</p>
        </div>
        <div>
          <p class="text-lg font-black text-brand-primary-deep dark:text-brand-primary-soft tabular-nums leading-none">{{ event.arrivedCount || 0 }}</p>
          <p class="text-2xs uppercase font-bold tracking-widest text-surface-slate dark:text-surface-ash mt-1">Arrived</p>
        </div>
      </div>

      <div v-if="progress != null" class="mt-4">
        <div class="flex items-center justify-between text-2xs text-surface-slate dark:text-surface-ash mb-1.5">
          <span>{{ progressLabel }}</span>
          <span class="font-bold tabular-nums text-surface-charcoal dark:text-surface-bone">{{ progress }}%</span>
        </div>
        <Progress :value="progress" :max="100" size="sm" :tone="progressTone" />
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { Badge, Progress } from '@/components/ui';
import { formatDate } from '@/utils/format';

const props = defineProps({
  event: { type: Object, required: true },
});

// Deterministic gradient from event name — same event, same colors forever.
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
const gradient = computed(() => {
  const key = String(props.event?.name || '?');
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
});

// Status is derived from date + event.status. "Upcoming" if date is in the
// future and not archived; "Past" if in the past; "Draft" if the flag says so.
const statusLabel = computed(() => {
  if (props.event.status === 'archived') return 'Archived';
  if (props.event.status === 'draft')    return 'Draft';
  const d = new Date(props.event.date);
  if (isNaN(d.getTime())) return 'Live';
  return d.getTime() < Date.now() ? 'Past' : 'Upcoming';
});
const statusTone = computed(() => ({ Upcoming: 'primary', Past: 'neutral', Draft: 'warning', Archived: 'neutral' })[statusLabel.value] || 'neutral');

const paymentLabel = computed(() => ({ paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' })[props.event.paymentStatus] || 'Unpaid');
const paymentTone  = computed(() => ({ paid: 'success', partial: 'warning', unpaid: 'danger' })[props.event.paymentStatus] || 'danger');

const eventTypeLabel = computed(() => {
  const t = String(props.event.eventType || 'event').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
});

// Progress meter shows the most useful metric for the event's stage:
// upcoming events show RSVP-response rate; past events show arrival rate.
const progress = computed(() => {
  const total = props.event.guestCount || 0;
  if (!total) return null;
  const past = statusLabel.value === 'Past';
  const responded = (props.event.rsvpYesCount || 0) + (props.event.rsvpNoCount || 0) + (props.event.rsvpMaybeCount || 0);
  const num = past ? (props.event.arrivedCount || 0) : responded;
  return Math.min(100, Math.round((num / total) * 100));
});
const progressLabel = computed(() => statusLabel.value === 'Past' ? 'Arrivals' : 'RSVP responses');
const progressTone  = computed(() => {
  if (progress.value == null) return 'neutral';
  if (progress.value >= 75) return 'success';
  if (progress.value >= 40) return 'primary';
  return 'warning';
});
</script>
