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
        <!-- Fallback for events with NO shared template: fan the QR position
             out to every guest with their own uploaded artwork. -->
        <button v-if="!samplerVariant && anyGuestHasCardImage" class="btn-secondary !text-sm" @click="openBulkQrEditor">
          <QrCodeIcon class="w-4 h-4" /> Position QR for all
        </button>
        <button v-if="anyGuestHasCardImage" class="btn-ghost !text-sm" :disabled="repairing" @click="runRepair" title="Wipe every rendered thumbnail and re-enable the QR overlay for every guest">
          <span v-if="repairing" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
          <ArrowPathIcon v-else class="w-4 h-4" /> {{ repairing ? 'Repairing…' : 'Repair thumbnails' }}
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

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[220px]">
        <input v-model="searchInput" @input="onSearch" type="text" placeholder="Search guests by name, phone, memberId…"
               class="field-input !py-2 !text-sm w-full" />
      </div>
      <div v-if="totalGuests" class="text-2xs text-surface-slate dark:text-surface-ash tabular-nums">
        Page {{ page }} / {{ totalPages }} · {{ totalGuests }} guest{{ totalGuests === 1 ? '' : 's' }}
      </div>
      <div class="flex gap-1">
        <button class="btn-ghost !text-sm" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">Prev</button>
        <button class="btn-ghost !text-sm" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">Next</button>
      </div>
    </div>

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
      <!-- Small helper banner ONLY when literally nothing is renderable
           (no template AND no guest has uploaded artwork). Once even one
           guest has their own card, the grid takes over and each tile
           renders that guest's real card with the QR overlaid. -->
      <div v-if="!samplerVariant && !anyOwnArtwork && !anyGuestHasCardImage"
           class="surface-card p-6 border-l-4 border-l-amber-500 mb-5">
        <p class="text-lg font-bold text-surface-charcoal dark:text-surface-bone mb-1">Nothing to render yet</p>
        <p class="text-md text-surface-charcoal dark:text-surface-bone mb-3">
          Upload guest artwork under Cards, or pick a card template. Uploaded cards show up here automatically with the QR baked in.
        </p>
        <div class="flex gap-2">
          <router-link :to="`/app/events/${route.params.id}/cards`" class="btn-primary !text-sm">Go to Cards</router-link>
          <router-link :to="`/app/events/${route.params.id}/cards/templates`" class="btn-secondary !text-sm">Browse templates</router-link>
        </div>
      </div>

      <div v-if="samplerVariant" class="surface-card p-3 mb-5 flex items-center gap-3">
        <img v-if="samplerThumbUrl" :src="samplerThumbUrl" class="w-16 h-20 object-contain rounded-md bg-surface-mist dark:bg-surface-fog" />
        <div class="min-w-0 flex-1">
          <p class="text-heading truncate">Active template: {{ samplerVariant.name || 'Untitled template' }}</p>
          <p class="text-2xs text-surface-slate dark:text-surface-ash">
            Variables auto-mapped: first name, last name, memberId, phone, seat type, date, venue.
          </p>
        </div>
      </div>

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
                : qrEditor.mode === 'bulk'
                ? 'Position QR on every uploaded card'
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
        <div class="qr-editor-canvas relative mx-auto max-w-md w-full rounded-xl overflow-hidden bg-white cursor-crosshair select-none"
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
          <!-- Top band: short code. Click / drag it to switch targets. -->
          <div class="absolute text-center whitespace-nowrap tabular-nums select-none"
               :class="editorTarget === 'top' ? 'ring-2 ring-brand-gold rounded-sm cursor-move' : 'cursor-pointer'"
               :style="{ ...editorBandStyle('guestCode'), ...bandBoxStyle('guestCode') }"
               @pointerdown.stop="onBandPointerDown('top', $event)">
            {{ previewShortCode }}
          </div>
          <!-- Bottom band: seat type. Hidden when the operator disabled it. -->
          <div v-if="eventBranding.guestCodeShowSeatType !== false"
               class="absolute text-center whitespace-nowrap tabular-nums select-none"
               :class="editorTarget === 'bot' ? 'ring-2 ring-brand-gold rounded-sm cursor-move' : 'cursor-pointer'"
               :style="{ ...editorBandStyle('seatType'), ...bandBoxStyle('seatType') }"
               @pointerdown.stop="onBandPointerDown('bot', $event)">
            {{ previewSeatType }}
          </div>
        </div>

        <!-- Target selector — which layer the sliders / drag act on. -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-black uppercase tracking-widest text-surface-slate dark:text-surface-ash">Editing:</span>
          <div class="flex gap-1 p-1 rounded-lg bg-surface-mist/60 dark:bg-surface-fog/40">
            <button v-for="t in EDITOR_TARGETS" :key="t.value" type="button"
                    class="px-3 py-1 rounded-md text-xs font-bold transition"
                    :class="editorTarget === t.value
                      ? 'bg-white dark:bg-surface-night text-brand-gold-deep dark:text-brand-gold-soft shadow-sm'
                      : 'text-surface-slate dark:text-surface-ash'"
                    @click="editorTarget = t.value">
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- X / Y / Size sliders, bound to the active target. Size for the
             QR moves the QR square; Size for a text band scales its font. -->
        <div class="grid grid-cols-1 gap-2.5">
          <div v-for="s in SLIDERS" :key="s.key" class="flex items-center gap-3">
            <label class="text-xs font-black uppercase tracking-widest text-surface-slate dark:text-surface-ash w-14">{{ s.label }}</label>
            <input type="range"
                   :min="s.key === 'size' && editorTarget !== 'qr' ? 0.5 : s.min"
                   :max="s.key === 'size' && editorTarget !== 'qr' ? 2 : s.max"
                   :step="s.step"
                   :value="currentXYSize()[s.key] ?? (s.key === 'size' ? 1 : 0.5)"
                   @input="setTargetAxis(s.key, Number($event.target.value))"
                   class="flex-1 accent-brand-gold" />
            <span class="text-2xs text-surface-slate dark:text-surface-ash w-14 text-right tabular-nums">
              {{ s.key === 'size' && editorTarget !== 'qr' ? `${(currentXYSize().size ?? 1).toFixed(2)}×` : pct(currentXYSize()[s.key] ?? 0.5) }}
            </span>
          </div>
        </div>

        <!-- QR appearance — modules color + logo ring color, same fields
             the Edit Event page's Card colors block exposes. Kept here so
             a designer can iterate on the whole card without hopping
             between pages. -->
        <div class="surface-inset p-3 rounded-lg space-y-2"
             :class="editorTarget === 'qr' ? 'ring-2 ring-brand-gold' : ''"
             @click="editorTarget = 'qr'">
          <p class="section-eyebrow">QR appearance</p>
          <div class="grid grid-cols-3 gap-2">
            <label class="flex flex-col gap-1">
              <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Modules</span>
              <input type="color"
                     :value="eventBranding.qrColor || '#9A7B2E'"
                     @input="eventBranding.qrColor = $event.target.value"
                     @click.stop
                     class="h-7 w-full rounded-md border border-surface-mist cursor-pointer" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Logo ring</span>
              <input type="color"
                     :value="eventBranding.logoColor || '#E5C97A'"
                     @input="eventBranding.logoColor = $event.target.value"
                     @click.stop
                     class="h-7 w-full rounded-md border border-surface-mist cursor-pointer" />
            </label>
            <button type="button" class="btn-ghost !text-2xs mt-4" @click.stop="eventBranding.qrColor = null; eventBranding.logoColor = null">
              Reset
            </button>
          </div>
        </div>

        <!-- Two independent typography blocks — top band (short code) and
             bottom band (seat type). Each carries its own font / weight /
             style / color / size scale / letter spacing. -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div v-for="band in TYPO_BANDS" :key="band.prefix"
               class="surface-inset p-3 rounded-lg space-y-2 cursor-pointer"
               :class="editorTarget === band.target ? 'ring-2 ring-brand-gold' : ''"
               @click="editorTarget = band.target">
            <p class="section-eyebrow">{{ band.label }}</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Font</span>
                <select v-model="eventBranding[band.prefix + 'Font']" class="field-input !py-1 !text-xs" @click.stop>
                  <option :value="null">Default</option>
                  <option v-for="f in FONTS" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Weight</span>
                <select v-model.number="eventBranding[band.prefix + 'Weight']" class="field-input !py-1 !text-xs" @click.stop>
                  <option :value="null">Default</option>
                  <option :value="300">300</option><option :value="400">400</option>
                  <option :value="500">500</option><option :value="700">700</option>
                  <option :value="900">900</option>
                </select>
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Style</span>
                <select v-model="eventBranding[band.prefix + 'Style']" class="field-input !py-1 !text-xs" @click.stop>
                  <option :value="null">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Color</span>
                <input type="color"
                       :value="eventBranding[band.colorKey] || (band.prefix === 'seatType' && eventBranding.textColor) || '#2A2417'"
                       @input="eventBranding[band.colorKey] = $event.target.value"
                       @click.stop
                       class="h-7 w-full rounded-md border border-surface-mist cursor-pointer" />
              </label>
              <label class="flex flex-col gap-1 col-span-2">
                <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">
                  Size × {{ eventBranding[band.prefix + 'SizeScale'] ?? 1 }} · Spacing {{ eventBranding[band.prefix + 'LetterSpacing'] ?? 2 }}
                </span>
                <div class="grid grid-cols-2 gap-2">
                  <input type="range" min="0.5" max="2" step="0.05"
                         :value="eventBranding[band.prefix + 'SizeScale'] ?? 1"
                         @input="eventBranding[band.prefix + 'SizeScale'] = Number($event.target.value)"
                         @click.stop
                         class="accent-brand-gold" />
                  <input type="range" min="0" max="16" step="1"
                         :value="eventBranding[band.prefix + 'LetterSpacing'] ?? 2"
                         @input="eventBranding[band.prefix + 'LetterSpacing'] = Number($event.target.value)"
                         @click.stop
                         class="accent-brand-gold" />
                </div>
              </label>
              <button v-if="eventBranding[band.prefix + 'X'] != null || eventBranding[band.prefix + 'Y'] != null"
                      type="button" class="col-span-2 text-2xs text-brand-gold-deep dark:text-brand-gold-soft font-bold text-left"
                      @click.stop="eventBranding[band.prefix + 'X'] = null; eventBranding[band.prefix + 'Y'] = null">
                Reset position (return to auto-place around QR)
              </button>
            </div>
            <label v-if="band.prefix === 'guestCode'" class="flex items-center gap-2 pt-1 border-t border-surface-mist dark:border-surface-fog">
              <input type="checkbox" v-model="eventBranding.guestCodeShowSeatType" class="accent-brand-gold w-4 h-4" @click.stop />
              <span class="text-xs text-surface-charcoal dark:text-surface-bone">Show bottom seat-type strip</span>
            </label>
          </div>
        </div>
        <p class="text-2xs text-surface-slate dark:text-surface-ash">These settings also update the event's branding in Settings.</p>

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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  PhotoIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, ExclamationTriangleIcon, QrCodeIcon, PencilSquareIcon, ArrowPathIcon,
} from '@heroicons/vue/24/outline';
import AppModal from '@/components/common/AppModal.vue';
import { getCardUrl } from '@/services/cards.service';
import { updateGuest, getGuestQrUrl } from '@/services/guests.service';
import { listVariants, updateVariant, variantImageUrlById, repairCards } from '@/services/cardVariants.service';
import { listGuests } from '@/services/guests.service';
import { fetchPreviewUrl, cardCoverage, downloadGuestCardPng, downloadPdf as downloadPdfApi } from '@/services/cardVariants.service';
import { getEvent, updateEvent } from '@/services/events.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageHeader from '@/components/layout/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';

const route = useRoute();
const toast = useToast();

const guests = ref([]);
const loading = ref(true);
const page = ref(1);
// 200 meant a single page load could queue up to 200 real image-composite
// renders server-side — fine at ~60 guests, but at 280+ guests (this
// event) the render queue backed up badly enough that the tail end of the
// page timed out even though rendering was still progressing normally.
// Smaller pages finish their render queue comfortably within any
// reasonable timeout, even from a fully cold cache.
const PAGE_SIZE = 60;
const totalGuests = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(totalGuests.value / PAGE_SIZE)));
const searchInput = ref('');
let searchTimer = null;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; refresh(); }, 300);
}
function goToPage(n) {
  const clamped = Math.min(totalPages.value, Math.max(1, n));
  if (clamped === page.value) return;
  page.value = clamped;
  refresh();
}
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
const anyOwnArtwork = computed(() => guests.value.some((g) => coverage[g._id] === 'own'));
// Direct read off the Guest doc — reliable even when the /coverage endpoint
// hasn't resolved yet, or the current page filters coverage out.
const anyGuestHasCardImage = computed(() => guests.value.some((g) => !!g.cardImagePath));
const samplerThumbUrl = ref(null);
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

async function loadThumb(g, bust, retriesLeft = 2) {
  try {
    // `bust` is passed after any layout change so intermediate caches (SW,
    // browser HTTP cache, proxies) all miss and refetch fresh composites.
    // Retina-sharp thumbnail (w=600) with QR + short-code + seat-type strip
    // baked in — same composite the download endpoint produces, just smaller.
    thumbs[g._id] = await fetchPreviewUrl(route.params.id, g._id, { bust, w: 600, stamp: true });
    delete thumbErrors[g._id];
  } catch (err) {
    // A 429 (rate limited) or 5xx is transient — the card almost certainly
    // exists, the server just asked us to slow down. Back off and retry a
    // couple of times instead of permanently flagging "No artwork", which
    // used to happen on every burst-loaded page and looked like the
    // artwork was missing when it never was.
    const status = err?.response?.status;
    const transient = status === 429 || status >= 500;
    if (transient && retriesLeft > 0) {
      const delay = status === 429 ? 1500 : 800;
      await new Promise((r) => setTimeout(r, delay));
      return loadThumb(g, bust, retriesLeft - 1);
    }
    thumbErrors[g._id] = true;
  }
}

async function refresh() {
  loading.value = true;
  try {
    const [{ items, meta }, cov, vs] = await Promise.all([
      listGuests(route.params.id, {
        limit: PAGE_SIZE,
        page: page.value,
        q: searchInput.value.trim() || undefined,
        // Guests with uploaded card artwork first — so the operator sees
        // completed cards up top and the "no artwork" placeholders sink to
        // the bottom / later pages instead of hiding the ones that ARE ready.
        sort: 'cardFirst',
      }),
      cardCoverage(route.params.id).catch(() => ({})),
      listVariants(route.params.id).catch(() => []),
    ]);
    guests.value = items;
    totalGuests.value = meta?.total ?? items.length;
    Object.assign(coverage, cov);
    // The sampler is the default variant if set, otherwise the first active
    // one — same rule the backend resolveBaseCard() uses.
    variants.value = vs;
    samplerVariant.value = vs.find((v) => v.isActive && v.isDefault)
      || vs.find((v) => v.isActive)
      || null;
    // Show the active-template thumbnail chip.
    if (samplerVariant.value?._id) {
      try { samplerThumbUrl.value = await variantImageUrlById(route.params.id, samplerVariant.value._id); }
      catch (_) { samplerThumbUrl.value = null; }
    } else { samplerThumbUrl.value = null; }

    // Load a thumb for every guest that can render one — either they have
    // their own uploaded artwork (guest.cardImagePath) or a sampler variant
    // exists for the event. Guests with no path AND no sampler get a "No
    // artwork" tile without a network call.
    const hasSampler = !!samplerVariant.value;
    // Bust on initial page load so a browser that held a pre-fix
    // "stamp=false" response can't reuse it — the server sends
    // Cache-Control: no-store but disk/HTTP layers between us and the
    // client sometimes ignore that.
    const initialBust = Date.now();
    items.forEach((g, i) => {
      const canRender = !!g.cardImagePath || hasSampler;
      if (canRender) setTimeout(() => loadThumb(g, initialBust), i * 30);
      else thumbErrors[g._id] = true;
    });
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

// Event branding — loaded on mount, mutated by the QR editor's typography
// controls, and PATCHed back to the event on Save so the same knobs from
// EventFormView are reachable right here without leaving the flow.
const eventBranding = reactive({
  qrColor: null, textColor: null, logoColor: null,
  guestCodeFont: null, guestCodeWeight: null, guestCodeStyle: null,
  guestCodeSizeScale: null, guestCodeLetterSpacing: null,
  guestCodeShowSeatType: true,
  guestCodeX: null, guestCodeY: null,
  seatTypeFont: null, seatTypeWeight: null, seatTypeStyle: null,
  seatTypeSizeScale: null, seatTypeLetterSpacing: null, seatTypeColor: null,
  seatTypeX: null, seatTypeY: null,
});
// Which layer the sliders / drags are currently editing.
const editorTarget = ref('qr'); // 'qr' | 'top' | 'bot'
async function loadEventBranding() {
  try {
    const { event } = await getEvent(route.params.id);
    const eb = event.branding || {};
    Object.assign(eventBranding, {
      qrColor: eb.qrColor || null,
      textColor: eb.textColor || null,
      logoColor: eb.logoColor || null,
      guestCodeFont: eb.guestCodeFont || null,
      guestCodeWeight: eb.guestCodeWeight || null,
      guestCodeStyle: eb.guestCodeStyle || null,
      guestCodeSizeScale: eb.guestCodeSizeScale ?? null,
      guestCodeLetterSpacing: eb.guestCodeLetterSpacing ?? null,
      guestCodeShowSeatType: eb.guestCodeShowSeatType !== false,
      guestCodeX: eb.guestCodeX ?? null,
      guestCodeY: eb.guestCodeY ?? null,
      seatTypeFont: eb.seatTypeFont || null,
      seatTypeWeight: eb.seatTypeWeight || null,
      seatTypeStyle: eb.seatTypeStyle || null,
      seatTypeSizeScale: eb.seatTypeSizeScale ?? null,
      seatTypeLetterSpacing: eb.seatTypeLetterSpacing ?? null,
      seatTypeColor: eb.seatTypeColor || null,
      seatTypeX: eb.seatTypeX ?? null,
      seatTypeY: eb.seatTypeY ?? null,
    });
    if (event.code) eventBranding._eventCode = event.code;
  } catch (_) { /* silently — the editor still works, just without preview text */ }
}
// Sample values for the modal preview bands — real guest data when we have
// a guest in scope, otherwise generic placeholders.
const previewShortCode = computed(() => {
  const g = qrEditor.guest;
  const pubCode = g?.pubCode || 'A7X';
  return eventBranding._eventCode ? `${eventBranding._eventCode}-${pubCode}` : pubCode;
});
const previewSeatType = computed(() => {
  const t = qrEditor.guest?.type || 'single';
  return t === 'family' ? `FAMILY (${qrEditor.guest?.familySize || 1})`
    : t === 'double' ? 'DOUBLE' : 'SINGLE';
});
// Reads per-band typography from eventBranding, top band from guestCode*,
// bottom band from seatType* falling back to guestCode* so an event that
// only tuned one still gets a sensible other side.
function bandCfg(which) {
  const pick = (k) => {
    if (which === 'seatType') {
      const v = eventBranding[`seatType${k}`];
      if (v != null && v !== '') return v;
    }
    return eventBranding[`guestCode${k}`];
  };
  return {
    font: pick('Font'),
    weight: pick('Weight') || 900,
    style: pick('Style') === 'italic' ? 'italic' : 'normal',
    scale: Math.min(2, Math.max(0.5, Number(pick('SizeScale')) || 1)),
    letter: pick('LetterSpacing') ?? 2,
    color: (which === 'seatType' ? eventBranding.seatTypeColor : null) || eventBranding.textColor || '#2A2417',
  };
}
function editorBandStyle(which) {
  const cfg = bandCfg(which);
  const stampPx = canvasPxWidth.value * (qrEditor.layout.size || 0.2);
  const fontPx = Math.max(8, stampPx * 0.22 * 0.78 * cfg.scale);
  return {
    fontFamily: cfg.font ? `'${cfg.font}', sans-serif` : 'Inter, sans-serif',
    fontWeight: cfg.weight,
    fontStyle: cfg.style,
    fontSize: `${fontPx}px`,
    lineHeight: '1',
    letterSpacing: `${cfg.letter * 0.5}px`,
    color: cfg.color,
  };
}

// Effective position for a text band — override (guestCodeX/Y or
// seatTypeX/Y) when set, else auto-place directly above / below the QR.
function bandPos(which) {
  const l = qrEditor.layout;
  const s = clamp(l?.size ?? 0.2, 0.01, 1);
  const y = clamp(l?.y ?? 0.75, 0, 1);
  const aspect = qrEditor.cardAspect || (3 / 4);
  const heightPct = s * aspect;
  const cfg = bandCfg(which);
  const bandHPct = s * 0.22 * aspect * cfg.scale;
  if (which === 'guestCode') {
    const overrideY = eventBranding.guestCodeY;
    const overrideX = eventBranding.guestCodeX;
    return {
      x: typeof overrideX === 'number' ? overrideX : clamp(l?.x ?? 0.5, 0, 1),
      y: typeof overrideY === 'number' ? overrideY : (y - heightPct / 2 - bandHPct / 2),
      h: bandHPct,
    };
  }
  const overrideY = eventBranding.seatTypeY;
  const overrideX = eventBranding.seatTypeX;
  return {
    x: typeof overrideX === 'number' ? overrideX : clamp(l?.x ?? 0.5, 0, 1),
    y: typeof overrideY === 'number' ? overrideY : (y + heightPct / 2 + bandHPct / 2),
    h: bandHPct,
  };
}
function bandBoxStyle(which) {
  const p = bandPos(which);
  const s = clamp(qrEditor.layout?.size ?? 0.2, 0.01, 1);
  return {
    left: `${(p.x - s / 2) * 100}%`,
    top: `${(p.y - p.h / 2) * 100}%`,
    width: `${s * 100}%`,
  };
}

const qrEditor = reactive({
  open: false,
  mode: 'guest',            // 'guest' | 'variant' | 'bulk'
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
// Measured on-screen width of the preview canvas, used to size the text
// bands in real pixels — a % font-size resolves against parent font-size,
// not width, so my earlier calc()/% approach rendered ~1px unreadable text.
const canvasPxWidth = ref(0);
function onArtLoad(e) {
  const w = e.target.naturalWidth || 0;
  const h = e.target.naturalHeight || 0;
  if (w > 0 && h > 0) qrEditor.cardAspect = w / h;
  const canvas = e.target.parentElement;
  if (canvas) canvasPxWidth.value = canvas.clientWidth;
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const canvas = document.querySelector('.qr-editor-canvas');
    if (canvas) canvasPxWidth.value = canvas.clientWidth;
  });
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
// Drag on canvas — routes to whichever target is active (QR / top / bottom).
function onPointerDown(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const move = (ev) => {
    const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
    applyPositionToTarget(x, y);
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function onBandPointerDown(which, e) {
  editorTarget.value = which;
  onPointerDown(e.currentTarget?.parentElement ? { currentTarget: e.currentTarget.parentElement } : e);
}
function applyPositionToTarget(x, y) {
  if (editorTarget.value === 'qr') qrEditor.layout = { ...qrEditor.layout, x, y };
  else if (editorTarget.value === 'top') { eventBranding.guestCodeX = x; eventBranding.guestCodeY = y; }
  else if (editorTarget.value === 'bot') { eventBranding.seatTypeX = x; eventBranding.seatTypeY = y; }
}
// Slider helpers — read/write the active target instead of always the QR.
function currentXYSize() {
  if (editorTarget.value === 'qr') return { x: qrEditor.layout.x, y: qrEditor.layout.y, size: qrEditor.layout.size };
  const p = bandPos(editorTarget.value === 'top' ? 'guestCode' : 'seatType');
  const cfg = bandCfg(editorTarget.value === 'top' ? 'guestCode' : 'seatType');
  return { x: p.x, y: p.y, size: cfg.scale };
}
function setTargetAxis(axis, v) {
  if (editorTarget.value === 'qr') {
    qrEditor.layout = { ...qrEditor.layout, [axis]: v };
    return;
  }
  const prefix = editorTarget.value === 'top' ? 'guestCode' : 'seatType';
  if (axis === 'x') eventBranding[`${prefix}X`] = v;
  else if (axis === 'y') eventBranding[`${prefix}Y`] = v;
  else if (axis === 'size') eventBranding[`${prefix}SizeScale`] = v;
}
const EDITOR_TARGETS = [
  { value: 'qr', label: 'QR code' },
  { value: 'top', label: 'Top text' },
  { value: 'bot', label: 'Bottom text' },
];
const TYPO_BANDS = [
  { prefix: 'guestCode', target: 'top', colorKey: 'textColor', label: 'Top text (short code)' },
  { prefix: 'seatType', target: 'bot', colorKey: 'seatTypeColor', label: 'Bottom text (seat type)' },
];
const FONTS = ['Inter', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Poppins', 'Great Vibes', 'Cinzel'];
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
// "Set QR position for every guest who has their own uploaded card"
// — same modal as the sampler editor, but the fan-out on save walks
// guest.cardImagePath instead of a variant. Uses the first guest WITH
// uploaded artwork as the canvas so what you see is what gets baked in.
async function openBulkQrEditor() {
  const first = guests.value.find((g) => !!g.cardImagePath) || guests.value.find((g) => coverage[g._id] === 'own');
  if (!first) { toast.error('Upload guest cards first'); return; }
  qrEditor.mode = 'bulk';
  qrEditor.guest = null;
  qrEditor.variant = null;
  qrEditor.artUrl = null;
  qrEditor.qrUrl = null;
  qrEditor.layout = first.qrLayout && typeof first.qrLayout.x === 'number'
    ? { ...first.qrLayout } : { ...DEFAULT_LAYOUT };
  qrEditor.open = true;
  try {
    const [{ url: art }, { url: qr }] = await Promise.all([
      getCardUrl(route.params.id, first._id),
      getGuestQrUrl(route.params.id, first._id),
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
  applyPositionToTarget(x, y);
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

// PATCH the event with the current typography state — same shape as
// EventFormView's payload. Fires alongside every Save in the QR editor
// so operators don't have to hop over to Settings.
const repairing = ref(false);
async function runRepair() {
  if (!window.confirm('Repair thumbnails? This wipes every rendered card cache and re-enables the QR overlay for every guest with uploaded artwork.')) return;
  repairing.value = true;
  try {
    const r = await repairCards(route.params.id);
    toast.success(`Repaired: ${r.cachePurged || 0} cached files cleared, ${r.guestsReset || 0} guest overlays re-enabled.`);
    invalidateAllThumbs();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { repairing.value = false; }
}

async function persistTypography() {
  try {
    await updateEvent(route.params.id, {
      branding: {
        qrColor: eventBranding.qrColor,
        textColor: eventBranding.textColor,
        logoColor: eventBranding.logoColor,
        // Top band
        guestCodeFont: eventBranding.guestCodeFont,
        guestCodeWeight: eventBranding.guestCodeWeight,
        guestCodeStyle: eventBranding.guestCodeStyle,
        guestCodeSizeScale: eventBranding.guestCodeSizeScale,
        guestCodeLetterSpacing: eventBranding.guestCodeLetterSpacing,
        guestCodeShowSeatType: eventBranding.guestCodeShowSeatType,
        guestCodeX: eventBranding.guestCodeX,
        guestCodeY: eventBranding.guestCodeY,
        // Bottom band
        seatTypeFont: eventBranding.seatTypeFont,
        seatTypeWeight: eventBranding.seatTypeWeight,
        seatTypeStyle: eventBranding.seatTypeStyle,
        seatTypeSizeScale: eventBranding.seatTypeSizeScale,
        seatTypeLetterSpacing: eventBranding.seatTypeLetterSpacing,
        seatTypeColor: eventBranding.seatTypeColor,
        seatTypeX: eventBranding.seatTypeX,
        seatTypeY: eventBranding.seatTypeY,
        guestCardQrLayout: { ...qrEditor.layout },
      },
    });
  } catch (err) { toast.error(`Typography save failed: ${apiErrorMessage(err)}`); }
}

async function saveQrLayout() {
  qrEditor.saving = true;
  try {
    await persistTypography();
    // BULLETPROOF cache clear: wipe every rendered thumbnail on the
    // origin AND reset skipQrOverlay in one shot. Without this, colors /
    // typography / positions change on the DB but the rendered cache
    // still serves the old composite, and operators see nothing update.
    await repairCards(route.params.id).catch(() => {});
    // Force local + browser cache miss on EVERY thumbnail (not just the
    // one guest, not just when in variant/bulk mode) so any branding
    // change on the event repaints every card. Redundant for
    // variant/bulk paths below but cheap and correct for all three.
    invalidateAllThumbs();
    if (qrEditor.mode === 'bulk') {
      const layout = { ...qrEditor.layout };
      // Every guest with uploaded artwork, INCLUDING those previously
      // opted out of the QR overlay — Position-QR-for-all is a hard reset:
      // it explicitly re-enables the stamp for every card in the batch.
      const targets = guests.value.filter((g) => !!g.cardImagePath);
      await Promise.allSettled(
        targets.map((g) => updateGuest(route.params.id, g._id, {
          qrLayout: layout,
          skipQrOverlay: false,
        }).then(() => { g.qrLayout = { ...layout }; g.skipQrOverlay = false; })
          .catch(() => {})),
      );
      invalidateAllThumbs();
      toast.success(`QR position applied to ${targets.length} card${targets.length === 1 ? '' : 's'}`);
      qrEditor.open = false;
      return;
    }
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

// Lazy-load the picked font from Google Fonts so the modal preview uses
// the real typeface. Same mechanism as EventFormView; harmless dedupe.
function ensureFontLoaded(font) {
  if (!font || typeof document === 'undefined') return;
  if (document.querySelector(`link[data-branding-font="${font}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&display=swap`;
  link.setAttribute('data-branding-font', font);
  document.head.appendChild(link);
}
watch(() => eventBranding.guestCodeFont, ensureFontLoaded);
watch(() => eventBranding.seatTypeFont, ensureFontLoaded);

onMounted(() => { refresh(); loadEventBranding(); });
onBeforeUnmount(() => {
  Object.values(thumbs).forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
});
</script>
