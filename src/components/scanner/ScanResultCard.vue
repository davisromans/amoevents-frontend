<template>
  <!-- Color-first layout: full-width band at the top and a saturated background
       tint make the outcome legible at a glance from meters away — gate staff
       shouldn't have to read text to know green vs amber vs red. -->
  <div class="rounded-2xl overflow-hidden shadow-gold-soft animate-scale-in" :class="cardBg">
    <div class="h-2 w-full" :class="bandBg" />
    <div class="p-5 flex items-start gap-3">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" :class="iconTile">
        <component :is="icon" class="w-8 h-8 text-white" />
      </div>
      <div class="min-w-0 flex-1">
        <span class="inline-block px-2.5 py-0.5 rounded-lg text-2xs uppercase font-black tracking-widest text-white"
              :class="bandBg">
          {{ headline }}
        </span>

        <!-- Guest path -->
        <template v-if="result.guest">
          <p class="text-xl font-black text-surface-charcoal dark:text-surface-bone truncate mt-1">
            {{ result.guest.firstName }} {{ result.guest.lastName }}
          </p>
          <p class="text-xs text-surface-slate dark:text-surface-ash">{{ result.guest.memberId }} · {{ result.guest.type }}</p>
          <p v-if="result.guest.type === 'family'" class="text-xs text-surface-charcoal dark:text-surface-bone mt-1">
            {{ result.guest.admittedCount }} of {{ result.guest.familySize }} admitted
          </p>
          <!-- VIP + tag chips so the gate operator sees at a glance who's who -->
          <div v-if="result.guest.isVip || result.guest.tags?.length" class="flex flex-wrap gap-1 mt-1.5">
            <span v-if="result.guest.isVip"
                  class="px-1.5 py-0.5 rounded-lg text-2xs font-black uppercase tracking-widest bg-gradient-gold text-surface-charcoal">
              ★ VIP
            </span>
            <span v-for="(t, i) in (result.guest.tags || [])" :key="i"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-2xs font-bold uppercase tracking-widest"
                  :style="t.color ? { background: t.color + '22', color: t.color } : {}"
                  :class="t.color ? '' : 'bg-surface-mist dark:bg-surface-fog text-surface-charcoal dark:text-surface-bone'">
              <span v-if="t.color" class="inline-block w-2 h-2 rounded-full" :style="{ background: t.color }" />
              {{ t.name }}
            </span>
          </div>
        </template>

        <!-- Wrong event path -->
        <template v-else-if="result.scannedEvent">
          <p class="text-xl font-black text-surface-charcoal dark:text-surface-bone truncate mt-1">{{ result.scannedEvent.name }}</p>
          <p class="text-xs text-surface-slate dark:text-surface-ash">{{ result.message || 'This QR is for a different event.' }}</p>
        </template>

        <!-- Warning line (unpaid, etc.) -->
        <p v-if="result.warning" class="text-2xs font-bold text-amber-700 dark:text-amber-400 mt-1">
          ⚠ {{ result.warning }}
        </p>
      </div>
      <StarIcon v-if="result.guest?.isVip" class="w-5 h-5 text-brand-gold-deep dark:text-brand-gold-soft shrink-0 mt-1" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, StarIcon } from '@heroicons/vue/24/solid';

const props = defineProps({ result: { type: Object, required: true } });

const isOk = computed(() => props.result.result?.startsWith('ok') || props.result.result === 'manual');
const isDup = computed(() => props.result.result === 'already_arrived');

const headline = computed(() => ({
  ok_first: 'Arrived',
  ok_family_increment: 'Family admitted',
  manual: 'Manual entry',
  already_arrived: 'Already arrived',
  wrong_event: 'Wrong event',
  invalid: 'Invalid QR',
}[props.result.result] || 'Scanned'));

const icon = computed(() => (isOk.value ? CheckCircleIcon : isDup.value ? ExclamationTriangleIcon : XCircleIcon));

// The three palette states — one truth for the top band, the pill, and the
// icon tile so the card reads as a single colour block, not scattered accents.
const bandBg = computed(() => (isOk.value ? 'bg-emerald-500' : isDup.value ? 'bg-amber-500' : 'bg-red-500'));
const iconTile = computed(() => (isOk.value ? 'bg-emerald-500' : isDup.value ? 'bg-amber-500' : 'bg-red-500'));
const cardBg = computed(() => (
  isOk.value
    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30'
    : isDup.value
      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30'
      : 'bg-red-50 dark:bg-red-950/30 border border-red-500/30'
));
</script>
