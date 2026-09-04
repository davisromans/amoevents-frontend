<template>
  <div
    class="relative rounded-3xl p-7 flex flex-col animate-slide-up transition-all duration-300"
    :class="highlight
      ? 'bg-gradient-to-b from-surface-ivory to-brand-gold-glow/40 dark:from-surface-coal dark:to-brand-gold-glow/30 border-2 border-brand-gold shadow-gold-glow'
      : 'bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog hover:border-brand-gold/40 hover:shadow-gold-soft'"
  >
    <div v-if="highlight" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-gold text-white text-2xs uppercase font-black tracking-widest shadow-gold-soft">
      Most popular
    </div>

    <div class="flex items-baseline justify-between">
      <h3 class="text-xl font-black text-surface-charcoal dark:text-surface-bone tracking-tight">{{ tier.name }}</h3>
    </div>

    <div class="my-6 pb-6 border-b border-surface-mist dark:border-surface-fog">
      <div class="flex items-baseline gap-1">
        <span class="text-4xl font-black text-surface-charcoal dark:text-surface-bone tracking-tight">
          {{ tier.priceTZS === 0 ? t('pricing.packages.free') : formatTZS(tier.priceTZS) }}
        </span>
        <span v-if="tier.priceTZS > 0" class="text-sm text-surface-slate dark:text-surface-ash font-bold">/ card</span>
      </div>
    </div>

    <ul class="space-y-2.5 flex-1">
      <li v-for="f in tier.features" :key="f" class="flex items-start gap-2.5 text-sm text-surface-charcoal dark:text-surface-bone leading-relaxed">
        <span class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              :class="highlight ? 'bg-brand-gold text-white' : 'bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft'">
          <CheckIcon class="w-2.5 h-2.5" />
        </span>
        <span>{{ f }}</span>
      </li>
    </ul>

    <router-link to="/register" class="mt-8" v-slot="{ navigate }">
      <button
        class="w-full"
        :class="highlight ? 'btn-primary !py-3' : 'btn-secondary !py-3'"
        @click="navigate"
      >{{ tier.priceTZS === 0 ? t('pricing.packages.chooseFree') : t('pricing.packages.chooseThis') }}</button>
    </router-link>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { CheckIcon } from '@heroicons/vue/20/solid';
import { formatTZS } from '@/utils/format';
defineProps({
  tier: { type: Object, required: true },
  highlight: Boolean,
});
const { t } = useI18n();
</script>
