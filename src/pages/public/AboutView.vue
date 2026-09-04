<template>
  <MarketingPage
    eyebrow="About us"
    subtitle="Built in Dar es Salaam. Made for events across East Africa. Used, so far, by 2,000+ organisers."
    :primary-cta="{ label: 'Set up your first event', to: '/register' }"
  >
    <template #headline>
      Every event<br />
      <span class="bg-gradient-primary bg-clip-text text-transparent">deserves better tooling.</span>
    </template>

    <!-- Story -->
    <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-6">
      <p class="text-lg text-surface-charcoal dark:text-surface-bone leading-relaxed">
        Amo Events started as a wedding management tool built by people planning weddings — and it grew from there. Kitchen parties, send-offs, church services, conferences, corporate galas — every event has the same core problem: a guest list, invitations that need to reach the right phones, RSVPs, arrivals to track, and photos to keep after.
      </p>
      <p class="text-lg text-surface-charcoal dark:text-surface-bone leading-relaxed">
        We built one dashboard for all of it. WhatsApp-first (with SMS fallback so nobody gets missed), a real ledger for the money side, a scanner that turns any phone into a professional gate, and a gallery that keeps every photo for years.
      </p>
      <p class="text-lg text-surface-charcoal dark:text-surface-bone leading-relaxed">
        It's operated by <strong>Davintech Labs</strong> out of Dar es Salaam, Tanzania. The same team also builds <a href="https://amoview.com" target="_blank" rel="noopener" class="text-brand-primary-deep dark:text-brand-primary-soft font-bold hover:underline">Amoview</a> — the streaming + community platform your event's gallery videos publish into.
      </p>
    </section>

    <!-- Team-first values, said plainly. Three columns. -->
    <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-y border-surface-mist dark:border-surface-fog">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">How we build</p>
        <h2 class="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Three things we keep coming back to.</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div v-for="v in VALUES" :key="v.title" class="p-6 rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog">
          <div class="w-10 h-10 rounded-xl bg-brand-primary-glow flex items-center justify-center text-brand-primary-deep dark:text-brand-primary-soft mb-4">
            <component :is="v.icon" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-black text-surface-charcoal dark:text-surface-bone">{{ v.title }}</h3>
          <p class="mt-1.5 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ v.description }}</p>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-8 sm:p-10">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Get in touch</p>
        <h2 class="mt-3 text-3xl font-black tracking-tight">Any question, any time.</h2>
        <p class="mt-3 text-md text-surface-slate dark:text-surface-ash leading-relaxed">Support requests, custom-package inquiries, help planning a big event — one inbox, one team, one country.</p>
        <div class="mt-6 flex flex-col sm:flex-row items-start gap-4">
          <a :href="`mailto:${brand.supportEmail}`" class="btn-primary !text-md">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            {{ brand.supportEmail }}
          </a>
          <div class="text-sm text-surface-slate dark:text-surface-ash">
            <p><strong class="text-surface-charcoal dark:text-surface-bone">Davintech Labs</strong></p>
            <p>Dar es Salaam, Tanzania</p>
          </div>
        </div>
      </div>
    </section>
  </MarketingPage>
</template>

<script setup>
import MarketingPage from '@/components/marketing/MarketingPage.vue';
import { useBrand } from '@/composables/useBrand';
import { HeartIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/vue/24/outline';

const { brand } = useBrand();

const VALUES = [
  { title: 'Built with hosts, not for them', description: 'Every feature landed because a real organiser asked for it during a real event — not a whiteboard exercise.', icon: HeartIcon },
  { title: 'Money moves cleanly',              description: 'Real ledger, real receipts, real refunds. Financial data is treated as a first-class citizen, not an afterthought.', icon: LockClosedIcon },
  { title: 'Made for the East African market', description: 'Mobile Money is the primary payment. Swahili and English are equal citizens. WhatsApp is the primary channel.',       icon: GlobeAltIcon },
];
</script>
