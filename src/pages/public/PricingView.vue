<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night">
    <PublicNav />

    <section class="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-10 text-center">
      <p class="section-eyebrow mb-3">{{ t('pricing.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-black text-surface-charcoal dark:text-surface-bone tracking-tight">{{ t('pricing.title') }}</h1>
      <p class="text-lg text-surface-slate dark:text-surface-ash max-w-xl mx-auto mt-4 leading-relaxed">
        {{ t('pricing.subtitle') }}
      </p>

      <div class="mt-8 flex justify-center">
        <PricingToggle v-model="mode" :options="[{ value: 'packages', label: t('pricing.toggle.packages') }, { value: 'per_card', label: t('pricing.toggle.perCard') }]" />
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner label="Loading pricing…" /></div>
      <p v-else-if="error" class="text-center text-red-600 dark:text-red-400 py-8">{{ error }}</p>

      <div v-else-if="mode === 'packages'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <!-- Zero-priced tiers are hidden from the public marketing page —
             the free tier was removed everywhere, but an old admin-created
             0-TZS tier could otherwise leak back in. Only sensible non-zero
             packages appear here. -->
        <PricingCard
          v-for="(tier, i) in paidTiers"
          :key="tier._id"
          :tier="tier"
          :highlight="i === Math.max(0, paidTiers.length - 2)"
        />
      </div>

      <div v-else class="max-w-lg mx-auto surface-card p-10 text-center animate-slide-up">
        <p class="section-eyebrow mb-3">{{ t('pricing.perCard.eyebrow') }}</p>
        <div class="mb-3">
          <span class="text-5xl font-black text-surface-charcoal dark:text-surface-bone">{{ formatTZS(data.perCard.rateTZS) }}</span>
          <span class="text-sm text-surface-slate dark:text-surface-ash ml-2">/ {{ t('pricing.perCard.perGuest') }}</span>
        </div>
        <p class="text-md text-surface-slate dark:text-surface-ash leading-relaxed">{{ t('pricing.perCard.note') }}</p>
        <router-link to="/register" class="inline-block mt-8"><button class="btn-primary !px-8">{{ t('pricing.perCard.cta') }}</button></router-link>
      </div>
    </section>

    <!-- Add-ons — grouped by category instead of one flat wall, so 20+
         real options stay scannable instead of compressed into a grid
         sized for a handful. -->
    <section v-if="!loading && !error && data.addons.length" class="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div class="text-center mb-10">
        <p class="section-eyebrow mb-2">{{ t('pricing.addons.eyebrow') }}</p>
        <h2 class="text-3xl font-black text-surface-charcoal dark:text-surface-bone">{{ t('pricing.addons.title') }}</h2>
        <p class="text-md text-surface-slate dark:text-surface-ash max-w-lg mx-auto mt-2">{{ t('pricing.addons.subtitle') }}</p>
      </div>

      <div class="space-y-10">
        <div v-for="cat in addonCategories" :key="cat">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft mb-3">{{ cat }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="a in addonsByCategory(cat)" :key="a._id"
                 class="surface-card p-4 flex items-start justify-between gap-3 hover:shadow-gold-soft transition-shadow">
              <div class="min-w-0 flex-1">
                <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">{{ a.name }}</p>
                <p class="text-xs text-surface-slate dark:text-surface-ash leading-relaxed mt-0.5">{{ a.description || t('pricing.addons.per', { unit: a.unit }) }}</p>
              </div>
              <p class="text-md font-black text-brand-primary-deep dark:text-brand-primary-soft whitespace-nowrap shrink-0">
                {{ a.priceTZS === 0 ? 'Included' : formatTZS(a.priceTZS) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <PublicFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchPublicPricing } from '@/services/pricing.service';
const { t } = useI18n();
import { formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import PublicNav from '@/components/layout/PublicNav.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';
import PricingCard from '@/components/pricing/PricingCard.vue';
import PricingToggle from '@/components/pricing/PricingToggle.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const mode = ref('packages');
const loading = ref(true);
const error = ref('');
const data = ref({ tiers: [], addons: [], perCard: { rateTZS: 300 } });

// Stable category order — matches amoevents-backend's seed script exactly.
const CATEGORY_ORDER = ['Guests', 'Messaging', 'Storage', 'Design', 'Support', 'Advanced'];
// See template comment — filter out anything without a real price so the
// public catalog doesn't silently reintroduce a "Free" card.
const paidTiers = computed(() => (data.value.tiers || []).filter((t) => (t.priceTZS || 0) > 0));

const addonCategories = computed(() => {
  const present = new Set((data.value.addons || []).map((a) => a.category || 'General'));
  return CATEGORY_ORDER.filter((c) => present.has(c)).concat([...present].filter((c) => !CATEGORY_ORDER.includes(c)));
});
function addonsByCategory(cat) {
  return (data.value.addons || []).filter((a) => (a.category || 'General') === cat);
}

onMounted(async () => {
  try {
    data.value = await fetchPublicPricing();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
});
</script>
