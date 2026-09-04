<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night">
    <!-- Floating language + theme controls -->
    <div class="fixed top-3 right-3 z-30 flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="min-h-screen flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <div class="w-14 h-14 rounded-full bg-state-warning-bg text-state-warning flex items-center justify-center mx-auto mb-4">
          <ExclamationTriangleIcon class="w-7 h-7" />
        </div>
        <h1 class="text-2xl font-black text-surface-charcoal dark:text-surface-bone">Mwaliko haujapatikana</h1>
        <p class="text-md text-surface-slate dark:text-surface-ash mt-2">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="data">
      <!-- ── HERO — full-width gradient with couple/event name, guest's
             own name badge, date, and floating countdown. Deterministic
             gradient from the event name so every guest of the same event
             sees the same "cover". ────────────────────────────────── -->
      <section class="relative min-h-[70vh] flex flex-col justify-between overflow-hidden text-white"
               :style="{ background: heroGradient }">
        <!-- Layered radial washes for depth -->
        <div class="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true"
             style="background-image: radial-gradient(circle at 20% 25%, rgba(255,255,255,0.4), transparent 45%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.25), transparent 55%);" />
        <!-- Subtle grid texture -->
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden="true"
             style="background-image: linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 40px 40px;" />

        <header class="relative flex items-center gap-2 px-6 sm:px-10 pt-6">
          <img src="/logo.png" alt="" class="w-6 h-6 rounded-md" />
          <span class="text-sm font-black tracking-tight">Amo Events</span>
        </header>

        <div class="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-14 sm:py-20">
          <p class="text-2xs sm:text-xs uppercase font-black tracking-[0.35em] text-white/70">You are invited to</p>
          <p class="mt-3 text-2xs uppercase font-black tracking-widest text-white/80">{{ eventTypeLabel }}</p>
          <h1 class="mt-4 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl">{{ data.event.name }}</h1>
          <p class="mt-6 text-lg sm:text-xl font-semibold text-white/90">{{ formatDateTime(data.event.date) }}</p>

          <!-- Guest identity chip — big, centered, warm. -->
          <div class="mt-10 inline-flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 px-4 sm:px-5 py-3 shadow-2xl">
            <span class="w-10 h-10 rounded-xl bg-white text-brand-primary-deep font-black text-md flex items-center justify-center shrink-0">{{ guestInitials }}</span>
            <div class="text-left min-w-0">
              <p class="text-2xs uppercase font-black tracking-widest text-white/80">Reserved for</p>
              <p class="text-lg sm:text-xl font-black text-white truncate max-w-[240px]">
                {{ data.guest.firstName }} {{ data.guest.lastName }}
                <span v-if="data.guest.isVip" class="text-xs align-middle text-white/90">★ VIP</span>
              </p>
            </div>
          </div>

          <p class="mt-3 text-2xs uppercase font-black tracking-widest text-white/70 font-mono">{{ data.guest.memberId }}</p>
        </div>

        <!-- Countdown card at the bottom -->
        <div v-if="countdown" class="relative pb-8 sm:pb-12 flex justify-center px-6">
          <div class="inline-flex items-center gap-4 rounded-2xl bg-black/25 backdrop-blur-xl border border-white/20 px-5 py-3 shadow-elev-3">
            <ClockIcon class="w-5 h-5 text-white/80" />
            <div>
              <p class="text-2xs uppercase font-black tracking-widest text-white/70">{{ countdown.label }}</p>
              <p class="text-xl sm:text-2xl font-black tabular-nums leading-none mt-0.5">{{ countdown.value }}</p>
            </div>
          </div>
        </div>
      </section>

      <div class="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
        <!-- ── HOST MESSAGE ─────────────────────────────────────────── -->
        <section v-if="data.event.hostText" class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">A note from the host</p>
          <p class="mt-3 text-md leading-relaxed text-surface-charcoal dark:text-surface-bone">"{{ data.event.hostText }}"</p>
        </section>

        <!-- ── RSVP — hero interaction. Big buttons, warm confirmation. -->
        <section class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">RSVP</p>
              <p class="text-lg font-black text-surface-charcoal dark:text-surface-bone mt-1">Will you be there?</p>
            </div>
            <div v-if="data.guest.rsvpStatus !== 'pending'"
                 class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-state-success-bg text-state-success text-xs font-bold">
              <CheckCircleIcon class="w-3.5 h-3.5" />
              {{ statusLabel(data.guest.rsvpStatus) }}
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button v-for="opt in RSVP_OPTIONS" :key="opt.value"
                    type="button"
                    :disabled="submitting"
                    :class="[
                      'group relative py-4 rounded-2xl border-2 font-bold text-md transition-all duration-fast overflow-hidden',
                      data.guest.rsvpStatus === opt.value
                        ? 'border-brand-primary bg-gradient-primary text-white shadow-primary-soft'
                        : 'border-surface-mist dark:border-surface-fog text-surface-charcoal dark:text-surface-bone hover:border-brand-primary/50 hover:bg-brand-primary-glow'
                    ]"
                    @click="rsvp(opt.value)">
              <span class="text-xl block mb-0.5">{{ opt.emoji }}</span>
              <span class="text-sm font-black">{{ opt.label }}</span>
            </button>
          </div>
        </section>

        <!-- ── VENUE + CALENDAR ─────────────────────────────────────── -->
        <section v-if="(data.event.venue?.name || data.event.venue?.address) && showMaps"
                 class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Where</p>
          <div class="mt-3 flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center shrink-0">
              <MapPinIcon class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-lg font-black text-surface-charcoal dark:text-surface-bone">{{ data.event.venue?.name || '—' }}</p>
              <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ data.event.venue?.address }}</p>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <a v-if="data.event.directionsUrl"
               :href="data.event.directionsUrl" target="_blank" rel="noopener"
               class="btn-primary !text-sm flex-1 justify-center">
              <MapPinIcon class="w-4 h-4" /> Open in Maps
            </a>
            <a v-if="showCalendar" :href="calendarHref"
               class="btn-secondary !text-sm flex-1 justify-center">
              <CalendarDaysIcon class="w-4 h-4" /> Add to Calendar
            </a>
          </div>
        </section>

        <!-- ── PROGRAM (vertical timeline) ──────────────────────────── -->
        <section v-if="data.event.program?.length && showProgram"
                 class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-4">Program</p>
          <ol class="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-brand-primary/40 before:via-brand-primary/40 before:to-transparent">
            <li v-for="(p, i) in data.event.program" :key="i" class="relative">
              <span class="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-gradient-primary ring-4 ring-surface-ivory dark:ring-surface-coal" />
              <div class="flex items-baseline gap-3">
                <span class="text-sm font-black tabular-nums text-brand-primary-deep dark:text-brand-primary-soft shrink-0 w-14">{{ p.time }}</span>
                <div class="min-w-0">
                  <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">{{ p.title }}</p>
                  <p v-if="p.description" class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ p.description }}</p>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <!-- ── DRESS CODE ───────────────────────────────────────────── -->
        <section v-if="data.event.dressCode && showDressCode"
                 class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Dress code</p>
          <p class="mt-2 text-xl font-black text-surface-charcoal dark:text-surface-bone">{{ data.event.dressCode }}</p>
        </section>

        <!-- ── GALLERY ──────────────────────────────────────────────── -->
        <section v-if="showGallery && (photos.length || galleryLocked)"
                 class="rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 shadow-elev-2">
          <div class="flex items-center justify-between mb-4">
            <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Gallery</p>
            <span v-if="photos.length" class="text-xs text-surface-slate dark:text-surface-ash">{{ photos.length }} photo{{ photos.length === 1 ? '' : 's' }}</span>
          </div>

          <div v-if="galleryLocked" class="text-center py-6">
            <div class="w-12 h-12 rounded-2xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center mx-auto mb-3">
              <LockClosedIcon class="w-5 h-5" />
            </div>
            <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">This gallery is protected</p>
            <p class="text-sm text-surface-slate dark:text-surface-ash mt-1 mb-4">Ask the host for the PIN.</p>
            <div class="flex justify-center gap-2">
              <input v-model="pinInput" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                     placeholder="•••••"
                     class="field-input !w-36 !text-center !tracking-[0.5em] !font-black"
                     @keydown.enter="tryPin" />
              <Button variant="primary" :disabled="pinInput.length < 4 || pinTrying" @click="tryPin">Unlock</Button>
            </div>
            <p v-if="pinError" class="text-2xs text-state-danger mt-3">{{ pinError }}</p>
          </div>
          <div v-else class="grid grid-cols-3 gap-1.5">
            <button v-for="(p, i) in photos.slice(0, 9)" :key="p._id"
                    type="button"
                    class="relative aspect-square rounded-xl overflow-hidden bg-surface-mist dark:bg-surface-fog focus:outline-none focus:ring-2 focus:ring-brand-primary transition-transform hover:scale-[1.02]"
                    @click="openViewer(i)">
              <img :src="p.thumbUrl" loading="lazy" class="w-full h-full object-cover" alt="" />
              <div v-if="i === 8 && photos.length > 9" class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black">
                +{{ photos.length - 9 }}
              </div>
            </button>
          </div>
        </section>

        <!-- Footer -->
        <p class="text-center text-xs text-surface-slate dark:text-surface-ash pt-4">
          Powered by
          <router-link to="/" class="font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline">{{ brand.name }}</router-link>
        </p>
      </div>

      <!-- Full-screen viewer — shared component -->
      <GalleryViewer :items="viewerItems" v-model:index="viewerIndex" @close="viewerIndex = null" />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useBrand } from '@/composables/useBrand';
import {
  ExclamationTriangleIcon, MapPinIcon, CalendarDaysIcon,
  CheckCircleIcon, LockClosedIcon, ClockIcon,
} from '@heroicons/vue/24/outline';
import { fetchInvitation, fetchGallery, submitRsvp, icsUrl } from '@/services/selfservice.service';
import { formatDateTime } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import GalleryViewer from '@/components/gallery/GalleryViewer.vue';
import { Button } from '@/components/ui';

const { brand } = useBrand();
const route = useRoute();
const toast = useToast();
const token = computed(() => String(route.params.token));

const loading = ref(true);
const submitting = ref(false);
const data = ref(null);
const error = ref('');
const photos = ref([]);

// Native emoji + Swahili labels — familiar, warm, fast to tap.
const RSVP_OPTIONS = [
  { value: 'yes',   emoji: '✅', label: 'Nitakuja' },
  { value: 'maybe', emoji: '🤔', label: 'Sijui' },
  { value: 'no',    emoji: '😔', label: 'Sitakuja' },
];

// Deterministic per event — same event, same cover across every guest's view.
const HERO_GRADIENTS = [
  'linear-gradient(135deg, #D084FF 0%, #9B59B6 60%, #6C4CD9 100%)',
  'linear-gradient(135deg, #FFB86B 0%, #E5722F 60%, #C25428 100%)',
  'linear-gradient(135deg, #79E0B3 0%, #2FA675 60%, #1E7A54 100%)',
  'linear-gradient(135deg, #7CC5FF 0%, #3B7BD9 60%, #2A5CB0 100%)',
  'linear-gradient(135deg, #FFB0D4 0%, #D9457A 60%, #9B2F55 100%)',
  'linear-gradient(135deg, #B79CFF 0%, #6C4CD9 60%, #4A32B0 100%)',
];
const heroGradient = computed(() => {
  const key = String(data.value?.event?.name || '?');
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HERO_GRADIENTS[h % HERO_GRADIENTS.length];
});

const guestInitials = computed(() => {
  const g = data.value?.guest;
  return ((g?.firstName?.[0] || '') + (g?.lastName?.[0] || '')).toUpperCase() || '?';
});

const eventTypeLabel = computed(() => {
  const t = String(data.value?.event?.eventType || 'event').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
});

// Live countdown, ticks every minute — reads warm ("in 12 days" not "12d").
const now = ref(Date.now());
let tick = null;
onMounted(() => { tick = setInterval(() => (now.value = Date.now()), 60_000); });
onBeforeUnmount(() => clearInterval(tick));
const countdown = computed(() => {
  const t = new Date(data.value?.event?.date).getTime();
  if (isNaN(t)) return null;
  const diff = t - now.value;
  if (diff < -24 * 3600 * 1000) return { label: 'Ilishafanyika', value: `${Math.floor(-diff / (24 * 3600 * 1000))} days ago` };
  if (diff < 0) return { label: 'Happening now', value: 'Today' };
  const days = Math.floor(diff / (24 * 3600 * 1000));
  if (days >= 2) return { label: 'Starts in', value: `${days} days` };
  const hours = Math.floor(diff / 3600_000);
  if (hours >= 2) return { label: 'Starts in', value: `${hours} hours` };
  const mins = Math.max(0, Math.floor(diff / 60_000));
  return { label: 'Starts in', value: `${hours}h ${mins % 60}m` };
});

// Build the .ics link — iOS Safari needs webcal:// to force the Calendar
// app; everywhere else the plain https:// endpoint (returned inline)
// prompts Google Calendar or the OS handler.
const calendarHref = computed(() => {
  if (!route.params.token) return '#';
  const abs = `${location.host}${icsUrl(route.params.token)}`;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  return isIOS ? `webcal://${abs}` : `${location.protocol}//${abs}`;
});

// Per-event feature flags — default true so old events keep working when
// the backend hasn't sent a `features` block.
const feats = computed(() => data.value?.event?.features || {});
const showMaps = computed(() => feats.value.showMaps !== false);
const showCalendar = computed(() => feats.value.showCalendar !== false);
const showProgram = computed(() => feats.value.showProgram !== false);
const showDressCode = computed(() => feats.value.showDressCode !== false);
const showGallery = computed(() => feats.value.showGallery === true);

// PIN gate state — backend replies { protected: true } when the gallery
// has a PIN set and no correct one has been supplied yet.
const galleryLocked = ref(false);
const pinInput = ref('');
const pinTrying = ref(false);
const pinError = ref('');

// Shape adapter for the shared GalleryViewer (expects previewUrl/downloadUrl
// keys — the guest-side gallery only serves signed `url` + `thumbUrl`).
const viewerItems = computed(() => photos.value.map((p) => ({
  ...p,
  previewUrl: p.url,
  downloadUrl: p.url,
  kind: 'image',
})));
const viewerIndex = ref(null);
function openViewer(i) { viewerIndex.value = i; }

function statusLabel(s) {
  return ({ yes: 'Umekubali kuja', no: 'Umeandika hutakuja', maybe: 'Uko labda', pending: 'Bado hujajibu' }[s] || '');
}

async function load() {
  try {
    data.value = await fetchInvitation(token.value);
    if (data.value?.event?.features?.showGallery !== false) loadGallery();
  } catch (err) { error.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}

async function loadGallery(pin) {
  try {
    const r = await fetchGallery(token.value, pin);
    if (r.protected) { galleryLocked.value = true; photos.value = []; }
    else { galleryLocked.value = false; photos.value = r.photos || []; }
  } catch (_) { /* silent — non-critical */ }
}

async function tryPin() {
  if (pinInput.value.length < 4) return;
  pinTrying.value = true; pinError.value = '';
  await loadGallery(pinInput.value);
  if (galleryLocked.value) pinError.value = 'Wrong PIN — try again';
  pinTrying.value = false;
}

async function rsvp(status) {
  submitting.value = true;
  try {
    const res = await submitRsvp(token.value, { rsvpStatus: status });
    data.value.guest.rsvpStatus = res.rsvpStatus;
    toast.success('Asante!');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { submitting.value = false; }
}

onMounted(load);
</script>
