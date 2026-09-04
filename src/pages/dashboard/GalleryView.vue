<template>
  <PageShell
    title="Gallery"
    :crumbs="[{ label: 'Events', to: '/app/events' }, { label: 'Event', to: `/app/events/${route.params.id}` }, { label: 'Gallery' }]"
  >
    <template #actions>
      <Button variant="secondary" @click="openNewAlbum">
        <template #leading><FolderPlusIcon class="w-4 h-4" /></template>
        New folder
      </Button>
      <Button variant="secondary" @click="copyShareLink">
        <template #leading><LinkIcon class="w-4 h-4" /></template>
        {{ shareCopied ? 'Copied!' : 'Share' }}
      </Button>
      <label class="btn-primary cursor-pointer !py-2 !px-4">
        <ArrowUpTrayIcon class="w-4 h-4" />
        <span>{{ uploading ? `Uploading ${uploadedCount}/${totalCount}…` : 'Upload' }}</span>
        <input type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm"
               class="hidden" :disabled="uploading" @change="onPick" />
      </label>
    </template>

    <!-- Upload progress bar — spans the width while active, hides otherwise. -->
    <div v-if="uploading" class="mb-6 rounded-2xl bg-brand-primary-glow border border-brand-primary/20 p-4">
      <div class="flex items-center justify-between text-sm font-bold text-surface-charcoal dark:text-surface-bone mb-2">
        <span>Uploading {{ uploadedCount }} of {{ totalCount }}</span>
        <span class="tabular-nums text-brand-primary-deep dark:text-brand-primary-soft">{{ uploadPct }}%</span>
      </div>
      <Progress :value="uploadPct" :max="100" size="md" tone="primary" />
      <p v-if="currentBatchProgress != null" class="text-xs text-surface-slate dark:text-surface-ash mt-2">
        Current batch: {{ currentBatchProgress }}% of {{ formatBytes(currentBatchTotal) }}
      </p>
    </div>

    <!-- Two-column layout — album tabs + settings side card -->
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
      <div class="min-w-0">
        <!-- Album tabs — the primary in-page nav. -->
        <div class="mb-4 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button type="button"
                  :class="[
                    'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-fast',
                    !selectedAlbumId
                      ? 'bg-gradient-primary text-white shadow-primary-soft'
                      : 'bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash hover:border-brand-primary/40'
                  ]"
                  @click="selectAlbum(null)">
            <PhotoIcon class="w-4 h-4" />
            All items
            <span class="text-2xs opacity-70 tabular-nums">{{ totalCount_all }}</span>
          </button>
          <button v-for="a in albums" :key="a._id" type="button"
                  :class="[
                    'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-fast',
                    selectedAlbumId === a._id
                      ? 'bg-gradient-primary text-white shadow-primary-soft'
                      : 'bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash hover:border-brand-primary/40'
                  ]"
                  @click="selectAlbum(a._id)">
            <FolderIcon class="w-4 h-4" />
            {{ a.name }}
            <span class="text-2xs opacity-70 tabular-nums">{{ a.itemCount }}</span>
          </button>
        </div>

        <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

        <EmptyState v-else-if="!photos.length"
                    title="Nothing here yet"
                    :description="selectedAlbumId
                      ? 'This folder is empty. Upload photos or videos to fill it.'
                      : 'Drop pre-wedding shots, event-day photos, and edited videos your guests will love. Max 3 GB per event.'">
          <template #icon><PhotoIcon class="w-7 h-7" /></template>
          <template #actions>
            <label class="btn-primary cursor-pointer">
              <ArrowUpTrayIcon class="w-4 h-4" />
              Upload first item
              <input type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm"
                     class="hidden" @change="onPick" />
            </label>
          </template>
        </EmptyState>

        <!-- Uniform grid — every tile is the same aspect-square size
             (GalleryTile.vue), photos and videos alike, so the wall reads
             as one consistent grid instead of masonry columns where a
             tall photo next to a 16:9 video looked mismatched. -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <GalleryTile v-for="(p, i) in photos" :key="p._id"
                       :item="p"
                       @open="openViewer(i)"
                       @delete="onDelete(p)" />
        </div>
      </div>

      <!-- Settings side rail: storage + PIN + expiry + billing. Sticky
           so the settings stay in reach while scrolling long galleries. -->
      <aside class="space-y-4 lg:sticky lg:top-4 self-start">
        <!-- Storage usage -->
        <Card v-if="usage">
          <SectionHeader title="Storage" level="subsection" />
          <div class="flex items-baseline justify-between gap-2 mb-2">
            <p class="text-xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums">{{ formatBytes(usage.usedBytes) }}</p>
            <span :class="['text-2xs uppercase font-black tracking-widest',
                           pct > 90 ? 'text-state-danger'
                             : pct > 70 ? 'text-state-warning'
                             : 'text-brand-primary-deep dark:text-brand-primary-soft']">{{ pct }}%</span>
          </div>
          <Progress :value="pct" :max="100" size="sm"
                    :tone="pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'primary'" />
          <p class="text-2xs text-surface-slate dark:text-surface-ash mt-2">
            of {{ formatBytes(usage.quotaBytes) }} · {{ photos.length }} item{{ photos.length === 1 ? '' : 's' }}
          </p>
        </Card>

        <!-- PIN protection -->
        <Card>
          <SectionHeader title="Access" level="subsection">
            <template #actions>
              <Badge size="sm" :tone="pinProtected ? 'success' : 'neutral'">
                {{ pinProtected ? 'PIN required' : 'Open' }}
              </Badge>
            </template>
          </SectionHeader>
          <p class="text-sm text-surface-slate dark:text-surface-ash mb-3">
            {{ pinProtected
              ? 'Guests must enter this PIN to view photos.'
              : 'Add a 4–6 digit PIN so only guests you share it with can view.' }}
          </p>
          <div class="flex items-center gap-2">
            <input v-model="pinValue" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                   placeholder="4–6 digits"
                   class="field-input !py-2 !text-center !tracking-widest !font-black flex-1" />
            <Button variant="secondary" size="sm" :disabled="pinBusy || pinValue.length < 4" @click="setPin(pinValue)">
              {{ pinProtected ? 'Change' : 'Set PIN' }}
            </Button>
          </div>
          <button v-if="pinProtected" type="button"
                  class="mt-2 text-xs font-bold text-state-danger hover:underline"
                  :disabled="pinBusy" @click="setPin(null)">Remove PIN</button>
        </Card>

        <!-- Expiration -->
        <Card>
          <SectionHeader title="Expiration" level="subsection" />
          <p class="text-sm text-surface-slate dark:text-surface-ash mb-3">
            After this date guests see "gallery expired". Leave empty for no expiry.
          </p>
          <div class="flex items-center gap-2">
            <input type="date" v-model="expiryDate" class="field-input !py-2 flex-1 !text-sm" />
            <Button variant="secondary" size="sm" :loading="savingExpiry" @click="saveExpiry">Save</Button>
          </div>
        </Card>

        <!-- Storage billing status — from event.gallery.* -->
        <Card v-if="storageStatus">
          <SectionHeader :title="storageStatus.title" level="subsection">
            <template #actions>
              <BanknotesIcon class="w-4 h-4 text-brand-primary-deep dark:text-brand-primary-soft" />
            </template>
          </SectionHeader>
          <p class="text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ storageStatus.detail }}</p>
        </Card>
      </aside>
    </div>

    <!-- New album modal -->
    <Modal v-model="newAlbumOpen" title="Create folder" :max-width="440">
      <div class="space-y-4">
        <Field label="Folder name" required>
          <template #default="{ id }">
            <TextInput v-model="newAlbumName" :id="id" placeholder="e.g. Pre-wedding" />
          </template>
        </Field>
        <Field label="Type" help="Just a label — helps guests find what they're looking for.">
          <template #default="{ id }">
            <Select v-model="newAlbumKind" :id="id" :options="[
              { value: 'pre_wedding', label: 'Pre-wedding' },
              { value: 'wedding_day', label: 'Wedding day' },
              { value: 'edited', label: 'Edited' },
              { value: 'custom', label: 'Custom' },
            ]" />
          </template>
        </Field>
      </div>
      <template #footer>
        <Button variant="secondary" @click="newAlbumOpen = false">Cancel</Button>
        <Button variant="primary" :loading="creatingAlbum" @click="createAlbum">Create</Button>
      </template>
    </Modal>

    <!-- Full-screen viewer — extracted component, reusable on public gallery too -->
    <GalleryViewer :items="photos" v-model:index="viewerIndex" @close="viewerIndex = null" />
  </PageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute } from 'vue-router';
import {
  PhotoIcon, ArrowUpTrayIcon, LockClosedIcon, LinkIcon,
  FolderPlusIcon, FolderIcon, BanknotesIcon,
} from '@heroicons/vue/24/outline';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import GalleryTile from '@/components/gallery/GalleryTile.vue';
import GalleryViewer from '@/components/gallery/GalleryViewer.vue';
import {
  listGalleryPhotos, uploadGalleryPhotos, deleteGalleryPhoto,
  getGalleryPinStatus, setGalleryPin, getGalleryShareUrl,
  listGalleryAlbums, createGalleryAlbum,
} from '@/services/gallery.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { Badge, Button, Card, EmptyState, Field, Modal, Progress, SectionHeader, Select, TextInput } from '@/components/ui';

const route = useRoute();
const toast = useToast();

const photos = ref([]);
const albums = ref([]);
const selectedAlbumId = ref(null);
const usage = ref(null);
const loading = ref(true);

// ── Upload state — a real progress bar, not just a spinner. Two levels:
// the outer bar tracks completed files across all batches; the inner
// hint shows bytes progress for the batch currently in flight. -----
const uploading = ref(false);
const uploadedCount = ref(0);
const totalCount = ref(0);
const currentBatchProgress = ref(null);
const currentBatchTotal = ref(0);
const uploadPct = computed(() => totalCount.value ? Math.round((uploadedCount.value / totalCount.value) * 100) : 0);

// "All items" tab count. Summing each album's itemCount underCOUNTS this —
// it silently excludes unfiled items (photos that aren't in any album),
// which is the common case for a gallery with no folders yet, and is
// exactly why this read 0 with 2 real unfiled items loaded. When viewing
// "All items" the request already loads every item (albumId=null), so
// photos.length IS the true total; only fall back to the per-album sum
// while some OTHER album is selected (photos.value then only holds that
// album's items).
const totalCount_all = computed(() =>
  selectedAlbumId.value === null
    ? photos.value.length
    : (albums.value || []).reduce((sum, a) => sum + (a.itemCount || 0), 0)
);

// ── Album management ---------------------------------------------------
const newAlbumOpen = ref(false);
const newAlbumName = ref('');
const newAlbumKind = ref('custom');
const creatingAlbum = ref(false);
function openNewAlbum() {
  newAlbumName.value = '';
  newAlbumKind.value = 'custom';
  newAlbumOpen.value = true;
}
async function createAlbum() {
  if (!newAlbumName.value.trim()) return;
  creatingAlbum.value = true;
  try {
    await createGalleryAlbum(route.params.id, { name: newAlbumName.value.trim(), kind: newAlbumKind.value });
    newAlbumOpen.value = false;
    await loadAlbums();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { creatingAlbum.value = false; }
}
async function loadAlbums() {
  try { albums.value = await listGalleryAlbums(route.params.id); } catch (_) { /* silent */ }
}
function selectAlbum(id) { selectedAlbumId.value = id; refresh(); }

// ── Sharing ------------------------------------------------------------
const shareCopied = ref(false);
async function copyShareLink() {
  try {
    const { url } = await getGalleryShareUrl(route.params.id, selectedAlbumId.value);
    await navigator.clipboard.writeText(url);
    shareCopied.value = true;
    toast.success(selectedAlbumId.value ? 'Folder link copied' : 'Gallery link copied — paste into WhatsApp, SMS, or anywhere');
    setTimeout(() => { shareCopied.value = false; }, 2000);
  } catch { toast.error('Could not copy link'); }
}

// ── PIN / expiry / storage billing ------------------------------------
const pinProtected = ref(false);
const pinValue = ref('');
const pinBusy = ref(false);
const expiryDate = ref('');
const savingExpiry = ref(false);
const storageStatus = ref(null);
function formatTzs(n) { return `TZS ${Number(n || 0).toLocaleString('en-US')}`; }
async function loadExpiry() {
  try {
    const { event } = await (await import('@/services/events.service')).getEvent(route.params.id);
    expiryDate.value = event.galleryExpiresAt ? String(event.galleryExpiresAt).slice(0, 10) : '';
    const g = event.gallery || {};
    if (g.storageBilledAt) {
      storageStatus.value = {
        title: 'Storage charged',
        detail: `${g.storageBilledGb?.toFixed(2) || '0'} GB · ${formatTzs(g.storageBilledTzs)} total charged so far — 5-year retention. New uploads are billed automatically as the gallery grows.`,
      };
    } else if (g.storageBillingFailedAt) {
      storageStatus.value = {
        title: 'Storage charge failed',
        detail: 'Insufficient wallet balance at settlement time — top up and it will retry automatically.',
      };
    } else {
      storageStatus.value = null;
    }
  } catch (_) { /* silent — page still works without settings */ }
}
async function saveExpiry() {
  savingExpiry.value = true;
  try {
    const { updateEvent } = await import('@/services/events.service');
    await updateEvent(route.params.id, { galleryExpiresAt: expiryDate.value || null });
    toast.success('Expiration saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingExpiry.value = false; }
}
async function setPin(v) {
  pinBusy.value = true;
  try {
    const r = await setGalleryPin(route.params.id, v);
    pinProtected.value = !!r.protected;
    pinValue.value = '';
    toast.success(pinProtected.value ? 'PIN set' : 'PIN removed');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { pinBusy.value = false; }
}

// ── Media & viewer ----------------------------------------------------
const pct = computed(() => usage.value ? Math.round(100 * usage.value.usedBytes / usage.value.quotaBytes) : 0);

function formatBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

async function refresh() {
  loading.value = true;
  try {
    const [r, pinStatus] = await Promise.all([
      listGalleryPhotos(route.params.id, selectedAlbumId.value),
      getGalleryPinStatus(route.params.id).catch(() => ({ protected: false })),
    ]);
    photos.value = r.photos;
    usage.value = r.usage;
    pinProtected.value = !!pinStatus.protected;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function onPick(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  uploading.value = true;
  totalCount.value = files.length;
  uploadedCount.value = 0;
  try {
    // Batch of 5 keeps memory pressure sane and lets the outer progress
    // bar tick in visible increments. Per-batch bytes progress is tracked
    // separately so users on slow uplinks get a live "% of this batch" hint.
    const batches = [];
    for (let i = 0; i < files.length; i += 5) batches.push(files.slice(i, i + 5));
    for (const batch of batches) {
      currentBatchTotal.value = batch.reduce((s, f) => s + f.size, 0);
      currentBatchProgress.value = 0;
      const r = await uploadGalleryPhotos(
        route.params.id, batch,
        (ev) => { currentBatchProgress.value = ev.total ? Math.round((ev.loaded / ev.total) * 100) : null; },
        selectedAlbumId.value,
      );
      uploadedCount.value += batch.length;
      if (r.rejected?.length) {
        for (const rj of r.rejected) {
          if (rj.reason === 'quota_exceeded') toast.error(`${rj.name}: over 3 GB event limit`);
          else toast.error(`${rj.name}: ${rj.reason}`);
        }
      }
    }
    toast.success(`${uploadedCount.value} item${uploadedCount.value === 1 ? '' : 's'} uploaded`);
    await Promise.all([refresh(), loadAlbums()]);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally {
    uploading.value = false;
    totalCount.value = 0;
    currentBatchProgress.value = null;
    e.target.value = '';
  }
}

async function onDelete(p) {
  if (!(await askConfirm('Delete this item?'))) return;
  try {
    await deleteGalleryPhoto(route.params.id, p._id);
    photos.value = photos.value.filter((x) => x._id !== p._id);
    await Promise.all([refresh(), loadAlbums()]);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

// Full-screen viewer — v-model:index shape.
const viewerIndex = ref(null);
function openViewer(i) { viewerIndex.value = i; }

onMounted(async () => {
  await Promise.all([refresh(), loadAlbums()]);
  loadExpiry();
});
</script>
