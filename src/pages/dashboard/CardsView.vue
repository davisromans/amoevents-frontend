<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="relative flex-1 min-w-[220px]">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate" />
        <input v-model="search" type="text" placeholder="Search cards by name, phone, memberId…"
               class="field-input !pl-9 !py-2 !text-sm w-full" />
      </div>
      <div class="flex gap-2">
        <router-link :to="`/app/events/${route.params.id}/cards/templates`" class="btn-primary !text-sm">
          Browse templates
        </router-link>
        <router-link :to="`/app/events/${route.params.id}/cards/variants`" class="btn-secondary !text-sm">
          Variants &amp; PDF
        </router-link>
      </div>
    </div>
    <p class="text-subtext mb-5">
      Filename should match <span class="chip">memberId</span>,
      <span class="chip">phone</span>, or <span class="chip">First Last</span>.
    </p>

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
        <span class="tabular-nums font-bold">{{ progress }}%</span>
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

const route = useRoute();
const toast = useToast();

const dragging = ref(false);
const uploading = ref(false);
const progress = ref(0);
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
  try {
    const res = await bulkUploadCards(route.params.id, files, (evt) => {
      if (evt.total) progress.value = Math.round((evt.loaded / evt.total) * 100);
    });
    toast.success(`${res.summary.matched} matched, ${res.summary.unmatched} need assignment`);
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { uploading.value = false; }
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