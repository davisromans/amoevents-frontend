<template>
  <PageShell title="Card templates library">
    <template #actions>
      <button class="btn-secondary" :disabled="importing || creatingBlank" @click="createBlank">
        <PlusIcon class="w-4 h-4" /> New from scratch
      </button>
      <button class="btn-secondary" :disabled="importing" @click="psdInput?.click()">
        <SparklesIcon class="w-4 h-4" /> Import PSD
      </button>
      <input ref="psdInput" type="file" accept=".psd" class="hidden" @change="importPsd" />
      <button class="btn-primary" @click="uploaderOpen = true">
        <ArrowUpTrayIcon class="w-4 h-4" /> Upload template
      </button>
    </template>

    <!-- PSD import progress bar — no separate loading text/spinner here,
         the app's own loading indicator already covers that. -->
    <div v-if="importing" class="surface-card p-3 mb-4">
      <div class="h-1.5 rounded-full surface-inset overflow-hidden">
        <div class="h-full bg-gradient-gold transition-all duration-500" :style="{ width: importProgress + '%' }" />
      </div>
    </div>

    <!-- Search & filter (Batch 24) — built to hold up at a library of hundreds -->
    <div v-if="!loading && items.length" class="flex flex-col sm:flex-row gap-2 mb-4">
      <div class="relative flex-1 max-w-md">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate" />
        <input v-model="search" type="search" placeholder="Search templates by name…" class="field-input !pl-9 w-full" />
      </div>
      <select v-model="categoryFilter" class="field-input sm:w-44">
        <option value="">All categories</option>
        <option v-for="c in CATEGORIES.filter(x => x.value)" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
      <div class="flex gap-1 p-1 rounded-xl surface-inset">
        <button v-for="t in TYPE_FILTERS" :key="t.value"
                class="px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap"
                :class="typeFilter === t.value ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1' : 'text-surface-slate dark:text-surface-ash'"
                @click="typeFilter = t.value">
          {{ t.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else-if="!items.length" class="surface-inset p-8 text-center">
      <p class="text-subtext">No templates yet.</p>
    </div>

    <div v-else-if="!filtered.length" class="surface-inset p-8 text-center">
      <p class="text-subtext">No templates match your filters.</p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div v-for="tpl in filtered" :key="tpl._id" class="surface-card p-2 animate-slide-up">
        <div class="aspect-[3/4] rounded-lg overflow-hidden bg-surface-mist dark:bg-surface-fog mb-2">
          <img :src="tpl.imageUrl" alt="" class="w-full h-full object-cover" />
        </div>
        <input v-model="tpl.name" class="w-full bg-transparent text-heading outline-none mb-1" @change="save(tpl)" />
        <select v-model="tpl.category" class="field-input !py-1 !text-xs mb-1" @change="save(tpl)">
          <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <label class="flex items-center gap-1.5 text-xs">
          <input type="checkbox" :checked="tpl.isActive" class="accent-brand-gold w-3.5 h-3.5"
                 @change="tpl.isActive = $event.target.checked; save(tpl)" />
          <span class="text-surface-charcoal dark:text-surface-bone">Active</span>
        </label>
        <span v-if="tpl.sourceType === 'document'" class="chip-success !text-2xs mt-1 inline-block">Editable</span>
        <div class="flex gap-1.5 mt-2">
          <button v-if="tpl.sourceType === 'document'" class="btn-ghost !text-xs !py-1 !px-2 flex-1"
                  @click="openStudio(tpl._id)">
            <PencilSquareIcon class="w-3 h-3" /> Edit
          </button>
          <button class="btn-danger !text-xs !py-1 !px-2 flex-1" @click="remove(tpl)">
            <TrashIcon class="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>

    <AppModal v-model="uploaderOpen" title="Upload card template" :maxWidth="480">
      <div class="space-y-3">
        <AppInput v-model="draft.name" label="Name" placeholder="e.g. Gold Wedding Elegant" />
        <div>
          <label class="field-label">Category</label>
          <select v-model="draft.category" class="field-input">
            <option v-for="c in CATEGORIES.filter(x => x.value)" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <label class="block">
          <span class="field-label">Image *</span>
          <input type="file" accept=".png,.jpg,.jpeg,.webp" @change="draft.file = $event.target.files[0]" />
          <span class="field-help">PNG · JPG · WEBP up to 25 MB. Portrait 3:4 recommended.</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="uploaderOpen = false">Cancel</button>
          <AppButton :loading="uploading" @click="upload">Upload</AppButton>
        </div>
      </div>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { ArrowUpTrayIcon, TrashIcon, SparklesIcon, PencilSquareIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/24/outline';
import * as api from '@/services/cardTemplates.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import AppModal from '@/components/common/AppModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PageShell from '@/components/shell/PageShell.vue';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'send_off', label: 'Send-off' },
  { value: 'kitchen_party', label: 'Kitchen party' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'other', label: 'Other' },
];

const toast = useToast();
const items = ref([]);
const loading = ref(true);
const uploaderOpen = ref(false);
const uploading = ref(false);
const draft = reactive({ name: '', category: 'wedding', file: null });
const psdInput = ref(null);
const importing = ref(false);
const importStage = ref('');
const importProgress = ref(0);
const creatingBlank = ref(false);

const search = ref('');
const categoryFilter = ref('');
const typeFilter = ref('');
const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'document', label: 'Editable' },
  { value: 'flat_image', label: 'Legacy image' },
];
const filtered = computed(() => items.value.filter((t) => {
  if (search.value && !t.name.toLowerCase().includes(search.value.toLowerCase())) return false;
  if (categoryFilter.value && t.category !== categoryFilter.value) return false;
  if (typeFilter.value && t.sourceType !== typeFilter.value) return false;
  return true;
}));

async function refresh() {
  loading.value = true;
  try { items.value = await api.adminList(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function upload() {
  if (!draft.file || !draft.name) { toast.error('Name and file required'); return; }
  uploading.value = true;
  try {
    await api.adminUpload(draft.file, { name: draft.name, category: draft.category });
    toast.success('Template uploaded');
    uploaderOpen.value = false;
    draft.name = ''; draft.category = 'wedding'; draft.file = null;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { uploading.value = false; }
}

async function importPsd(e) {
  const file = e.target.files?.[0];
  e.target.value = ''; // allow re-selecting the same file next time
  if (!file) return;

  importing.value = true;
  importProgress.value = 0;
  importStage.value = 'Uploading PSD…';
  try {
    const tpl = await api.adminImportPsd(
      file,
      { name: file.name.replace(/\.psd$/i, ''), category: 'wedding' },
      {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          importProgress.value = Math.min(pct, 95); // upload finishing != server work done
          if (pct >= 100) importStage.value = 'Uploaded — waiting for the server to start parsing…';
        },
        // The server now parses in the background (large PSDs can take
        // minutes — well past what one HTTP request through Cloudflare can
        // hold open), so progress past "uploaded" comes from polling its
        // job status rather than from the upload's own progress event.
        onStage: (stage) => { importStage.value = stage; },
      }
    );
    importProgress.value = 100;
    importStage.value = 'Done';
    const fm = tpl.fontMatch;
    if (fm?.unmatched?.length) {
      toast.error(`Imported, but couldn't find a matching font for: ${fm.unmatched.join(', ')} — upload it manually from the font picker.`);
    } else if (fm?.matched?.length) {
      toast.success(`Imported — matched ${fm.matched.length} font${fm.matched.length > 1 ? 's' : ''} automatically.`);
    } else {
      toast.success('Imported — opening in the Template Studio');
    }
    openStudio(tpl._id);
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    importing.value = false;
  }
}

async function createBlank() {
  creatingBlank.value = true;
  try {
    const tpl = await api.adminCreateBlank({ name: 'Untitled template', category: 'wedding' });
    openStudio(tpl._id);
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    creatingBlank.value = false;
  }
}

// The Studio is a standalone full-page route (no dashboard chrome) — opened
// in a new tab so the admin doesn't lose their place in the library grid,
// same as Photopea/Figma opening the editor as its own window.
function openStudio(id) {
  window.open(`/studio/templates/${id}`, '_blank');
}

async function save(tpl) {
  try {
    await api.adminUpdate(tpl._id, { name: tpl.name, category: tpl.category, isActive: tpl.isActive });
    toast.success('Saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function remove(tpl) {
  if (!(await askConfirm(`Delete "${tpl.name}"?`))) return;
  try {
    await api.adminDelete(tpl._id);
    items.value = items.value.filter((x) => x._id !== tpl._id);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(refresh);
</script>
