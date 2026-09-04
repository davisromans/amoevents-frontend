<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <PageHeader title="Guest cards" :back="`/app/events/${route.params.id}`">
      <template #actions>
        <router-link :to="`/app/events/${route.params.id}/cards/templates`" class="btn-secondary !text-sm">
          <PhotoIcon class="w-4 h-4" /> Browse templates
        </router-link>
        <router-link v-if="samplerVariant?.sourceType === 'document'"
                     :to="`/studio/variants/${route.params.id}/${samplerVariant._id}`"
                     target="_blank"
                     class="btn-secondary !text-sm">
          <PencilSquareIcon class="w-4 h-4" /> Edit design
        </router-link>
        <button v-if="samplerVariant && samplerVariant.sourceType !== 'document'" class="btn-secondary !text-sm" @click="openSamplerEditor">
          <QrCodeIcon class="w-4 h-4" /> Position QR
        </button>
        <label v-if="guests.length" class="flex items-center gap-1.5 text-subtext cursor-pointer select-none mr-1"
               title="Hide guests without their own uploaded card (the shared sampler still applies to them at send time)">
          <input type="checkbox" v-model="onlyOwnArtwork" class="accent-brand-gold w-4 h-4" />
          Only own artwork
        </label>
        <button v-if="visibleGuests.length" class="btn-ghost !text-sm" @click="toggleAll">
          {{ allSelected ? 'Clear' : 'Select all' }}
        </button>
        <button v-if="selected.size" class="btn-secondary !text-sm" :disabled="pdfBusy || pngBusy" @click="downloadSelectedPdf">
          <span v-if="pdfBusy" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
          <DocumentArrowDownIcon v-else class="w-4 h-4" /> PDF ({{ selected.size }})
        </button>
        <button v-if="selected.size" class="btn-ghost !text-sm" :disabled="pdfBusy || pngBusy" @click="downloadSelectedPngs">
          <span v-if="pngBusy" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
          <PhotoIcon v-else class="w-4 h-4" /> PNGs ({{ selected.size }})
        </button>
        <button v-if="guests.length" class="btn-primary !text-sm" :disabled="pdfBusy" @click="downloadAllPdf">
          <DocumentArrowDownIcon class="w-4 h-4" /> All as PDF
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <EmptyState v-else-if="!guests.length"
                title="No guests yet"
                description="Add guests first — every guest gets a personalised card with their QR.">
      <template #icon><PhotoIcon class="w-5 h-5" /></template>
      <template #actions>
        <router-link :to="`/app/events/${route.params.id}/guests`" class="btn-primary">Go to Guests</router-link>
      </template>
    </EmptyState>

    <div v-else>
      <p v-if="!anyHasCard" class="surface-card p-4 border-l-4 border-l-amber-500 mb-5 text-md text-surface-charcoal dark:text-surface-bone">
        No card artwork uploaded yet. Head to
        <router-link :to="`/app/events/${route.params.id}/cards`" class="text-brand-gold-deep dark:text-brand-gold-soft font-bold hover:underline">Cards</router-link>
        and upload your event artwork. Files matched to guests will show below with QR overlaid.
      </p>

      <p v-if="onlyOwnArtwork && hiddenCount" class="text-subtext mb-3">
        {{ hiddenCount }} guest{{ hiddenCount === 1 ? '' : 's' }} using the shared sampler hidden. Uncheck the filter to see them.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="g in visibleGuests" :key="g._id"
             class="surface-card p-3 flex flex-col animate-slide-up">
          <label class="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-surface-mist dark:bg-surface-fog mb-3 cursor-pointer group">
            <input type="checkbox" :checked="selected.has(g._id)" @change="toggleOne(g._id)"
                   class="absolute top-2 left-2 z-10 accent-brand-gold w-4 h-4" />
            <span v-if="coverage[g._id] === 'variant'"
                  class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-lg text-2xs uppercase font-black tracking-widest bg-black/60 text-white backdrop-blur-sm"
                  title="Using the shared sampler because this guest has no own uploaded card">
              Sampler
            </span>
            <img v-if="thumbs[g._id]" :src="thumbs[g._id]" class="w-full h-full object-contain" />
            <div v-else-if="thumbErrors[g._id]" class="w-full h-full flex flex-col items-center justify-center text-center p-3">
              <ExclamationTriangleIcon class="w-6 h-6 text-amber-500 mb-1" />
              <p class="text-subtext">No artwork</p>
            </div>
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="inline-block h-5 w-5 rounded-full border-2 border-brand-gold border-r-transparent animate-spin" />
            </div>
          </label>
          <p class="text-heading truncate">{{ g.firstName }} {{ g.lastName }}</p>
          <p class="text-subtext tabular-nums mb-2">{{ g.memberId }}</p>
          <div class="flex gap-1 mt-auto">
            <button v-if="coverage[g._id] === 'own'"
                    class="btn-ghost !text-xs flex-1" title="Move / resize the QR on this guest's card"
                    @click="openQrEditor(g)">
              <QrCodeIcon class="w-3.5 h-3.5" /> QR
            </button>
            <button class="btn-ghost !text-xs flex-1" :disabled="!thumbs[g._id] || downloading[g._id + ':png']" @click="downloadPng(g)">
              <span v-if="downloading[g._id + ':png']" class="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
              <ArrowDownTrayIcon v-else class="w-3.5 h-3.5" />
              {{ downloading[g._id + ':png'] ? '…' : 'PNG' }}
            </button>
            <button class="btn-ghost !text-xs flex-1" :disabled="!thumbs[g._id] || downloading[g._id + ':pdf']" @click="downloadPdf(g)">
              <span v-if="downloading[g._id + ':pdf']" class="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
              <DocumentArrowDownIcon v-else class="w-3.5 h-3.5" />
              {{ downloading[g._id + ':pdf'] ? '…' : 'PDF' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- QR positioning modal. Two modes:
           - variant: sets ONE position applied to every guest rendering on the sampler
           - guest: overrides just this guest's card
         Overlay shows the REAL guest QR (not a placeholder), so what you see
         is what gets baked into the card at send time. -->
    <AppModal v-model="qrEditor.open"
              :title="qrEditor.mode === 'variant'
                ? 'Position QR on the sampler design'
                : `Adjust QR — ${qrEditor.guest?.firstName || ''} ${qrEditor.guest?.lastName || ''}`"
              :maxWidth="760">
      <div v-if="qrEditor.artUrl && qrEditor.qrUrl" class="space-y-4">
        <p class="text-subtext">
          Click anywhere on the artwork to place the QR, or use the sliders below for precise control.
          <span v-if="qrEditor.mode === 'variant'" class="block mt-0.5 text-brand-gold-deep dark:text-brand-gold-soft font-bold">
            This is your sampler — the position saved here applies to every guest without their own uploaded card.
          </span>
        </p>

        <!-- Canvas: base card + real QR overlaid -->
        <div class="relative mx-auto max-w-md w-full rounded-xl overflow-hidden bg-white cursor-crosshair select-none"
             :style="{ aspectRatio: canvasAspect }"
             @click="onCanvasClick"
             @pointerdown="onPointerDown">
          <img :src="qrEditor.artUrl"
               class="w-full h-full object-contain pointer-events-none"
               draggable="false"
               alt=""
               @load="onArtLoad" />
          <img :src="qrEditor.qrUrl"
               class="absolute pointer-events-none shadow-md ring-2 ring-brand-gold rounded-sm"
               draggable="false"
               :style="qrOverlayStyle(qrEditor.layout)"
               alt="" />
        </div>

        <!-- Three sliders: X, Y, Size -->
        <div class="grid grid-cols-1 gap-2.5">
          <div v-for="s in SLIDERS" :key="s.key" class="flex items-center gap-3">
            <label class="text-xs font-black uppercase tracking-widest text-surface-slate dark:text-surface-ash w-14">{{ s.label }}</label>
            <input type="range" :min="s.min" :max="s.max" :step="s.step"
                   :value="qrEditor.layout[s.key]"
                   @input="setLayoutField(s.key, Number($event.target.value))"
                   class="flex-1 accent-brand-gold" />
            <input type="number" :min="s.min" :max="s.max" :step="s.step"
                   :value="qrEditor.layout[s.key]"
                   @input="setLayoutField(s.key, Number($event.target.value))"
                   class="field-input !py-1 !text-sm !w-24 text-right tabular-nums" />
            <span class="text-2xs text-surface-slate dark:text-surface-ash w-10 text-right tabular-nums">{{ pct(qrEditor.layout[s.key]) }}</span>
          </div>
        </div>

        <!-- Escape hatch for guests whose uploaded artwork already has a QR
             baked in (e.g. re-uploaded from a previous export). Only offered
             in per-guest mode; the sampler flag would need per-guest state. -->
        <label v-if="qrEditor.mode === 'guest'"
               class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 cursor-pointer">
          <input type="checkbox" v-model="qrEditor.skipOverlay" class="accent-brand-gold w-4 h-4 mt-0.5" />
          <div>
            <p class="text-heading">Artwork already has a QR — don't stamp another</p>
            <p class="text-subtext">Serve this guest's uploaded card as-is. Downloads / thumbnails won't add a QR on top.</p>
          </div>
        </label>

        <div class="flex justify-end gap-2 pt-1 border-t border-surface-mist dark:border-surface-fog">
          <button class="btn-ghost" :disabled="qrEditor.saving" @click="resetQr">Reset to default</button>
          <button class="btn-ghost" @click="qrEditor.open = false">Cancel</button>
          <button class="btn-primary" :disabled="qrEditor.saving" @click="saveQrLayout">
            {{ qrEditor.saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
      <div v-else class="flex justify-center py-10"><LoadingSpinner /></div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  PhotoIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, ExclamationTriangleIcon, QrCodeIcon, PencilSquareIcon,
} from '@heroicons/vue/24/outline';
import AppModal from '@/components/common/AppModal.vue';
import { getCardUrl } from '@/services/cards.service';
import { updateGuest, getGuestQrUrl } from '@/services/guests.service';
import { listVariants, updateVariant, variantImageUrlById } from '@/services/cardVariants.service';
import { listGuests } from '@/services/guests.service';
import { fetchPreviewUrl, cardCoverage, downloadGuestCardPng, downloadPdf as downloadPdfApi } from '@/services/cardVariants.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageHeader from '@/components/layout/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';

const route = useRoute();
const toast = useToast();

const guests = ref([]);
const loading = ref(true);
const thumbs = reactive({});      // guestId → object URL
const thumbErrors = reactive({}); // guestId → true if no artwork
const coverage = reactive({});    // guestId → true if own artwork/variant
const selected = ref(new Set());
const pdfBusy = ref(false);
const pngBusy = ref(false);

// Multi-select PNG download — iterate serially so we don't melt the nanode's
// 1 vCPU with parallel sharp composites. Browser handles each save via the
// same href-click trick as the per-guest button.
async function downloadSelectedPngs() {
  if (!selected.value.size) return;
  pngBusy.value = true;
  try {
    const ids = [...selected.value];
    for (const gid of ids) {
      const g = guests.value.find((x) => x._id === gid);
      if (!g) continue;
      await downloadGuestCardPng(route.params.id, gid, `${g.memberId || gid}.png`).catch(() => {});
    }
    toast.success(`Downloaded ${ids.length} PNG${ids.length === 1 ? '' : 's'}`);
  } finally { pngBusy.value = false; }
}
// Per-button spinner state, keyed by `<guestId>:png|pdf` so multiple guests
// can download in parallel and each button reflects its own progress.
const downloading = reactive({});
const onlyOwnArtwork = ref(false); // default off — "shared sampler" guests visible

// coverage[id] is 'own' | 'variant' | false. Truthy = has some renderable
// card; 'own' = the guest supplied their own uploaded artwork.
function hasOwnArtwork(g) { return coverage[g._id] === 'own'; }
function hasAnyArtwork(g) {
  if (g._id in coverage) return !!coverage[g._id];
  return !!thumbs[g._id];
}

const visibleGuests = computed(() =>
  onlyOwnArtwork.value ? guests.value.filter(hasOwnArtwork) : guests.value,
);
const hiddenCount = computed(() => guests.value.length - visibleGuests.value.length);

const anyHasCard = computed(() => guests.value.some((g) => thumbs[g._id]));
const allSelected = computed(() =>
  visibleGuests.value.length > 0 && selected.value.size === visibleGuests.value.length,
);

function toggleOne(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selected.value = s;
}
function toggleAll() {
  if (allSelected.value) selected.value = new Set();
  else selected.value = new Set(visibleGuests.value.map((g) => g._id));
}

async function loadThumb(g, bust) {
  try {
    // `bust` is passed after any layout change so intermediate caches (SW,
    // browser HTTP cache, proxies) all miss and refetch fresh composites.
    thumbs[g._id] = await fetchPreviewUrl(route.params.id, g._id, { bust });
  } catch (_) {
    thumbErrors[g._id] = true;
  }
}

async function refresh() {
  loading.value = true;
  try {
    const [{ items }, cov, vs] = await Promise.all([
      listGuests(route.params.id, { limit: 200 }),
      cardCoverage(route.params.id).catch(() => ({})),
      listVariants(route.params.id).catch(() => []),
    ]);
    guests.value = items;
    Object.assign(coverage, cov);
    // The sampler is the default variant if set, otherwise the first active
    // one — same rule the backend resolveBaseCard() uses.
    variants.value = vs;
    samplerVariant.value = vs.find((v) => v.isActive && v.isDefault)
      || vs.find((v) => v.isActive)
      || null;
    // Only fetch thumbnails for guests who actually have artwork — saves the
    // wasted round-trips (and 404s) for guests we're going to hide anyway.
    items
      .filter((g) => coverage[g._id] !== false)
      .forEach((g, i) => setTimeout(() => loadThumb(g), i * 30));
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function downloadPng(g) {
  const key = `${g._id}:png`;
  if (downloading[key]) return;
  downloading[key] = true;
  const dismiss = toast.info?.(`Preparing PNG for ${g.firstName || g.memberId}…`);
  try {
    await downloadGuestCardPng(route.params.id, g._id, `${g.memberId}.png`);
    toast.success?.('PNG downloaded');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { delete downloading[key]; if (typeof dismiss === 'function') dismiss(); }
}
async function downloadPdf(g) {
  const key = `${g._id}:pdf`;
  if (downloading[key]) return;
  downloading[key] = true;
  const dismiss = toast.info?.(`Preparing PDF for ${g.firstName || g.memberId}…`);
  try {
    await downloadPdfApi(route.params.id, [g._id]);
    toast.success?.('PDF downloaded');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { delete downloading[key]; if (typeof dismiss === 'function') dismiss(); }
}
async function downloadSelectedPdf() {
  pdfBusy.value = true;
  try { await downloadPdfApi(route.params.id, Array.from(selected.value)); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { pdfBusy.value = false; }
}
async function downloadAllPdf() {
  pdfBusy.value = true;
  try { await downloadPdfApi(route.params.id, []); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { pdfBusy.value = false; }
}

// Sampler variant (shared design) — the default or first active. Powers the
// header 'Position QR' button so a single edit moves the QR on every guest
// who renders on this design.
const variants = ref([]);
const samplerVariant = ref(null);

const qrEditor = reactive({
  open: false,
  mode: 'guest',            // 'guest' | 'variant'
  guest: null,
  variant: null,
  artUrl: null,             // base card / variant image URL
  qrUrl: null,              // real guest QR PNG URL (overlay)
  cardAspect: 3 / 4,        // measured from the loaded base image
  layout: { x: 0.5, y: 0.75, size: 0.2 },
  skipOverlay: false,        // guest.skipQrOverlay (per-guest mode only)
  saving: false,
});
const DEFAULT_LAYOUT = { x: 0.5, y: 0.75, size: 0.2 };
// Slider config for X/Y/size. clamps mirror the backend's expected ranges so
// nothing typed into the number box can push the QR off-card.
const SLIDERS = [
  { key: 'x', label: 'X', min: 0, max: 1, step: 0.01 },
  { key: 'y', label: 'Y', min: 0, max: 1, step: 0.01 },
  { key: 'size', label: 'Size', min: 0.05, max: 0.6, step: 0.01 },
];
function pct(n) { return `${Math.round((n ?? 0) * 100)}%`; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function setLayoutField(k, v) {
  const s = SLIDERS.find((x) => x.key === k);
  qrEditor.layout = { ...qrEditor.layout, [k]: clamp(v, s.min, s.max) };
}
const canvasAspect = computed(() => `${Math.round(qrEditor.cardAspect * 1000) / 1000}`);
function onArtLoad(e) {
  const w = e.target.naturalWidth || 0;
  const h = e.target.naturalHeight || 0;
  if (w > 0 && h > 0) qrEditor.cardAspect = w / h;
}
// QR is stamped SQUARE at the composite stage, sized as `size * cardWidth`.
// Convert that into the overlay's on-canvas rectangle. left/top position the
// TOP-LEFT corner; we adjust so (x,y) refers to the QR CENTER.
function qrOverlayStyle(l) {
  const s = clamp(l?.size ?? 0.2, 0.01, 1);
  const x = clamp(l?.x ?? 0.5, 0, 1);
  const y = clamp(l?.y ?? 0.75, 0, 1);
  // width is a % of canvas width; height compensates for the canvas aspect so
  // the overlay stays visually square.
  const aspect = qrEditor.cardAspect || (3 / 4);
  const heightPct = s * aspect; // % of canvas height
  return {
    width: `${s * 100}%`,
    height: `${heightPct * 100}%`,
    left: `${(x - s / 2) * 100}%`,
    top: `${(y - heightPct / 2) * 100}%`,
  };
}
// Drag-to-move: pointerdown + pointermove until pointerup.
function onPointerDown(e) {
  // The click handler already sets x/y for one-off placement; here we set up
  // drag so users can also fine-tune by dragging the QR.
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const move = (ev) => {
    const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
    qrEditor.layout = { ...qrEditor.layout, x, y };
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function hasCustomLayout(g) {
  const l = g?.qrLayout;
  return !!(l && [l.x, l.y, l.size].every((v) => typeof v === 'number'));
}
async function openQrEditor(g) {
  qrEditor.mode = 'guest';
  qrEditor.guest = g;
  qrEditor.variant = null;
  qrEditor.artUrl = null;
  qrEditor.qrUrl = null;
  qrEditor.layout = hasCustomLayout(g) ? { ...g.qrLayout } : { ...DEFAULT_LAYOUT };
  qrEditor.skipOverlay = !!g.skipQrOverlay;
  qrEditor.open = true;
  try {
    const [{ url: art }, { url: qr }] = await Promise.all([
      getCardUrl(route.params.id, g._id),
      getGuestQrUrl(route.params.id, g._id),
    ]);
    qrEditor.artUrl = art;
    qrEditor.qrUrl = qr;
  } catch (err) { toast.error(apiErrorMessage(err)); qrEditor.open = false; }
}
async function openSamplerEditor() {
  const v = samplerVariant.value;
  if (!v) return;
  qrEditor.mode = 'variant';
  qrEditor.guest = null;
  qrEditor.variant = v;
  qrEditor.artUrl = null;
  qrEditor.qrUrl = null;
  qrEditor.layout = v.qrLayout ? { ...v.qrLayout } : { ...DEFAULT_LAYOUT };
  qrEditor.open = true;
  // Prefer the first guest WITH own uploaded artwork as the visual reference
  // — positioning against a real card gives an accurate preview vs. a
  // generic template. Fall back to the variant image only when no guest has
  // uploaded their own card yet.
  const guestWithCard = guests.value.find((g) => coverage[g._id] === 'own') || guests.value[0];
  try {
    const artP = guestWithCard && coverage[guestWithCard._id] === 'own'
      ? getCardUrl(route.params.id, guestWithCard._id).then((r) => r.url)
      : variantImageUrlById(route.params.id, v._id);
    const qrP = guestWithCard ? getGuestQrUrl(route.params.id, guestWithCard._id) : Promise.resolve({ url: null });
    const [art, qr] = await Promise.all([artP, qrP]);
    qrEditor.artUrl = art;
    qrEditor.qrUrl = qr.url;
  } catch (err) { toast.error(apiErrorMessage(err)); qrEditor.open = false; }
}
function onCanvasClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  qrEditor.layout = { ...qrEditor.layout, x, y };
}
// Invalidate every cached thumbnail so the composite reflects the new QR
// position. `bust` is Date.now() at save time — passed all the way to the
// network fetch so no cache layer can serve the pre-move PNG.
function invalidateAllThumbs() {
  const bust = Date.now();
  for (const id of Object.keys(thumbs)) {
    try { URL.revokeObjectURL(thumbs[id]); } catch {}
    delete thumbs[id];
  }
  guests.value.forEach((g, i) => setTimeout(() => loadThumb(g, bust), i * 30));
}

async function saveQrLayout() {
  qrEditor.saving = true;
  try {
    if (qrEditor.mode === 'variant') {
      const v = qrEditor.variant;
      // Sampler edit = "set once for everyone" — write the layout to the
      // variant AND to every guest so it actually shows up on ALL cards,
      // regardless of whether a guest has their own uploaded artwork.
      // Skip guests that already opted out of QR overlay entirely.
      const layout = { ...qrEditor.layout };
      await updateVariant(route.params.id, v._id, { qrLayout: layout });
      v.qrLayout = { ...layout };
      // Fan out to guests in parallel; ignore per-guest failures so one bad
      // update doesn't derail the batch.
      await Promise.allSettled(
        guests.value
          .filter((g) => !g.skipQrOverlay)
          .map((g) => updateGuest(route.params.id, g._id, { qrLayout: layout })
            .then(() => { g.qrLayout = { ...layout }; })
            .catch(() => {}))
      );
      invalidateAllThumbs();
      toast.success('QR position applied to every guest');
    } else {
      const patch = { qrLayout: qrEditor.layout, skipQrOverlay: qrEditor.skipOverlay };
      await updateGuest(route.params.id, qrEditor.guest._id, patch);
      Object.assign(qrEditor.guest, { qrLayout: { ...qrEditor.layout }, skipQrOverlay: qrEditor.skipOverlay });
      try { URL.revokeObjectURL(thumbs[qrEditor.guest._id]); } catch {}
      delete thumbs[qrEditor.guest._id];
      await loadThumb(qrEditor.guest, Date.now());
      toast.success(qrEditor.skipOverlay ? 'Saved — QR overlay disabled for this guest' : 'QR position saved');
    }
    qrEditor.open = false;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { qrEditor.saving = false; }
}
async function resetQr() {
  qrEditor.saving = true;
  try {
    if (qrEditor.mode === 'variant') {
      await updateVariant(route.params.id, qrEditor.variant._id, { qrLayout: DEFAULT_LAYOUT });
      qrEditor.variant.qrLayout = { ...DEFAULT_LAYOUT };
      qrEditor.layout = { ...DEFAULT_LAYOUT };
      invalidateAllThumbs();
    } else {
      await updateGuest(route.params.id, qrEditor.guest._id, {
        qrLayout: { x: null, y: null, size: null },
      });
      Object.assign(qrEditor.guest, { qrLayout: { x: null, y: null, size: null } });
      qrEditor.layout = { ...DEFAULT_LAYOUT };
      try { URL.revokeObjectURL(thumbs[qrEditor.guest._id]); } catch {}
      delete thumbs[qrEditor.guest._id];
      await loadThumb(qrEditor.guest, Date.now());
    }
    toast.success('Reset to default position');
    qrEditor.open = false;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { qrEditor.saving = false; }
}

onMounted(refresh);
onBeforeUnmount(() => {
  Object.values(thumbs).forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
});
</script>
