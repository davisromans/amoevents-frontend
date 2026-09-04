<template>
  <Sheet :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" side="right" :size="480">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shrink-0"
             :style="{ background: avatarGradient }">{{ initials }}</div>
        <div class="min-w-0">
          <h2 class="text-lg font-black text-surface-charcoal dark:text-surface-bone truncate flex items-center gap-1.5">
            {{ guest?.firstName }} {{ guest?.lastName }}
            <StarIcon v-if="guest?.isVip" class="w-4 h-4 text-brand-primary-deep dark:text-brand-primary-soft" />
          </h2>
          <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash font-mono">{{ guest?.memberId }}</p>
        </div>
      </div>
    </template>

    <div v-if="guest" class="space-y-6">
      <!-- Status pills -->
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge :tone="rsvpTone(guest.rsvpStatus)">RSVP: {{ rsvpLabel(guest.rsvpStatus) }}</Badge>
        <Badge :tone="guest.arrivalStatus === 'arrived' ? 'success' : 'neutral'">
          {{ guest.arrivalStatus === 'arrived' ? '✓ Arrived' : 'Not arrived' }}
        </Badge>
        <Badge tone="neutral" size="sm">{{ typeLabel(guest.type) }}</Badge>
      </div>

      <!-- Contact -->
      <section>
        <SectionHeader title="Contact" level="subsection" />
        <dl class="grid grid-cols-1 gap-3 text-sm">
          <div class="flex items-start justify-between gap-3">
            <dt class="text-surface-slate dark:text-surface-ash">Phone</dt>
            <dd class="text-right min-w-0">
              <template v-if="isPlaceholderPhone(guest.phone)">
                <Badge tone="warning" size="sm">Missing</Badge>
              </template>
              <template v-else>
                <span class="text-surface-charcoal dark:text-surface-bone tabular-nums">{{ guest.phone }}</span>
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span v-if="guest.whatsappStatus === 'available'" class="inline-flex items-center gap-1 text-2xs font-bold text-state-success">
                    <CheckCircleIcon class="w-3 h-3" /> WhatsApp
                  </span>
                  <span v-else-if="guest.whatsappStatus === 'not_available'" class="text-2xs text-surface-slate dark:text-surface-ash">SMS only</span>
                </div>
              </template>
            </dd>
          </div>
          <div v-if="guest.whatsapp && guest.whatsapp !== guest.phone" class="flex items-start justify-between gap-3">
            <dt class="text-surface-slate dark:text-surface-ash">WhatsApp</dt>
            <dd class="text-right text-surface-charcoal dark:text-surface-bone tabular-nums">{{ guest.whatsapp }}</dd>
          </div>
        </dl>
      </section>

      <!-- Tags -->
      <section v-if="tagObjects.length">
        <SectionHeader title="Tags" level="subsection" />
        <div class="flex flex-wrap gap-1.5">
          <span v-for="t in tagObjects" :key="t._id"
                class="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-md"
                :style="{ background: t.color || 'var(--surface-mist)', color: '#1F1E1A' }">
            {{ t.name }}
          </span>
        </div>
      </section>

      <!-- Pledge -->
      <section v-if="guest.pledge?.amount">
        <SectionHeader title="Pledge" level="subsection" />
        <div class="p-3 rounded-xl bg-surface-cream dark:bg-surface-night border border-surface-mist dark:border-surface-fog">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-2xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums">{{ fmtTZS(guest.pledge.amount) }}</p>
            <Badge :tone="guest.pledge.status === 'fulfilled' ? 'success' : 'warning'">{{ guest.pledge.status === 'fulfilled' ? 'Received' : 'Pending' }}</Badge>
          </div>
          <p v-if="guest.pledge.item" class="text-sm text-surface-slate dark:text-surface-ash mt-1">{{ guest.pledge.item }}</p>
        </div>
      </section>

      <!-- QR preview -->
      <section>
        <SectionHeader title="Entry QR" level="subsection">
          <template #actions>
            <Button variant="ghost" size="sm" @click="$emit('download-qr', guest)">
              <template #leading><ArrowDownTrayIcon class="w-4 h-4" /></template>
              Download
            </Button>
          </template>
        </SectionHeader>
        <div class="aspect-square max-w-[240px] mx-auto p-4 rounded-2xl bg-surface-cream dark:bg-surface-night border border-surface-mist dark:border-surface-fog">
          <img v-if="qrUrl" :src="qrUrl" alt="QR code" class="w-full h-full object-contain" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('delete', guest)">
        <template #leading><TrashIcon class="w-4 h-4 text-state-danger" /></template>
        Delete
      </Button>
      <Button variant="secondary" @click="$emit('edit', guest)">
        <template #leading><PencilSquareIcon class="w-4 h-4" /></template>
        Edit
      </Button>
    </template>
  </Sheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { StarIcon } from '@heroicons/vue/24/solid';
import { CheckCircleIcon, ArrowDownTrayIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { Badge, Button, SectionHeader, Sheet } from '@/components/ui';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { fetchGuestQrBlobUrl } from '@/services/guests.service';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  guest:      { type: Object, default: null },
  eventId:    { type: String, required: true },
  tags:       { type: Array, default: () => [] },
});
defineEmits(['update:modelValue', 'edit', 'delete', 'download-qr']);

const qrUrl = ref('');
watch(() => [props.modelValue, props.guest?._id], async ([open, id]) => {
  if (open && id) {
    qrUrl.value = '';
    try {
      const { objectUrl } = await fetchGuestQrBlobUrl(props.eventId, id);
      qrUrl.value = objectUrl;
    } catch { /* fall back to spinner state — parent will toast if needed */ }
  } else {
    qrUrl.value = '';
  }
}, { immediate: true });

const initials = computed(() => {
  const g = props.guest;
  return ((g?.firstName?.[0] || '') + (g?.lastName?.[0] || '')).toUpperCase() || '?';
});

// Deterministic avatar gradient — same guest, same colors, every open.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#D084FF,#9B59B6)',
  'linear-gradient(135deg,#FFB86B,#E5722F)',
  'linear-gradient(135deg,#79E0B3,#2FA675)',
  'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  'linear-gradient(135deg,#FFB0D4,#D9457A)',
  'linear-gradient(135deg,#B79CFF,#6C4CD9)',
];
const avatarGradient = computed(() => {
  const key = `${props.guest?.firstName || '?'}${props.guest?.lastName || ''}`;
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
});

const tagObjects = computed(() => {
  const ids = (props.guest?.tags || []).map((t) => (typeof t === 'string' ? t : t._id));
  return props.tags.filter((t) => ids.includes(t._id));
});

function rsvpLabel(s) { return ({ yes: 'Attending', no: 'Declined', maybe: 'Maybe', pending: 'Awaiting reply' })[s] || 'Awaiting reply'; }
function rsvpTone(s)  { return ({ yes: 'success', no: 'danger', maybe: 'warning' })[s] || 'neutral'; }
function typeLabel(t) { return ({ single: 'Single', double: 'Double', family: 'Family' })[t] || 'Single'; }
function isPlaceholderPhone(phone) { return String(phone || '').startsWith('no-phone:'); }
function fmtTZS(n) { return `${Number(n || 0).toLocaleString('sw-TZ')} TZS`; }
</script>
