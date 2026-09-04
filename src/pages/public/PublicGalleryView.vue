<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night">
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="min-h-screen flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <div class="w-14 h-14 rounded-full bg-state-danger-bg text-state-danger flex items-center justify-center mx-auto mb-4">
          <ExclamationTriangleIcon class="w-7 h-7" />
        </div>
        <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">{{ error }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Hero band with deterministic gradient — matches invitation
           cover so a guest arriving from the invite link sees continuity. -->
      <section class="relative overflow-hidden text-white"
               :style="{ background: heroGradient }">
        <div class="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true"
             style="background-image: radial-gradient(circle at 15% 25%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.22), transparent 55%);" />

        <div class="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <p class="text-2xs uppercase font-black tracking-[0.35em] text-white/80">Photo gallery</p>
          <h1 class="mt-3 text-3xl sm:text-5xl font-black tracking-tight">{{ ev.name || 'Event gallery' }}</h1>
          <p v-if="ev.venueName" class="mt-2 text-md text-white/80">{{ ev.venueName }}</p>
          <p v-if="photos.length" class="mt-4 text-sm text-white/70 tabular-nums">{{ photos.length }} photo{{ photos.length === 1 ? '' : 's' }}</p>
        </div>
      </section>

      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <!-- Guest-list recognition banner. Kept — it's the one place a
             signed-in guest sees their status. Migrated to Card language. -->
        <div v-if="!protectedGallery && !expired"
             class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-4 mb-6 max-w-md mx-auto shadow-elev-1">
          <template v-if="!auth.isAuthed">
            <p class="text-sm font-black text-surface-charcoal dark:text-surface-bone">On the guest list?</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash mt-0.5 mb-3">Sign in to confirm your invitation and RSVP status.</p>
            <router-link :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`">
              <Button variant="secondary" size="sm" block>Sign in</Button>
            </router-link>
          </template>
          <template v-else-if="joinStatus === 'checking'">
            <p class="text-xs text-surface-slate dark:text-surface-ash">Checking the guest list…</p>
          </template>
          <template v-else-if="joinStatus === 'already_joined' || joinStatus === 'already_you'">
            <p class="text-sm font-black text-state-success flex items-center gap-1.5">
              <CheckCircleIcon class="w-4 h-4" /> You're on the guest list
            </p>
            <p v-if="joinCreditedTzs" class="text-xs text-surface-slate dark:text-surface-ash mt-0.5">A starter credit was added to your Amoview wallet.</p>
          </template>
          <template v-else-if="joinStatus === 'not_on_list'">
            <p class="text-sm font-black text-surface-charcoal dark:text-surface-bone">Not on this guest list yet</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash mt-0.5">You can still browse the gallery — ask the host to add your number if you were meant to be invited.</p>
          </template>
          <template v-else-if="joinStatus === 'belongs_to_someone_else'">
            <p class="text-sm font-black text-surface-charcoal dark:text-surface-bone">This invite belongs to someone else</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash mt-0.5">You can still browse the gallery below.</p>
          </template>
        </div>

        <!-- PIN gate -->
        <div v-if="protectedGallery"
             class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-6 max-w-md mx-auto text-center shadow-elev-2">
          <div class="w-12 h-12 rounded-2xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center mx-auto mb-3">
            <LockClosedIcon class="w-5 h-5" />
          </div>
          <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">This gallery is protected</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-1 mb-4">Enter the PIN the host gave you.</p>
          <div class="flex justify-center gap-2">
            <input v-model="pin" type="password" placeholder="PIN"
                   class="field-input !w-40 !text-center !tracking-[0.5em] !font-black"
                   @keydown.enter="load" />
            <Button variant="primary" :disabled="loading" @click="load">Unlock</Button>
          </div>
        </div>

        <!-- Expired -->
        <div v-else-if="expired"
             class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-8 max-w-md mx-auto text-center shadow-elev-2">
          <div class="w-12 h-12 rounded-2xl bg-state-warning-bg text-state-warning flex items-center justify-center mx-auto mb-3">
            <ClockIcon class="w-5 h-5" />
          </div>
          <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">This gallery has expired</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-1">Ask the host to re-open it.</p>
        </div>

        <!-- Empty -->
        <div v-else-if="!photos.length"
             class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-10 max-w-md mx-auto text-center shadow-elev-1">
          <div class="w-12 h-12 rounded-2xl bg-surface-mist dark:bg-surface-fog text-surface-slate dark:text-surface-ash flex items-center justify-center mx-auto mb-3">
            <PhotoIcon class="w-5 h-5" />
          </div>
          <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">No photos posted yet</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-1">Check back after the event.</p>
        </div>

        <!-- Masonry grid — matches the dashboard gallery language. -->
        <div v-else class="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
          <GalleryTile v-for="(p, i) in viewerItems" :key="p._id"
                       :item="p"
                       @open="viewerIndex = i" />
        </div>
      </div>

      <GalleryViewer :items="viewerItems" v-model:index="viewerIndex" @close="viewerIndex = null" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  ExclamationTriangleIcon, LockClosedIcon, ClockIcon, PhotoIcon, CheckCircleIcon,
} from '@heroicons/vue/24/outline';
import http from '@/services/http';
import { useAuthStore } from '@/stores/auth';
import { joinByToken } from '@/services/guestPortal.service';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import GalleryTile from '@/components/gallery/GalleryTile.vue';
import GalleryViewer from '@/components/gallery/GalleryViewer.vue';
import { Button } from '@/components/ui';

const route = useRoute();
const auth = useAuthStore();
const loading = ref(true);
const error = ref('');
const ev = ref({});
const protectedGallery = ref(false);
const expired = ref(false);
const photos = ref([]);
const pin = ref('');
const joinStatus = ref(null);
const joinCreditedTzs = ref(0);
const viewerIndex = ref(null);

// Same gradient palette as the invitation hero — same event → same colors.
const HERO_GRADIENTS = [
  'linear-gradient(135deg, #D084FF 0%, #9B59B6 60%, #6C4CD9 100%)',
  'linear-gradient(135deg, #FFB86B 0%, #E5722F 60%, #C25428 100%)',
  'linear-gradient(135deg, #79E0B3 0%, #2FA675 60%, #1E7A54 100%)',
  'linear-gradient(135deg, #7CC5FF 0%, #3B7BD9 60%, #2A5CB0 100%)',
  'linear-gradient(135deg, #FFB0D4 0%, #D9457A 60%, #9B2F55 100%)',
  'linear-gradient(135deg, #B79CFF 0%, #6C4CD9 60%, #4A32B0 100%)',
];
const heroGradient = computed(() => {
  const key = String(ev.value?.name || '?');
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HERO_GRADIENTS[h % HERO_GRADIENTS.length];
});

// Public gallery photos come back with { url, thumbUrl, caption } — the
// shared GalleryViewer + GalleryTile expect the dashboard-side shape
// (previewUrl / downloadUrl / kind), so map once here rather than fork
// two viewer components.
const viewerItems = computed(() => photos.value.map((p) => ({
  ...p,
  previewUrl: p.url,
  downloadUrl: p.url,
  kind: 'image',
})));

async function load() {
  loading.value = true; error.value = '';
  try {
    const res = await http.get(`/public/gallery/${route.params.token}`, { params: pin.value ? { pin: pin.value } : {} });
    const d = res.data?.data || res.data;
    ev.value = d.event || {};
    protectedGallery.value = !!d.protected;
    expired.value = !!d.expired;
    photos.value = d.photos || [];
    if (auth.isAuthed && !protectedGallery.value && !expired.value) checkJoin();
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load the gallery';
  } finally { loading.value = false; }
}

async function checkJoin() {
  joinStatus.value = 'checking';
  try {
    const r = await joinByToken(route.params.token);
    joinStatus.value = r.status;
    joinCreditedTzs.value = r.creditedTzs || 0;
  } catch (_) {
    joinStatus.value = null; // e.g. token has no `e` — fail silent, gallery still works
  }
}

onMounted(load);
</script>
