<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-end justify-end gap-3 mb-5">
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
      class="surface-inset p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer mb-6"
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

    <div v-if="result" class="space-y-5 animate-slide-up">
      <div class="grid grid-cols-2 gap-3">
        <SummaryTile label="Matched" :value="result.summary.matched" tone="success" />
        <SummaryTile label="Unmatched" :value="result.summary.unmatched" tone="warn" />
      </div>

      <section v-if="result.matched.length">
        <p class="section-eyebrow mb-2">Matched ({{ result.matched.length }})</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div v-for="m in result.matched" :key="m.guestId" class="surface-card p-2">
            <div class="aspect-[3/4] rounded-lg overflow-hidden bg-surface-mist dark:bg-surface-fog">
              <img v-if="thumbs[m.guestId]" :src="thumbs[m.guestId]" class="w-full h-full object-cover" />
            </div>
            <p class="text-heading mt-2 truncate">{{ m.name }}</p>
            <p class="text-2xs uppercase font-extrabold tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">{{ m.method }}</p>
          </div>
        </div>
      </section>

      <section v-if="result.unmatched.length">
        <p class="section-eyebrow mb-2">Needs assignment ({{ result.unmatched.length }})</p>
        <div class="space-y-2">
          <div v-for="u in result.unmatched" :key="u.stagedPath" class="surface-card p-3 flex items-center gap-3">
            <PhotoIcon class="w-5 h-5 text-surface-slate shrink-0" />
            <p class="flex-1 text-heading truncate">{{ u.originalFilename }}</p>
            <select
              class="field-input !py-1.5 !text-sm !w-56"
              v-model="pending[u.stagedPath]"
              @change="assignOne(u)"
            >
              <option value="">Assign to guest…</option>
              <option v-for="g in guestOptions" :key="g._id" :value="g._id">
                {{ g.firstName }} {{ g.lastName }} · {{ g.memberId }}
              </option>
            </select>
            <button class="btn-danger !text-sm !py-1.5 !px-3" @click="discardOne(u)">Discard</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { PhotoIcon } from '@heroicons/vue/24/outline';
import { bulkUploadCards, assignStagedCard, discardStagedCard, getCardUrl } from '@/services/cards.service';
import { listGuests } from '@/services/guests.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import SummaryTile from '@/components/events/EventStat.vue';

const route = useRoute();
const toast = useToast();

const dragging = ref(false);
const uploading = ref(false);
const progress = ref(0);
const result = ref(null);
const guestOptions = ref([]);
const pending = reactive({});
const thumbs = reactive({});

async function loadGuests() {
  try {
    const { items } = await listGuests(route.params.id, { limit: 500 });
    guestOptions.value = items;
  } catch (err) { toast.error(apiErrorMessage(err)); }
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
    result.value = res;
    toast.success(`${res.summary.matched} matched, ${res.summary.unmatched} need assignment`);
    // Fetch thumbnails for matched.
    for (const m of res.matched) {
      try { const { url } = await getCardUrl(route.params.id, m.guestId); thumbs[m.guestId] = url; } catch (_) { /* skip */ }
    }
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    uploading.value = false;
  }
}

async function assignOne(u) {
  const guestId = pending[u.stagedPath];
  if (!guestId) return;
  try {
    await assignStagedCard(route.params.id, u.stagedPath, guestId);
    result.value.unmatched = result.value.unmatched.filter((x) => x.stagedPath !== u.stagedPath);
    result.value.summary.matched += 1;
    result.value.summary.unmatched -= 1;
    toast.success('Assigned');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function discardOne(u) {
  try {
    await discardStagedCard(route.params.id, u.stagedPath);
    result.value.unmatched = result.value.unmatched.filter((x) => x.stagedPath !== u.stagedPath);
    result.value.summary.unmatched -= 1;
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(loadGuests);
</script>
