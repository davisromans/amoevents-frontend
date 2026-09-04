<template>
  <div class="min-h-full bg-black text-white pb-safe">
    <!-- Slim top bar — event context + torch/manual + TV link -->
    <header class="sticky top-0 z-10 backdrop-blur bg-black/50 border-b border-white/10">
      <div class="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-soft">Gate {{ gateNumber }}</p>
          <h1 v-if="event" class="text-md font-black text-white truncate leading-tight">{{ event.name }}</h1>
        </div>
        <router-link :to="`/scanner/${route.params.eventId}/tv`"
                     class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                     title="Open TV dashboard">
          <TvIcon class="w-4 h-4" />
        </router-link>
        <button v-if="torchAvailable" type="button" @click="toggleTorch"
                :class="['w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                         torchOn ? 'bg-brand-primary text-white' : 'bg-white/10 hover:bg-white/20 text-white']">
          <BoltIcon class="w-4 h-4" />
        </button>
        <button type="button" @click="manualOpen = true"
                class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Manual entry">
          <MagnifyingGlassIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <div class="max-w-md mx-auto px-4 pt-5 pb-8 space-y-4">
      <!-- Camera viewport — square, rounded, purple reticle. Full-black
           surround so the camera itself carries all the visual weight. -->
      <div :class="['relative aspect-square rounded-3xl overflow-hidden bg-black shadow-elev-3 ring-1 ring-white/10 transition-opacity duration-fast',
                    !scanning ? 'opacity-70' : '']">
        <video ref="videoEl" class="w-full h-full object-cover" playsinline muted autoplay />
        <canvas ref="canvasEl" class="hidden" />

        <!-- Reticle — bracketed corners + sweep line (only while scanning) -->
        <div v-if="scanning" class="absolute inset-0 pointer-events-none">
          <div class="absolute inset-10 rounded-2xl">
            <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-primary rounded-tl-2xl" />
            <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-primary rounded-tr-2xl" />
            <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-primary rounded-bl-2xl" />
            <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-primary rounded-br-2xl" />
          </div>
          <div class="absolute inset-x-10 top-1/2 h-0.5 bg-brand-primary shadow-[0_0_10px_rgba(192,111,239,0.9)] animate-pulse" />
          <span v-if="serverAssistActive"
                class="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-brand-primary/90 px-2 py-0.5 text-2xs font-black text-white uppercase tracking-widest">
            Cloud assist
          </span>
        </div>

        <div v-else class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p class="text-white/80 text-sm font-black uppercase tracking-widest">Paused</p>
        </div>

        <div v-if="cameraError" class="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
          <div>
            <ExclamationTriangleIcon class="w-8 h-8 text-state-warning mx-auto mb-2" />
            <p class="text-md font-bold text-white">{{ cameraError }}</p>
            <Button variant="primary" class="mt-4" @click="startCamera">Retry</Button>
          </div>
        </div>
      </div>

      <p class="text-center text-sm text-white/70">
        <span v-if="scanning">Point the camera at the guest's QR</span>
        <span v-else>Reviewing last scan — press <strong>Scan next guest</strong> when ready.</span>
      </p>

      <!-- Compact history strip (last 5 scans) -->
      <div v-if="recent.length" class="space-y-1.5">
        <p class="text-2xs uppercase font-black tracking-widest text-white/50">Recent</p>
        <div class="space-y-1.5">
          <div v-for="(r, i) in recent" :key="i"
               class="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2 text-sm">
            <span :class="['w-2 h-2 rounded-full shrink-0',
                           r.ok ? 'bg-state-success' : r.warn ? 'bg-state-warning' : 'bg-state-danger']" />
            <span class="font-bold text-white truncate flex-1">{{ r.name }}</span>
            <span class="text-2xs text-white/50">{{ r.timeAgo }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scan-result modal: shows automatically on every scan, pauses camera -->
    <AppModal v-model="resultOpen" :closable="false" title="" :maxWidth="440">
      <div v-if="lastResult" class="text-center space-y-4">
        <!-- Big status badge -->
        <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
             :class="resultTone.bg">
          <CheckIcon v-if="resultTone.kind === 'ok'" class="w-9 h-9 text-white" />
          <ExclamationTriangleIcon v-else-if="resultTone.kind === 'warn'" class="w-9 h-9 text-white" />
          <XMarkIcon v-else class="w-9 h-9 text-white" />
        </div>
        <div>
          <p class="text-2xl font-black text-surface-charcoal dark:text-surface-bone">{{ headline }}</p>
          <p v-if="lastResult.guest" class="text-md text-surface-slate dark:text-surface-ash mt-1">
            {{ lastResult.guest.firstName }} {{ lastResult.guest.lastName }}
          </p>
        </div>

        <!-- Details row -->
        <div v-if="lastResult.guest" class="flex flex-wrap items-center justify-center gap-2">
          <span v-if="lastResult.guest.isVip" class="chip-gold !text-2xs">★ VIP</span>
          <span class="chip text-2xs">{{ seatLabel }}</span>
          <span v-if="lastResult.guest.type === 'family'" class="chip text-2xs">
            {{ lastResult.guest.admittedCount }}/{{ lastResult.guest.familySize }} admitted
          </span>
          <span v-if="lastResult.guest.memberId" class="text-2xs font-mono text-brand-gold-deep dark:text-brand-gold-soft">
            {{ lastResult.guest.memberId }}
          </span>
        </div>

        <div v-if="lastResult.guest?.tags?.length" class="flex flex-wrap justify-center gap-1.5">
          <span v-for="(t, i) in lastResult.guest.tags" :key="i"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-widest"
                :style="t.color ? { background: t.color + '22', color: t.color } : {}"
                :class="t.color ? '' : 'bg-surface-mist dark:bg-surface-fog text-surface-charcoal dark:text-surface-bone'">
            <span v-if="t.color" class="inline-block w-2 h-2 rounded-full" :style="{ background: t.color }" />
            {{ t.name }}
          </span>
        </div>

        <p v-if="lastResult.warning" class="text-2xs font-bold text-amber-700 dark:text-amber-400">
          ⚠ {{ lastResult.warning }}
        </p>

        <div class="flex gap-2 pt-2">
          <button class="btn-ghost flex-1" @click="undoLast" :disabled="undoing || undoDone">
            <ArrowUturnLeftIcon class="w-4 h-4" /> {{ undoDone ? 'Undone' : 'Undo' }}
          </button>
          <button class="btn-primary flex-1" @click="resumeScanning" autofocus>
            <CameraIcon class="w-4 h-4" /> Scan next guest
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Manual entry -->
    <AppModal v-model="manualOpen" title="Manual gate entry" :maxWidth="480">
      <div class="space-y-3">
        <AppInput v-model="mQ" label="Member ID or phone" placeholder="e.g. JN4-7R8 or +2557…" />
        <div v-if="mLoading" class="flex justify-center py-4"><LoadingSpinner /></div>
        <div v-else-if="mResults.length" class="space-y-1 max-h-52 overflow-y-auto">
          <button v-for="g in mResults" :key="g._id"
                  class="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 text-left"
                  :class="mSelected?._id === g._id ? 'bg-brand-gold-glow' : ''"
                  @click="mSelected = g">
            <div class="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-white text-2xs font-black tracking-widest px-1">
              {{ g.memberId?.slice(-3) || '?' }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-md font-black tabular-nums text-surface-charcoal dark:text-surface-bone truncate">{{ g.memberId }}</p>
              <p class="text-xs text-surface-slate dark:text-surface-ash truncate">
                {{ g.phone }}<span v-if="g.firstName || g.lastName"> · {{ g.firstName }} {{ g.lastName }}</span>
              </p>
            </div>
            <span v-if="g.arrivalStatus === 'arrived'" class="chip text-2xs !py-0 !px-2 !bg-amber-500/15 !text-amber-600">Arrived</span>
          </button>
        </div>
        <AppInput v-if="mSelected" v-model="mReason" label="Reason (required)" placeholder="e.g. Lost phone / VIP" />
        <div class="flex justify-end gap-2">
          <button class="btn-ghost" @click="manualOpen = false">Cancel</button>
          <AppButton :loading="mSubmitting" :disabled="!mSelected || mReason.length < 3" @click="submitManual">Admit</AppButton>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import jsQR from 'jsqr';
import {
  MagnifyingGlassIcon, ExclamationTriangleIcon, BoltIcon,
  CheckIcon, XMarkIcon, ArrowUturnLeftIcon, CameraIcon, TvIcon,
} from '@heroicons/vue/24/outline';
import { Button } from '@/components/ui';
import { getEvent } from '@/services/events.service';
import { submitScan, submitScanImage, manualEntry, searchGuestsAtGate, undoScan } from '@/services/scan.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const route = useRoute();
const toast = useToast();

// Multi-gate coordination — a URL like /scanner/:id?gate=2 lets each phone
// identify itself when several people are scanning the same event at
// different doors. Falls back to "1" so single-gate setups aren't cluttered
// by ?gate=1 in the URL.
const gateNumber = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('gate')) || '1';

const event = ref(null);
const videoEl = ref(null);
const canvasEl = ref(null);
const cameraError = ref('');
const torchAvailable = ref(false);
const torchOn = ref(false);
const scanning = ref(true);              // pauses when result modal is open
const serverAssistActive = ref(false);
const lastResult = ref(null);
const resultOpen = ref(false);
const undoing = ref(false);
const undoDone = ref(false);
const recent = ref([]);                  // last 5 scans, most recent first
let stream = null;
let scanCooldown = 0;
let cameraStartedAt = 0;
let lastLocalDecodeAt = 0;
let rafHandle = 0;
let assistTimer = null;
let assistInFlight = false;

// Tone the result badge + headline per scan outcome.
const resultTone = computed(() => {
  const r = lastResult.value?.result || '';
  if (r === 'ok_first' || r === 'ok_family_increment' || r === 'manual') return { kind: 'ok', bg: 'bg-emerald-500' };
  if (r === 'already_arrived') return { kind: 'warn', bg: 'bg-amber-500' };
  return { kind: 'err', bg: 'bg-red-500' };
});
const headline = computed(() => ({
  ok_first: 'Welcome!',
  ok_family_increment: 'Family admitted',
  manual: 'Admitted manually',
  already_arrived: 'Already arrived',
  wrong_event: 'Wrong event',
  invalid: 'Invalid code',
}[lastResult.value?.result] || 'Scanned'));
const seatLabel = computed(() => {
  const g = lastResult.value?.guest; if (!g) return '';
  return g.type === 'family' ? `Family (${g.familySize})`
       : g.type === 'double' ? 'Double'
       : 'Single';
});

async function loadEvent() {
  try { const { event: e } = await getEvent(route.params.eventId); event.value = e; }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

async function startCamera() {
  cameraError.value = '';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported on this browser');
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    videoEl.value.srcObject = stream;
    videoEl.value.setAttribute('playsinline', 'true');
    await videoEl.value.play().catch(() => {});
    cameraStartedAt = Date.now();
    detectTorch();
    scanLoop();
    startServerAssistWatch();
  } catch (err) { cameraError.value = err?.message || 'Camera unavailable'; }
}

// Decode loop. Skips when scanning is paused (result modal open).
function scanLoop() {
  cancelAnimationFrame(rafHandle);
  const tick = () => {
    if (!scanning.value) { rafHandle = requestAnimationFrame(tick); return; }
    const v = videoEl.value; const c = canvasEl.value;
    if (!v || !c) return;
    if (v.readyState >= 2 && v.videoWidth > 0) {
      const w = v.videoWidth, h = v.videoHeight;
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, w, h);
      try {
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (code?.data) { lastLocalDecodeAt = Date.now(); onLocalDecode(code.data); }
      } catch (_) { /* getImageData can throw */ }
    }
    rafHandle = requestAnimationFrame(tick);
  };
  rafHandle = requestAnimationFrame(tick);
}

async function onLocalDecode(text) {
  const now = Date.now();
  if (now - scanCooldown < 1500) return;
  scanCooldown = now;
  try {
    const scan = await submitScan(text, route.params.eventId);
    showResult(scan);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

function showResult(scan) {
  lastResult.value = scan;
  scanning.value = false;                // PAUSE — user must press Scan next
  resultOpen.value = true;
  undoDone.value = false;
  // Chirp per outcome so the gate operator gets audio feedback too.
  try {
    const t = resultTone.value.kind;
    // A single tiny beep via WebAudio — no extra asset needed.
    if (typeof AudioContext !== 'undefined') {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = t === 'ok' ? 880 : t === 'warn' ? 440 : 220;
      g.gain.value = 0.08;
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + (t === 'ok' ? 0.12 : 0.22));
      setTimeout(() => ctx.close?.(), 400);
    }
  } catch (_) {}
  // Push to recent strip
  const g = scan.guest;
  recent.value = [
    { name: g ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : '(unknown)',
      ok: resultTone.value.kind === 'ok',
      warn: resultTone.value.kind === 'warn',
      timeAgo: 'now',
      _id: scan.scanId || Math.random(),
    },
    ...recent.value.slice(0, 4),
  ];
}

function resumeScanning() {
  resultOpen.value = false;
  scanning.value = true;
  scanCooldown = Date.now();              // 1.5s guard so the same QR still in view doesn't fire
}

async function undoLast() {
  if (!lastResult.value?.scanId || undoing.value) return;
  undoing.value = true;
  try {
    await undoScan(route.params.eventId, lastResult.value.scanId);
    undoDone.value = true;
    toast.success('Scan undone');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { undoing.value = false; }
}

// Server assist — send frames to backend at 3fps ONLY while scanning is on
// AND local jsQR hasn't cleared this QR in the last 2.5s.
function startServerAssistWatch() {
  clearInterval(assistTimer);
  assistTimer = setInterval(async () => {
    if (assistInFlight || !scanning.value) return;
    const idleMs = Date.now() - Math.max(cameraStartedAt, lastLocalDecodeAt, scanCooldown);
    if (idleMs < 2500) return;
    serverAssistActive.value = true;
    const blob = await grabFrame(); if (!blob) return;
    assistInFlight = true;
    try {
      const res = await submitScanImage(blob, route.params.eventId);
      if (res) { scanCooldown = Date.now(); showResult(res); }
    } catch (_) { /* silent */ }
    finally { assistInFlight = false; }
  }, 333);
}

async function grabFrame() {
  const v = videoEl.value, c = canvasEl.value;
  if (!v || !c || !v.videoWidth) return null;
  const w = Math.min(720, v.videoWidth);
  const h = Math.round((v.videoHeight / v.videoWidth) * w);
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(v, 0, 0, w, h);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.7));
}

async function detectTorch() {
  if (!stream) return;
  const track = stream.getVideoTracks?.()[0];
  torchAvailable.value = !!track?.getCapabilities?.().torch;
}
async function toggleTorch() {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return;
  torchOn.value = !torchOn.value;
  try { await track.applyConstraints({ advanced: [{ torch: torchOn.value }] }); } catch (_) {}
}

onMounted(async () => { await loadEvent(); await startCamera(); });
onBeforeUnmount(() => {
  cancelAnimationFrame(rafHandle);
  clearInterval(assistTimer);
  stream?.getTracks?.().forEach((t) => t.stop());
  if (videoEl.value) videoEl.value.srcObject = null;
});

// Manual entry
const manualOpen = ref(false);
const mQ = ref(''); const mResults = ref([]); const mLoading = ref(false);
const mSelected = ref(null); const mReason = ref(''); const mSubmitting = ref(false);
let mSearchT = 0;
watch(mQ, (v) => {
  clearTimeout(mSearchT);
  if (!v || v.length < 2) { mResults.value = []; return; }
  mSearchT = setTimeout(async () => {
    mLoading.value = true;
    try { mResults.value = await searchGuestsAtGate(route.params.eventId, v); }
    catch (err) { toast.error(apiErrorMessage(err)); }
    finally { mLoading.value = false; }
  }, 250);
});
async function submitManual() {
  if (!mSelected.value || mReason.value.length < 3) return;
  mSubmitting.value = true;
  try {
    const res = await manualEntry(route.params.eventId, mSelected.value._id, mReason.value);
    manualOpen.value = false;
    showResult({ result: 'manual', guest: res.guest });
    mSelected.value = null; mReason.value = ''; mQ.value = ''; mResults.value = [];
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { mSubmitting.value = false; }
}
</script>
