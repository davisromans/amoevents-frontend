<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="relative flex-1 min-w-[220px]">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate" />
        <input v-model="search" type="text" placeholder="Search cards by name, phone, memberId…"
               class="field-input !pl-9 !py-2 !text-sm w-full" />
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary !text-sm" @click="exportOpen = true">
          Export names…
        </button>
        <router-link :to="`/app/events/${route.params.id}/cards/templates`" class="btn-primary !text-sm">
          Browse templates
        </router-link>
        <router-link :to="`/app/events/${route.params.id}/cards/variants`" class="btn-secondary !text-sm">
          Variants &amp; PDF
        </router-link>
      </div>
    </div>

    <!-- Photoshop data-merge export: pick which guests + how names are
         cased, download a plain .txt ready for Variables/Data Sets. -->
    <AppModal v-model="exportOpen" title="Export guest names" :maxWidth="480">
      <div class="space-y-4">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-bold text-surface-charcoal dark:text-surface-bone">Header row (first line)</span>
          <input v-model="exportOpts.header" type="text" class="field-input !text-sm" placeholder="PersonName" />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-xs font-bold text-surface-charcoal dark:text-surface-bone">Name casing</span>
          <select v-model="exportOpts.casing" class="field-input !text-sm">
            <option value="asis">As stored</option>
            <option value="upper">ALL CAPS</option>
            <option value="title">Title Case</option>
            <option value="firstword">Only first letter capitalized</option>
          </select>
        </label>

        <div class="grid grid-cols-3 gap-2">
          <label class="flex flex-col gap-1">
            <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Artwork</span>
            <select v-model="exportOpts.artwork" class="field-input !py-1.5 !text-xs">
              <option value="any">Any</option>
              <option value="with">With artwork</option>
              <option value="without">Without artwork</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Invitation</span>
            <select v-model="exportOpts.invitation" class="field-input !py-1.5 !text-xs">
              <option value="any">Any</option>
              <option value="invited">Marked invited</option>
              <option value="not_invited">Not yet invited</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-2xs font-bold text-surface-charcoal dark:text-surface-bone">Pledge</span>
            <select v-model="exportOpts.pledge" class="field-input !py-1.5 !text-xs">
              <option value="any">Any</option>
              <option value="full">Fully paid</option>
              <option value="partial">Partial</option>
              <option value="none">None paid</option>
            </select>
          </label>
        </div>

        <p class="text-2xs text-surface-slate dark:text-surface-ash">
          {{ exportPreviewCount }} guest{{ exportPreviewCount === 1 ? '' : 's' }} match these filters.
        </p>

        <div class="flex justify-end gap-2 pt-2 border-t border-surface-mist dark:border-surface-fog">
          <button class="btn-ghost" @click="exportOpen = false">Cancel</button>
          <button class="btn-primary" :disabled="!exportPreviewCount" @click="downloadExport">Download .txt</button>
        </div>
      </div>
    </AppModal>
    <p class="text-subtext mb-5">
      Filename should match <span class="chip">memberId</span>,
      <span class="chip">phone</span>, or <span class="chip">First Last</span>.
    </p>

    <!-- What to do when a file matches a guest who already has a card.
         Applies to the NEXT upload you start. -->
    <div class="flex items-center gap-3 mb-4 text-sm">
      <span class="text-subtext">If a guest already has a card:</span>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" value="replace" v-model="duplicateMode" class="accent-brand-gold" />
        Replace it
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" value="skip" v-model="duplicateMode" class="accent-brand-gold" />
        Skip (keep existing)
      </label>
    </div>

    <div
      class="surface-inset p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer mb-6"
      :class="dragging
        ? 'border-brand-gold bg-brand-gold-glow'
        : 'border-surface-mist dark:border-surface-fog hover:border-brand-gold'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="$refs.fileEl.click()"
    >
      <PhotoIcon class="w-8 h-8 text-brand-gold-deep dark:text-brand-gold-soft mx-auto mb-2" />
      <p class="text-lg font-bold text-surface-charcoal dark:text-surface-bone">Drop card images or click to browse</p>
      <p class="text-subtext mt-1">PNG · JPG · WEBP up to 15 MB each, 500 files at a time</p>
      <input ref="fileEl" type="file" multiple accept=".png,.jpg,.jpeg,.webp" class="hidden" @change="onPick" />
    </div>

    <div v-if="uploading" class="mb-4">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-surface-slate dark:text-surface-ash">Uploading…</span>
        <span class="tabular-nums font-bold">
          {{ uploadFilesDone }} / {{ uploadFilesTotal }} uploaded
          <span v-if="uploadFilesFailed" class="text-state-danger">({{ uploadFilesFailed }} failed)</span>
        </span>
      </div>
      <div class="h-1.5 bg-surface-mist dark:bg-surface-fog rounded-full overflow-hidden">
        <div class="h-full bg-gradient-gold transition-all" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <SummaryTile label="Uploaded" :value="matched.length" tone="success" />
      <SummaryTile label="Awaiting assignment" :value="unmatched.length" tone="warn" />
    </div>

    <section v-if="visibleMatched.length" class="mb-6">
      <p class="section-eyebrow mb-2">Uploaded cards ({{ visibleMatched.length }})</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="m in visibleMatched" :key="m.guestId" class="surface-card p-2 flex flex-col">
          <div class="aspect-[3/4] rounded-lg overflow-hidden bg-surface-mist dark:bg-surface-fog mb-2">
            <img v-if="thumbs[m.guestId]" :src="thumbs[m.guestId]" class="w-full h-full object-cover" />
          </div>
          <p class="text-heading truncate">{{ m.name }}</p>
          <p class="text-2xs text-surface-slate dark:text-surface-ash truncate">{{ m.memberId }}<span v-if="m.phone"> · {{ m.phone }}</span></p>
          <div class="flex gap-1 mt-2">
            <button class="btn-ghost !text-xs flex-1" :disabled="busy[m.guestId]" @click="download(m)" title="Download original">
              <ArrowDownTrayIcon class="w-3.5 h-3.5" /> Download
            </button>
            <button class="btn-ghost !text-xs flex-1 !text-red-500 hover:!bg-red-500/10" :disabled="busy[m.guestId]" @click="removeOne(m)" title="Delete card">
              <TrashIcon class="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
      <p v-if="search && !visibleMatched.length" class="text-subtext mt-3">No cards match "{{ search }}".</p>
    </section>

    <section v-if="unmatched.length">
      <p class="section-eyebrow mb-2">Needs assignment ({{ unmatched.length }})</p>
      <div class="space-y-2">
        <div v-for="u in unmatched" :key="u.stagedPath" class="surface-card p-3 flex items-center gap-3">
          <PhotoIcon class="w-5 h-5 text-surface-slate shrink-0" />
          <p class="flex-1 text-heading truncate">{{ u.originalFilename }}</p>
          <select class="field-input !py-1.5 !text-sm !w-56" v-model="pending[u.stagedPath]" @change="assignOne(u)">
            <option value="">Assign to guest…</option>
            <option v-for="g in guestOptions" :key="g._id" :value="g._id">
              {{ g.firstName }} {{ g.lastName }} · {{ g.memberId }}
            </option>
          </select>
          <button class="btn-danger !text-sm !py-1.5 !px-3" @click="discardOne(u)">Discard</button>
        </div>
      </div>
    </section>

    <p v-if="!loading && !matched.length && !unmatched.length" class="text-subtext text-center py-8">
      No cards uploaded yet. Drop artwork above to get started.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { PhotoIcon, ArrowDownTrayIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import {
  bulkUploadCards, assignStagedCard, discardStagedCard, removeGuestCard,
  getCardUrl, listCards, downloadCard,
} from '@/services/cards.service';
import { listGuests } from '@/services/guests.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import SummaryTile from '@/components/events/EventStat.vue';
import AppModal from '@/components/common/AppModal.vue';

const route = useRoute();
const toast = useToast();

const dragging = ref(false);
const uploading = ref(false);
const progress = ref(0);
// Real per-file completion tracking — a single giant multipart POST only
// gives byte-level progress (which barely moves until most of the payload
// is through, and never reports "N files done"). Files upload in fixed-size
// batches instead; the counter advances by a whole batch's worth the moment
// that batch's response actually comes back, so "42/269 uploaded" reflects
// files the server has genuinely finished processing, not bytes in flight.
const uploadFilesDone = ref(0);
const uploadFilesTotal = ref(0);
const uploadFilesFailed = ref(0);
// One file per request, several in flight at once — a single request can
// never wait on 19 OTHER files before the operator sees any movement, and a
// failed file only costs re-sending that one file, not a whole batch's MB.
const UPLOAD_CONCURRENCY = 5;
const duplicateMode = ref('replace'); // 'replace' | 'skip' — see the upload-options row
const loading = ref(true);
const search = ref('');
const matched = ref([]);       // [{ guestId, name, memberId, phone, cardImagePath }]
const unmatched = ref([]);
const guestOptions = ref([]);
const pending = reactive({});
const thumbs = reactive({});
const busy = reactive({});

const visibleMatched = computed(() => {
  if (!search.value.trim()) return matched.value;
  const q = search.value.trim().toLowerCase();
  return matched.value.filter((m) =>
    (m.name || '').toLowerCase().includes(q) ||
    (m.memberId || '').toLowerCase().includes(q) ||
    (m.phone || '').toLowerCase().includes(q) ||
    (m.pubCode || '').toLowerCase().includes(q),
  );
});

async function loadThumb(guestId) {
  try {
    const { url } = await getCardUrl(route.params.id, guestId);
    thumbs[guestId] = url;
  } catch (_) { /* skip */ }
}

async function refresh() {
  loading.value = true;
  try {
    const [data, guests] = await Promise.all([
      listCards(route.params.id),
      listGuests(route.params.id, { limit: 500 }),
    ]);
    matched.value = data.matched || [];
    unmatched.value = data.unmatched || [];
    guestOptions.value = guests.items || [];
    // Stagger thumb fetches so a 500-card event doesn't fire 500 concurrent requests.
    matched.value.forEach((m, i) => {
      if (!thumbs[m.guestId]) setTimeout(() => loadThumb(m.guestId), i * 30);
    });
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

function onDrop(e) {
  dragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length) upload(files);
}
function onPick(e) {
  const files = Array.from(e.target.files || []);
  if (files.length) upload(files);
  e.target.value = '';
}

async function upload(files) {
  uploading.value = true;
  progress.value = 0;
  uploadFilesDone.value = 0;
  uploadFilesFailed.value = 0;
  uploadFilesTotal.value = files.length;

  let totalMatched = 0;
  let totalUnmatched = 0;
  const failedNames = [];
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor];
      cursor += 1;
      try {
        const res = await bulkUploadCards(route.params.id, [file], { onDuplicate: duplicateMode.value });
        totalMatched += res.summary?.matched || 0;
        totalUnmatched += res.summary?.unmatched || 0;
      } catch (err) {
        uploadFilesFailed.value += 1;
        failedNames.push(file.name);
      }
      uploadFilesDone.value += 1;
      progress.value = Math.round((uploadFilesDone.value / uploadFilesTotal.value) * 100);
    }
  }

  try {
    // A handful of workers pull from the same cursor — real parallelism
    // without ever having more than UPLOAD_CONCURRENCY requests in flight,
    // so one slow file never blocks the whole queue's progress the way a
    // single strictly-sequential loop would.
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker));
    const summary = `${totalMatched} matched, ${totalUnmatched} need assignment`;
    if (failedNames.length) {
      toast.error(`${summary} — ${failedNames.length} failed: ${failedNames.slice(0, 5).join(', ')}${failedNames.length > 5 ? '…' : ''}`);
    } else {
      toast.success(summary);
    }
    await refresh();
  } finally { uploading.value = false; }
}

// ---- Photoshop name-list export ----
const exportOpen = ref(false);
const exportOpts = reactive({
  header: 'PersonName',
  casing: 'asis',
  artwork: 'any',
  invitation: 'any',
  pledge: 'any',
});
function applyCasing(name, mode) {
  if (mode === 'upper') return name.toUpperCase();
  if (mode === 'title') return name.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  if (mode === 'firstword') return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return name;
}
function guestPledgeState(g) {
  const amount = g.pledge?.amount || 0;
  const received = g.pledge?.receivedTZS || 0;
  if (amount <= 0 || received <= 0) return 'none';
  if (received >= amount) return 'full';
  return 'partial';
}
const filteredForExport = computed(() => {
  return guestOptions.value.filter((g) => {
    if (exportOpts.artwork === 'with' && !g.cardImagePath) return false;
    if (exportOpts.artwork === 'without' && g.cardImagePath) return false;
    const invited = (g.invitationCount || 0) > 0;
    if (exportOpts.invitation === 'invited' && !invited) return false;
    if (exportOpts.invitation === 'not_invited' && invited) return false;
    if (exportOpts.pledge !== 'any' && guestPledgeState(g) !== exportOpts.pledge) return false;
    return true;
  });
});
const exportPreviewCount = computed(() => filteredForExport.value.length);
function downloadExport() {
  const lines = [exportOpts.header || 'PersonName'];
  for (const g of filteredForExport.value) {
    const name = `${g.firstName || ''} ${g.lastName || ''}`.trim().replace(/\s+/g, ' ');
    lines.push(applyCasing(name, exportOpts.casing));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guest_names_${route.params.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  exportOpen.value = false;
}

async function assignOne(u) {
  const guestId = pending[u.stagedPath];
  if (!guestId) return;
  try {
    await assignStagedCard(route.params.id, u.stagedPath, guestId);
    toast.success('Assigned');
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function discardOne(u) {
  try {
    await discardStagedCard(route.params.id, u.stagedPath);
    unmatched.value = unmatched.value.filter((x) => x.stagedPath !== u.stagedPath);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function download(m) {
  busy[m.guestId] = true;
  try {
    const ext = (m.cardImagePath || '').split('.').pop() || 'png';
    await downloadCard(route.params.id, m.guestId, `${m.memberId || m.guestId}.${ext}`);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { delete busy[m.guestId]; }
}

async function removeOne(m) {
  if (!window.confirm(`Delete card for ${m.name}? This can't be undone.`)) return;
  busy[m.guestId] = true;
  try {
    await removeGuestCard(route.params.id, m.guestId);
    matched.value = matched.value.filter((x) => x.guestId !== m.guestId);
    delete thumbs[m.guestId];
    toast.success('Card deleted');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { delete busy[m.guestId]; }
}

onMounted(refresh);
</script>