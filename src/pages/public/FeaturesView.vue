<template>
  <MarketingPage
    eyebrow="Every feature"
    subtitle="What Amo Events does, in the order most organisers actually use it."
    :primary-cta="{ label: 'Set up your first event', to: '/register' }"
  >
    <template #headline>
      One product,<br />
      <span class="bg-gradient-primary bg-clip-text text-transparent">every step covered.</span>
    </template>

    <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-16 sm:space-y-24">
      <div v-for="(g, gi) in FEATURE_GROUPS" :key="g.eyebrow">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">{{ g.eyebrow }}</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-black tracking-tight">{{ g.title }}</h2>
          <p v-if="g.description" class="mt-3 text-md text-surface-slate dark:text-surface-ash leading-relaxed">{{ g.description }}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="f in g.features" :key="f.title"
               class="group p-6 rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog hover:border-brand-primary/40 hover:shadow-primary-soft transition-all duration-fast">
            <div class="w-10 h-10 rounded-xl bg-brand-primary-glow flex items-center justify-center text-brand-primary-deep dark:text-brand-primary-soft mb-4 group-hover:scale-110 transition-transform">
              <component :is="f.icon" class="w-5 h-5" />
            </div>
            <h3 class="text-lg font-black text-surface-charcoal dark:text-surface-bone">{{ f.title }}</h3>
            <p class="mt-1.5 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ f.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div class="rounded-3xl bg-gradient-primary p-8 sm:p-14 text-center overflow-hidden relative">
        <div class="absolute inset-0 opacity-25 pointer-events-none" aria-hidden="true"
             style="background-image: radial-gradient(circle at 15% 30%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.25), transparent 50%);" />
        <div class="relative">
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Ready to try it?</h2>
          <p class="mt-3 text-lg text-white/90 max-w-lg mx-auto">Set up your first event in three minutes. Pay only when you're ready to send.</p>
          <div class="mt-7 flex justify-center gap-3">
            <router-link to="/register">
              <button class="bg-surface-charcoal text-white font-bold rounded-full px-6 py-3 text-md hover:bg-surface-night transition-colors">Get started</button>
            </router-link>
            <router-link to="/pricing" class="inline-flex items-center gap-1 text-white/90 hover:text-white font-bold underline underline-offset-4 self-center">See pricing →</router-link>
          </div>
        </div>
      </div>
    </section>
  </MarketingPage>
</template>

<script setup>
import MarketingPage from '@/components/marketing/MarketingPage.vue';
import {
  UsersIcon, ArrowUpTrayIcon, EnvelopeIcon, ChatBubbleLeftRightIcon,
  ClockIcon, TagIcon, DocumentTextIcon, QrCodeIcon, CameraIcon,
  ChartBarSquareIcon, PhotoIcon, VideoCameraIcon, LockClosedIcon,
  BanknotesIcon, UserGroupIcon, ShieldCheckIcon,
  MapPinIcon, TvIcon,
} from '@heroicons/vue/24/outline';

const FEATURE_GROUPS = [
  {
    eyebrow: 'Guests',
    title: 'Your list, cleaned up and reachable.',
    description: 'Excel import, dedup, tag, segment — with a real safety net at the gate.',
    features: [
      { title: 'Excel smart-import', description: 'Drop the family sheet, we detect phone columns and dedupe. Re-uploading only sends what changed.', icon: ArrowUpTrayIcon },
      { title: 'Tag & segment',      description: 'VIP, family side, out-of-town — target sends by any label.',                                                             icon: TagIcon },
      { title: 'WhatsApp check',     description: 'We check every number against WhatsApp — sends fall back to SMS automatically for unreachable ones.',                    icon: ChatBubbleLeftRightIcon },
      { title: 'Pledges tracking',   description: 'Log expected contributions per guest, mark received, chase what\'s outstanding.',                                        icon: BanknotesIcon },
      { title: 'Sub-guests',         description: 'One guest brings a family — track admissions individually at the gate.',                                                 icon: UserGroupIcon },
      { title: 'Custom short codes', description: 'Guest QR codes carry a short human-readable ID (JN4-P31) — legible on a printed card, easy to say out loud.',            icon: DocumentTextIcon },
    ],
  },
  {
    eyebrow: 'Messaging',
    title: 'Every touchpoint from save-the-date to thank-you.',
    features: [
      { title: 'WhatsApp + SMS',    description: 'Meta-approved templates in Swahili and English. Fallback to SMS is automatic — no dead guests.',      icon: EnvelopeIcon },
      { title: 'Reminder cascade', description: 'Save-the-date, T-7, T-1, event day, thank-you — scheduled once, fires automatically.',                icon: ClockIcon },
      { title: 'Live cost',        description: 'See the total broadcast cost before you send. Real per-message rates, real audience count.',           icon: ChartBarSquareIcon },
      { title: 'Custom templates', description: 'Request bespoke WhatsApp templates — our team builds and submits to Meta for approval.',              icon: ChatBubbleLeftRightIcon },
    ],
  },
  {
    eyebrow: 'Gate',
    title: 'Any phone becomes a professional scanner.',
    features: [
      { title: 'Multi-gate',       description: 'Multiple people scanning at different doors — one live count, no double-entry.',                icon: QrCodeIcon },
      { title: 'Offline-tolerant', description: 'Scans queue locally and sync when signal returns — no lost admissions on flaky venue Wi-Fi.',  icon: CameraIcon },
      { title: 'TV mode',          description: 'A live arrivals dashboard designed for a venue projector — huge type, glanceable from a room.', icon: TvIcon },
      { title: 'Manual entry',     description: 'Search by phone or member ID and admit with a reason — for the guest who forgot their card.',  icon: ShieldCheckIcon },
    ],
  },
  {
    eyebrow: 'After the party',
    title: 'Every photo, every video, saved for the couple.',
    features: [
      { title: 'Photo gallery',     description: 'Guests upload straight into a shared, organiser-moderated album.',                       icon: PhotoIcon },
      { title: 'Video to Amoview',  description: 'Videos auto-publish to Amoview so friends who missed the party can still watch.',        icon: VideoCameraIcon },
      { title: '5-year storage',    description: 'Included on Premium and Elite. Storage bills automatically, per-GB, no surprise costs.', icon: LockClosedIcon },
      { title: 'PIN protection',    description: 'Optionally require a PIN to view the gallery — share it only with the guests you invite.', icon: LockClosedIcon },
    ],
  },
];
</script>
