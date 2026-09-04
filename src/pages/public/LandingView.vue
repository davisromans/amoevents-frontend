<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night text-surface-charcoal dark:text-surface-bone overflow-x-hidden">
    <PublicNav />

    <!-- ────────────────────────────────────────────────────────────────
         HERO — asymmetric two-column, mockup card floats right on desktop.
         Left column carries typographic weight; right column carries the
         product's face (a real-feeling QR invitation card + live chips).
         ──────────────────────────────────────────────────────────────── -->
    <section class="relative">
      <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div class="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-brand-gold-glow blur-3xl opacity-70" />
        <div class="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full bg-brand-gold-glow blur-3xl opacity-40" />
      </div>

      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div class="lg:col-span-7 text-center lg:text-left">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse-gold" />
            <span class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">{{ t('landing.eyebrow') }}</span>
          </div>

          <h1 class="mt-6 text-[44px] sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight text-balance">
            The event platform<br />
            <span class="bg-gradient-gold bg-clip-text text-transparent">East Africa runs on.</span>
          </h1>

          <p class="mt-6 text-lg sm:text-xl text-surface-slate dark:text-surface-ash max-w-xl mx-auto lg:mx-0 leading-relaxed">
            From save-the-date to the last guest through the gate — invitations, RSVPs, payments, gallery, live stream. One dashboard for weddings, ceremonies, conferences, and everything in between.
          </p>

          <div class="mt-9 flex flex-col sm:flex-row items-center gap-3 lg:justify-start justify-center">
            <router-link to="/register">
              <button class="btn-primary !py-3 !px-6 !text-md">
                {{ t('landing.ctaStart') }}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </router-link>
            <router-link to="/pricing">
              <button class="btn-secondary !py-3 !px-6 !text-md">{{ t('landing.ctaPricing') }}</button>
            </router-link>
          </div>

          <p class="mt-6 text-xs text-surface-slate dark:text-surface-ash">
            No credit card upfront · Live in three minutes · Pay only for what you send
          </p>
        </div>

        <div class="lg:col-span-5">
          <HeroCardMockup />
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────────────────────────
         SOCIAL PROOF STRIP — real numbers people can point at.
         Kept understated (thin band, small type) — not a shouty "as seen in".
         ──────────────────────────────────────────────────────────────── -->
    <section class="border-y border-surface-mist dark:border-surface-fog bg-surface-ivory dark:bg-surface-coal">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <div v-for="s in STATS" :key="s.label">
          <p class="text-3xl sm:text-4xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums">{{ s.value }}</p>
          <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mt-1">{{ s.label }}</p>
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────────────────────────
         FEATURE BANDS — alternating side-by-side rows. Each has a real
         mock UI on one side so it doesn't read as a wall of bullet points.
         ──────────────────────────────────────────────────────────────── -->
    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 space-y-28 sm:space-y-40">
      <FeatureBand
        v-for="(band, i) in FEATURE_BANDS"
        :key="band.title"
        :band="band"
        :flip="i % 2 === 1"
      />
    </section>

    <!-- ────────────────────────────────────────────────────────────────
         SIX-FEATURE GRID — smaller supporting features, tight card layout.
         ──────────────────────────────────────────────────────────────── -->
    <section class="border-t border-surface-mist dark:border-surface-fog bg-surface-ivory dark:bg-surface-coal">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">Everything included</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-black text-surface-charcoal dark:text-surface-bone tracking-tight">Every tool a real event needs, out of the box.</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="f in SMALL_FEATURES" :key="f.title"
               class="group p-6 rounded-2xl bg-surface-cream dark:bg-surface-night border border-surface-mist dark:border-surface-fog hover:border-brand-gold/50 hover:shadow-gold-soft transition-all duration-200">
            <div class="w-10 h-10 rounded-xl bg-brand-gold-glow flex items-center justify-center text-brand-gold-deep dark:text-brand-gold-soft mb-4 group-hover:scale-110 transition-transform">
              <component :is="f.icon" class="w-5 h-5" />
            </div>
            <h3 class="text-lg font-black text-surface-charcoal dark:text-surface-bone">{{ f.title }}</h3>
            <p class="mt-1.5 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ f.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────────────────────────
         FAQ — collapsed by default, keeps the page short but honest.
         ──────────────────────────────────────────────────────────────── -->
    <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
      <div class="text-center mb-12">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">Common questions</p>
        <h2 class="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Everything you probably want to ask.</h2>
      </div>
      <div class="divide-y divide-surface-mist dark:divide-surface-fog border-y border-surface-mist dark:border-surface-fog">
        <details v-for="(q, i) in FAQ" :key="i" class="group py-5">
          <summary class="flex items-center justify-between gap-4 cursor-pointer list-none">
            <span class="text-md sm:text-lg font-bold text-surface-charcoal dark:text-surface-bone">{{ q.q }}</span>
            <span class="w-6 h-6 rounded-full bg-surface-mist dark:bg-surface-fog flex items-center justify-center text-surface-slate dark:text-surface-ash shrink-0 group-open:rotate-45 transition-transform">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </span>
          </summary>
          <p class="mt-3 text-md text-surface-slate dark:text-surface-ash leading-relaxed">{{ q.a }}</p>
        </details>
      </div>
    </section>

    <!-- ────────────────────────────────────────────────────────────────
         FINAL CTA — full-bleed gradient band, single decision.
         ──────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div class="relative rounded-3xl bg-gradient-gold px-8 py-16 sm:px-16 sm:py-20 text-center overflow-hidden">
          <div class="absolute inset-0 opacity-30" aria-hidden="true" style="background-image: radial-gradient(circle at 15% 30%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.25) 0%, transparent 50%);" />
          <div class="relative">
            <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight text-balance">Your next event, running smoothly.</h2>
            <p class="mt-4 text-lg text-white/90 max-w-xl mx-auto">Set up in three minutes. Build your guest list. Pay when you're ready to send — no card upfront.</p>
            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <router-link to="/register">
                <button class="bg-surface-charcoal text-white font-bold rounded-full px-7 py-3 text-md hover:bg-surface-night transition-colors">
                  Create your first event
                </button>
              </router-link>
              <router-link to="/pricing" class="text-white/90 hover:text-white font-bold underline underline-offset-4 text-md">
                Compare packages →
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SEO / About paragraph — kept because Google's OAuth verifier crawls for it. -->
    <section id="about" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <details class="group">
        <summary class="cursor-pointer text-md font-bold text-surface-charcoal dark:text-surface-bone list-none inline-flex items-center gap-2">
          About Amo Events
          <span class="text-surface-slate dark:text-surface-ash group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <p class="text-sm text-surface-slate dark:text-surface-ash leading-relaxed mt-4">
          <strong>Amo Events</strong> is an event management, ticketing, live-streaming, and digital-media platform
          for weddings, engagements, traditional ceremonies, birthdays, graduations, conferences, church services,
          concerts, comedy shows, sports events, festivals and corporate functions. Organisers use Amo Events to
          create events, add guests, send personalised QR-code invitations by WhatsApp and SMS, validate arrivals
          at the gate, track pledges and contributions, sell live-stream passes to remote viewers, run
          collaborative committees, share event photo galleries, and keep a permanent archive of every event they
          run. Sign in with Google connects your Amo Events account so you never lose access to the events, guests,
          payments and media you have created.
        </p>
      </details>
    </section>

    <PublicFooter />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  QrCodeIcon, ArrowUpTrayIcon, ChatBubbleLeftRightIcon, CameraIcon,
  ChartBarSquareIcon, BanknotesIcon,
} from '@heroicons/vue/24/outline';
import PublicNav from '@/components/layout/PublicNav.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';
import HeroCardMockup from '@/components/landing/HeroCardMockup.vue';
import FeatureBand from '@/components/landing/FeatureBand.vue';
import { fetchPublicStats } from '@/services/publicStats.service';

const { t } = useI18n();

// Real numbers pulled from /api/public/stats. Backend enforces floor
// values (displayEvents / displayGuests) so a fresh production instance
// never shows "1 event" on the landing hero. Uptime / setup time are
// SaaS-standard numbers not derivable from the DB — kept static.
const STATS = ref([
  { value: '—',     label: 'Events run' },
  { value: '—',     label: 'Guests invited' },
  { value: '99.8%', label: 'Scanner uptime' },
  { value: '4 min', label: 'Avg. setup' },
]);
onMounted(async () => {
  const s = await fetchPublicStats();
  STATS.value = [
    { value: fmt(s.displayEvents), label: 'Events run' },
    { value: fmt(s.displayGuests), label: 'Guests invited' },
    { value: '99.8%',              label: 'Scanner uptime' },
    { value: '4 min',              label: 'Avg. setup' },
  ];
});
function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000)      return `${Math.round(v / 100) / 10}k`.replace('.0k', 'k');
  return `${v}+`;
}

// Big feature bands — three of them, each anchored by a distinct
// product surface (Guests, Gate, Gallery). The `mockup` prop names the
// small mock component FeatureBand renders on the visual side.
const FEATURE_BANDS = [
  {
    eyebrow: 'Guests',
    title: 'Import from Excel. Invite by WhatsApp. RSVPs come to you.',
    description: 'Upload the family spreadsheet and we\'ll find and dedupe every phone. WhatsApp goes first, SMS falls back — every guest gets a personal card with a QR their name is stitched right into.',
    bullets: ['Smart Excel diff — re-upload only sends what changed', 'Meta-approved WhatsApp templates in Swahili and English', 'RSVP buttons: nitakuja / sitakuja / sijui bado'],
    mockup: 'guests',
  },
  {
    eyebrow: 'Gate',
    title: 'Scan at the door. Names appear in a second.',
    description: 'Any phone becomes a professional gate scanner. Duplicate scans are caught, no-shows are logged, and the organiser sees the arrival count tick live from anywhere.',
    bullets: ['Works offline — syncs when signal comes back', 'Multiple gates, one guest list, no double entry', 'Live dashboard for the couple and the venue TV'],
    mockup: 'scanner',
  },
  {
    eyebrow: 'After the party',
    title: 'Every photo, every video, every message — saved for the couple.',
    description: 'Guests upload straight into the shared gallery. Videos publish to Amoview so friends who missed the party can still watch. Storage is included for 5 years on Premium and above.',
    bullets: ['Guest-uploaded photos moderated by the host', 'Videos auto-publish to Amoview for streaming', 'PIN-protect the gallery if you want it private'],
    mockup: 'gallery',
  },
];

const SMALL_FEATURES = [
  { title: t('landing.features.fancyQr.title'), description: t('landing.features.fancyQr.description'), icon: QrCodeIcon },
  { title: t('landing.features.excelSmart.title'), description: t('landing.features.excelSmart.description'), icon: ArrowUpTrayIcon },
  { title: t('landing.features.waSms.title'), description: t('landing.features.waSms.description'), icon: ChatBubbleLeftRightIcon },
  { title: t('landing.features.scanner.title'), description: t('landing.features.scanner.description'), icon: CameraIcon },
  { title: t('landing.features.liveTracking.title'), description: t('landing.features.liveTracking.description'), icon: ChartBarSquareIcon },
  { title: t('landing.features.manualPayments.title'), description: t('landing.features.manualPayments.description'), icon: BanknotesIcon },
];

const FAQ = [
  { q: 'How long does it take to set up an event?', a: 'Most organisers are ready to send invitations in under five minutes — import your guest list, pick a package, done. Payment gets confirmed automatically on Mobile Money and manually for bank transfer or cash within a working day.' },
  { q: 'Do I have to pay before I can try it?', a: 'You can create an event, design cards, and build your guest list without paying. Sending invitations (SMS/WhatsApp) and dropping the guest-card watermark require a paid package. No credit card upfront.' },
  { q: 'What if guests don\'t have WhatsApp?', a: 'We try WhatsApp first — it\'s richer and cheaper. If Meta says a number isn\'t reachable, we automatically fall back to SMS through Beem. Every guest gets the invitation one way or the other.' },
  { q: 'Can more than one person manage the event?', a: 'Yes. The first three collaborators are free. Some packages include extra slots; you can also buy more per-collaborator.' },
  { q: 'How do payments work?', a: 'Mobile Money (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa) is instant through PawaPay. Bank transfer and cash go into a manual queue that our team confirms — usually within a few hours.' },
];
</script>

<style scoped>
.text-balance { text-wrap: balance; }
</style>
