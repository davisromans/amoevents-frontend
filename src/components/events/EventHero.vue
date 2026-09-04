<template>
  <section class="relative rounded-3xl overflow-hidden mb-8">
    <div class="relative aspect-[16/6] min-h-[220px]"
         :style="!event.coverImageUrl ? { background: gradient } : undefined">
      <img v-if="event.coverImageUrl" :src="event.coverImageUrl" :alt="event.name"
           class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 opacity-40" aria-hidden="true"
           style="background-image: radial-gradient(circle at 15% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.2), transparent 50%);" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div class="relative h-full flex flex-col justify-between p-6 sm:p-8 text-white">
        <!-- Top row: back link + status pills -->
        <div class="flex items-start justify-between gap-3">
          <router-link to="/app/events" class="inline-flex items-center gap-1.5 text-2xs uppercase font-black tracking-widest text-white/80 hover:text-white transition-colors">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
            All events
          </router-link>
          <div class="flex items-center gap-1.5 shrink-0">
            <Badge size="sm" class="!bg-white/20 !backdrop-blur !text-white">{{ statusLabel }}</Badge>
            <Badge size="sm" :tone="paymentTone">{{ paymentLabel }}</Badge>
          </div>
        </div>

        <!-- Bottom: name + when + countdown -->
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div class="min-w-0">
            <p class="text-2xs uppercase font-black tracking-widest text-white/70">{{ eventTypeLabel }}</p>
            <h1 class="mt-1 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05] truncate">{{ event.name }}</h1>
            <p class="mt-2 text-sm sm:text-md text-white/80">
              <ClockIcon class="w-4 h-4 inline -mt-0.5 mr-1" />
              {{ formatDateTime(event.date) }}
              <span v-if="event.venue?.name"> · {{ event.venue.name }}</span>
            </p>
          </div>
          <div v-if="countdown" class="shrink-0 bg-white/15 backdrop-blur rounded-2xl px-4 py-3 min-w-[160px] text-center">
            <p class="text-2xs uppercase font-black tracking-widest text-white/70">{{ countdown.label }}</p>
            <p class="text-2xl font-black tabular-nums mt-1">{{ countdown.value }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { Badge } from '@/components/ui';
import { formatDateTime } from '@/utils/format';

const props = defineProps({
  event: { type: Object, required: true },
});

// Deterministic gradient — matches EventCard so a card's cover flows
// seamlessly into the hero when the user clicks through.
const GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
const gradient = computed(() => {
  let h = 0; for (const ch of (props.event?.name || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
});

const statusLabel = computed(() => {
  if (props.event.status === 'archived') return 'Archived';
  if (props.event.status === 'draft')    return 'Draft';
  const d = new Date(props.event.date);
  if (isNaN(d.getTime())) return 'Live';
  return d.getTime() < Date.now() ? 'Past' : 'Upcoming';
});
const paymentLabel = computed(() => ({ paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' })[props.event.paymentStatus] || 'Unpaid');
const paymentTone  = computed(() => ({ paid: 'success', partial: 'warning', unpaid: 'danger' })[props.event.paymentStatus] || 'danger');
const eventTypeLabel = computed(() => {
  const t = String(props.event.eventType || 'event').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
});

// Live countdown — ticks every minute (no need for a real-time seconds
// timer on a page that isn't sports-live). Renders as "12 days" / "5h 24m"
// / "1h 15m" depending on distance, and shows "Today" on event day.
const now = ref(Date.now());
let tick = null;
onMounted(() => { tick = setInterval(() => (now.value = Date.now()), 60_000); });
onBeforeUnmount(() => clearInterval(tick));

const countdown = computed(() => {
  const t = new Date(props.event.date).getTime();
  if (isNaN(t)) return null;
  const diff = t - now.value;
  if (diff < -24 * 3600 * 1000) return { label: 'Event ended', value: `${Math.floor(-diff / (24 * 3600 * 1000))}d ago` };
  if (diff < 0) return { label: 'In progress', value: 'Today' };
  const days = Math.floor(diff / (24 * 3600 * 1000));
  if (days >= 2)  return { label: 'Starts in', value: `${days} days` };
  const hours = Math.floor(diff / 3600_000);
  if (hours >= 2) return { label: 'Starts in', value: `${hours}h` };
  const mins = Math.max(0, Math.floor(diff / 60_000));
  return { label: 'Starts in', value: `${hours}h ${mins % 60}m` };
});
</script>
