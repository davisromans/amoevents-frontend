<template>
  <div v-if="show" :class="rootClasses">
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <LockClosedIcon class="w-5 h-5 text-state-warning shrink-0 mt-0.5" />
      <div class="min-w-0">
        <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">{{ title }}</p>
        <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ description }}</p>
      </div>
    </div>
    <router-link v-if="cta && ctaTo" :to="ctaTo" class="shrink-0">
      <Button variant="primary" size="sm">{{ cta }}</Button>
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { LockClosedIcon } from '@heroicons/vue/24/outline';
import { Button } from '@/components/ui';

const props = defineProps({
  /** Full event doc; the banner reads paymentStatus off it. */
  event: { type: Object, default: null },
  /**
   * "owner"  — for the organiser: shows "Unlock sending & drop watermark"
   *            with a CTA to the event's payment page.
   * "guest"  — for the guest-side view: shows "Preview only, host hasn't
   *            finished setup yet" with no CTA (guests can't pay).
   */
  audience: { type: String, default: 'owner' },
  /** Optional inline variant (thinner, no shadow) for use inside a card. */
  inline: { type: Boolean, default: false },
});

const show = computed(() => props.event && props.event.paymentStatus !== 'paid');

const title = computed(() => props.audience === 'guest'
  ? 'Preview only'
  : 'This event is unpaid');

const description = computed(() => props.audience === 'guest'
  ? 'The host is still finalising this event. Some details, sends, and downloads are locked until then.'
  : 'Cards stay watermarked and sends are blocked. Pay to unlock messaging and remove the watermark.');

const cta = computed(() => props.audience === 'owner' ? 'Pay now' : '');
const ctaTo = computed(() => props.audience === 'owner' && props.event?._id
  ? `/app/events/${props.event._id}/payment`
  : null);

const rootClasses = computed(() => {
  const base = 'flex items-start justify-between gap-4 flex-wrap rounded-2xl bg-state-warning-bg border border-state-warning/20 p-4';
  return props.inline ? base : `${base} mb-6`;
});
</script>
