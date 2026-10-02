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

    <!-- Result bottom sheet. It owns the scanner lock: while this is open
         neither local jsQR nor server-assisted decoding is allowed to submit
         another scan. Dismissal is an explicit return to the camera. -->
    <div v-if="resultOpen" class="fixed inset-0 z-[100] bg-black/65 backdrop-blur-[2px]"
         @click.self="dismissResult">
      <section class="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[2rem] bg-surface-ivory dark:bg-surface-coal text-surface-charcoal dark:text-surface-bone shadow-2xl p-5 pb-safe select-none touch-none"
        :style="resultSheetStyle"
               role="dialog" aria-modal="true" aria-label="Scan result"
               @pointerdown="startSheetDrag" @pointermove="moveSheetDrag"
               @pointerup="endSheetDrag" @pointercancel="endSheetDrag">
        <div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-mist dark:bg-surface-fog" />
        <div v-if="scanPending" class="py-8 text-center space-y-3">
          <LoadingSpinner class="mx-auto !w-10 !h-10 !border-4" />
          <p class="text-lg font-black">Reading QR code…</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash">The camera is locked while we verify this guest.</p>
        </div>
        <div v-if="lastResult" class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" :class="resultTone.bg">
              <CheckIcon v-if="resultTone.kind === 'ok'" class="w-8 h-8 text-white" />
              <ExclamationTriangleIcon v-else-if="resultTone.kind === 'warn'" class="w-8 h-8 text-white" />
              <XMarkIcon v-else class="w-8 h-8 text-white" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xl font-black">{{ headline }}</p>
              <p v-if="lastResult.guest" class="text-md text-surface-slate dark:text-surface-ash truncate">
                {{ lastResult.guest.firstName }} {{ lastResult.guest.lastName }}
              </p>
            </div>
          </div>

          <div v-if="lastResult.guest" class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-xl bg-surface-mist/70 dark:bg-surface-fog/70 px-3 py-2">
              <p class="text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">Code</p>
              <p class="font-mono font-black mt-0.5">{{ lastResult.guest.shortCode || lastResult.guest.pubCode || lastResult.guest.memberId || '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface-mist/70 dark:bg-surface-fog/70 px-3 py-2">
              <p class="text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">Type</p>
              <p class="font-black mt-0.5">{{ seatLabel || lastResult.guest.type || 'single' }}</p>
            </div>
            <div class="col-span-2 rounded-xl bg-surface-mist/70 dark:bg-surface-fog/70 px-3 py-2 flex items-center justify-between">
              <span class="text-surface-slate dark:text-surface-ash">Already scanned</span>
              <strong>{{ lastResult.guest.admittedCount || 0 }}<span v-if="lastResult.guest.familySize"> / {{ lastResult.guest.familySize }}</span></strong>
            </div>
          </div>

          <div v-if="lastResult.guest?.tags?.length" class="flex flex-wrap gap-1.5">
            <span v-for="(t, i) in lastResult.guest.tags" :key="i" class="chip text-2xs">{{ t.name }}</span>
          </div>
          <p v-if="lastResult.warning" class="text-2xs font-bold text-amber-700 dark:text-amber-400">⚠ {{ lastResult.warning }}</p>

          <div class="flex gap-2 pt-1">
            <button class="btn-ghost flex-1" @click="undoLast" :disabled="undoing || undoDone">
              <ArrowUturnLeftIcon class="w-4 h-4" /> {{ undoDone ? 'Undone' : 'Undo' }}
            </button>
            <button class="btn-primary flex-1" @click="resumeScanning" autofocus>
              <CameraIcon class="w-4 h-4" /> Okay, scan next
            </button>
          </div>
        </div>
      </section>
    </div>

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
            <span class="chip text-2xs !py-0 !px-2 !bg-amber-500/15 !text-amber-600">
              {{ admittedEntries(g) }}/{{ allowedEntries(g) }} checked in
            </span>
          </button>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-ghost" @click="manualOpen = false">Cancel</button>
          <AppButton :loading="mSubmitting" :disabled="!mSelected || isFullyCheckedIn(mSelected)" @click="submitManual">
            {{ mSelected && isFullyCheckedIn(mSelected) ? 'Fully checked in' : `Check in (${admittedEntries(mSelected)}/${allowedEntries(mSelected)})` }}
          </AppButton>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { seatTypeLabel } from '@/utils/seatType';
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
const scanPending = ref(false);
const scanInFlight = ref(false);
const sheetDragY = ref(0);
const sheetDragging = ref(false);
let sheetPointerStartY = 0;
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
let barcodeDetector = null;
let nativeDetectInFlight = false;
let lastNativeDetectAt = 0;

// Tone the result badge + headline per scan outcome.
const resultTone = computed(() => {
  const r = lastResult.value?.result || '';
  if (r === 'ok_first' || r === 'ok_family_increment' || r === 'manual') return { kind: 'ok', bg: 'bg-emerald-500' };
  if (r === 'already_arrived') return { kind: 'warn', bg: 'bg-amber-500' };
  return { kind: 'err', bg: 'bg-red-500' };
});
const headline = computed(() => ({
  ok_first: 'Welcome!',
  ok_family_increment: 'Admitted (multi-scan)',
  manual: 'Admitted manually',
  already_arrived: 'Already arrived',
  wrong_event: 'Wrong event',
  invalid: 'Invalid code',
}[lastResult.value?.result] || 'Scanned'));
const seatLabel = computed(() => {
  const g = lastResult.value?.guest; if (!g) return '';
  return seatTypeLabel(g);
});
const resultSheetStyle = computed(() => ({
  transform: `translateY(${sheetDragY.value}px)`,
  transition: sheetDragging.value ? 'none' : 'transform 180ms ease-out',
}));

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
    barcodeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) { /* use jsQR fallback */ }
    }
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
      if (barcodeDetector) {
        const now = performance.now();
        if (!nativeDetectInFlight && now - lastNativeDetectAt >= 90) {
          nativeDetectInFlight = true;
          lastNativeDetectAt = now;
          barcodeDetector.detect(v).then((codes) => {
            if (scanning.value && codes?.[0]?.rawValue) onLocalDecode(codes[0].rawValue);
          }).catch(() => {}).finally(() => { nativeDetectInFlight = false; });
        }
        rafHandle = requestAnimationFrame(tick);
        return;
      }
      // jsQR is CPU-heavy on full HD frames; 720px is enough for a gate card
      // and keeps the fallback responsive on desktop webcams.
      const w = Math.min(720, v.videoWidth);
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
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
  if (!scanning.value || scanInFlight.value || now - scanCooldown < 1500) return;
  scanInFlight.value = true;
  scanCooldown = now;
  // Lock and show feedback immediately; the API verification fills the
  // guest details into the already-visible result sheet.
  scanPending.value = true;
  scanning.value = false;
  resultOpen.value = true;
  lastResult.value = null;
  try {
    const scan = await submitScan(text, route.params.eventId);
    scanPending.value = false;
    showResult(scan);
  } catch (err) {
    scanPending.value = false;
    resultOpen.value = false;
    scanning.value = true;
    toast.error(apiErrorMessage(err));
  }
  finally { scanInFlight.value = false; }
}

function showResult(scan) {
  if (resultOpen.value && !scanPending.value && lastResult.value) return;
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
  sheetDragY.value = 0;
  sheetDragging.value = false;
  scanCooldown = Date.now();              // 1.5s guard so the same QR still in view doesn't fire
}

function dismissResult() {
  if (scanPending.value) return;
  resumeScanning();
}
function startSheetDrag(event) {
  sheetDragging.value = true;
  sheetPointerStartY = event.clientY;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}
function moveSheetDrag(event) {
  if (!sheetDragging.value) return;
  sheetDragY.value = Math.max(0, event.clientY - sheetPointerStartY);
}
function endSheetDrag() {
  if (!sheetDragging.value) return;
  const shouldDismiss = sheetDragY.value > 90;
  sheetDragging.value = false;
  if (shouldDismiss) dismissResult();
  else sheetDragY.value = 0;
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
    if (assistInFlight || scanInFlight.value || !scanning.value || resultOpen.value) return;
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
  clearTimeout(mSearchT);
  mSearchController?.abort();
  stream?.getTracks?.().forEach((t) => t.stop());
  if (videoEl.value) videoEl.value.srcObject = null;
});

// Manual entry
const manualOpen = ref(false);
const mQ = ref(''); const mResults = ref([]); const mLoading = ref(false);
const mSelected = ref(null); const mSubmitting = ref(false);
let mSearchT = 0;
let mSearchController = null;
let mSearchSeq = 0;
function allowedEntries(guest) {
  const type = String(guest?.type || 'single').toLowerCase();
  if (type === 'family') return Math.max(1, Number(guest?.familySize) || 1);
  return type === 'double' ? 2 : 1;
}
function admittedEntries(guest) {
  return Math.max(0, Number(guest?.admittedCount) || 0);
}
function isFullyCheckedIn(guest) {
  return admittedEntries(guest) >= allowedEntries(guest);
}
watch(mQ, (v) => {
  clearTimeout(mSearchT);
  mSearchController?.abort();
  mSelected.value = null;
  const query = String(v || '').trim();
  if (query.length < 2) { mResults.value = []; return; }
  const seq = ++mSearchSeq;
  mSearchT = setTimeout(async () => {
    const controller = new AbortController();
    mSearchController = controller;
    mLoading.value = true;
    try {
      const results = await searchGuestsAtGate(route.params.eventId, query, { signal: controller.signal });
      if (seq === mSearchSeq && !controller.signal.aborted) mResults.value = results;
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED' && seq === mSearchSeq) toast.error(apiErrorMessage(err));
    } finally {
      if (seq === mSearchSeq) mLoading.value = false;
    }
  }, 300);
});
async function submitManual() {
  if (!mSelected.value || isFullyCheckedIn(mSelected.value)) return;
  mSubmitting.value = true;
  try {
    const res = await manualEntry(route.params.eventId, mSelected.value._id);
    const updated = { ...mSelected.value, ...(res.guest || {}) };
    mResults.value = mResults.value.map((g) => g._id === updated._id ? updated : g);
    mSelected.value = updated;
    recent.value = [{
      name: `${updated.firstName || ''} ${updated.lastName || ''}`.trim(),
      ok: true, warn: false, timeAgo: 'now', _id: res.scanId || Math.random(),
    }, ...recent.value.slice(0, 4)];
    toast.success(`${updated.firstName || ''} ${updated.lastName || ''}`.trim()
      + ` checked in (${admittedEntries(updated)}/${allowedEntries(updated)})`);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { mSubmitting.value = false; }
}
</script>
