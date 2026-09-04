<template>
  <MarketingPage
    eyebrow="Who it's for"
    subtitle="One dashboard, many events — here's what it looks like for the most common ones."
    :primary-cta="{ label: 'Set up your first event', to: '/register' }"
  >
    <template #headline>
      Built for the events<br />
      <span class="bg-gradient-primary bg-clip-text text-transparent">East Africa runs.</span>
    </template>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-16 sm:space-y-24">
      <div v-for="(uc, i) in USE_CASES" :key="uc.title"
           :class="[
             'grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 items-center',
             i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
           ]">
        <div>
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">{{ uc.eyebrow }}</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-black tracking-tight leading-tight">{{ uc.title }}</h2>
          <p class="mt-4 text-lg text-surface-slate dark:text-surface-ash leading-relaxed">{{ uc.description }}</p>
          <ul class="mt-6 space-y-2.5">
            <li v-for="b in uc.bullets" :key="b" class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              </span>
              <span class="text-md text-surface-charcoal dark:text-surface-bone">{{ b }}</span>
            </li>
          </ul>
        </div>

        <!-- Deterministic gradient poster with an emoji anchor. No fake
             photography that could look staged; just clean geometry. -->
        <div class="relative">
          <div class="absolute -inset-8 blur-3xl opacity-40 pointer-events-none" aria-hidden="true"
               :style="{ background: uc.gradient }" />
          <div class="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-elev-3 flex items-center justify-center text-white"
               :style="{ background: uc.gradient }">
            <div class="absolute inset-0 opacity-30" aria-hidden="true"
                 style="background-image: radial-gradient(circle at 20% 25%, rgba(255,255,255,0.4), transparent 45%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.25), transparent 50%);" />
            <div class="relative text-center">
              <div class="text-9xl sm:text-[10rem] leading-none">{{ uc.emoji }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-8 sm:p-12 text-center shadow-elev-2">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Any event, really</p>
        <h2 class="mt-3 text-3xl font-black tracking-tight">If it has a guest list, it works.</h2>
        <p class="mt-3 text-md text-surface-slate dark:text-surface-ash max-w-lg mx-auto">Comedy shows, sports events, festivals, corporate functions — same tools, same simplicity, same one-dashboard experience.</p>
        <div class="mt-6">
          <router-link to="/register"><button class="btn-primary !px-6 !py-3 !text-md">Set up an event</button></router-link>
        </div>
      </div>
    </section>
  </MarketingPage>
</template>

<script setup>
import MarketingPage from '@/components/marketing/MarketingPage.vue';

const USE_CASES = [
  {
    eyebrow: 'Weddings',
    title: 'From save-the-date to the first dance.',
    description: 'The family list runs to 300+ names on both sides. AmoEvents keeps it clean, invites reach every phone, the gate never queues.',
    bullets: [
      'Excel import handles the "one from cousin, one from work" family sheet',
      'WhatsApp-first with SMS fallback — nobody gets missed',
      'RSVP buttons in Swahili: Nitakuja / Sitakuja / Sijui bado',
      'Pledge tracking for contributions collected during planning',
      'Photo gallery kept for 5 years on Premium and Elite',
    ],
    emoji: '💍',
    gradient: 'linear-gradient(135deg,#D084FF,#9B59B6)',
  },
  {
    eyebrow: 'Conferences',
    title: 'Registration to badge in one flow.',
    description: 'Ticketed events with 500+ attendees, badge scanning at multiple entrances, live capacity dashboard for the ops team.',
    bullets: [
      'Multi-gate scanner keeps one authoritative arrival count',
      'Live TV dashboard for the venue team to project on-screen',
      'Segmented broadcasts by delegate type (speaker / attendee / VIP)',
      'Tags for badge colours and dietary requirements',
    ],
    emoji: '🎤',
    gradient: 'linear-gradient(135deg,#7CC5FF,#3B7BD9)',
  },
  {
    eyebrow: 'Church services',
    title: 'A whole congregation, personally reached.',
    description: 'Sunday attendance, choir practice reminders, Easter and Christmas services — one dashboard, many recurring touchpoints.',
    bullets: [
      'Reminder cascades for weekly services and choir practices',
      'Group-based tags: youth, women\'s fellowship, choir, ushers',
      'Special-service RSVPs with capacity limits',
      'PIN-protected member directory',
      'Free tier of collaborators for team leaders',
    ],
    emoji: '⛪',
    gradient: 'linear-gradient(135deg,#79E0B3,#2FA675)',
  },
  {
    eyebrow: 'Corporate',
    title: 'For the team offsite, launch, or gala.',
    description: 'Invoiced billing and company-standard governance for the events team.',
    bullets: [
      'Priority support during the event day',
      'Detailed cost breakdown per campaign for finance',
    ],
    emoji: '🏢',
    gradient: 'linear-gradient(135deg,#FFB86B,#E5722F)',
  },
];
</script>
