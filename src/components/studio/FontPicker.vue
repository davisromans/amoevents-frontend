<template>
  <div class="relative">
    <button class="field-input !py-1.5 !text-xs w-full text-left flex items-center justify-between" @click="open = !open">
      <span :style="{ fontFamily: modelValue }" class="truncate">{{ modelValue || 'Choose a font' }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 shrink-0 text-surface-slate dark:text-surface-ash" />
    </button>

    <div v-if="open" class="absolute z-30 mt-1 w-72 max-h-80 surface-card shadow-card p-2 flex flex-col gap-2">
      <div v-if="requiredFamily && requiredAvailable === false" class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-2xs text-amber-800 dark:text-amber-200">
        <p class="font-bold">Missing original PSD font</p>
        <p class="mt-0.5">Upload “{{ requiredFamily }}” to make this text match the source design.</p>
        <button class="mt-1.5 font-bold underline" @click="openRequiredUpload">Import matching font</button>
      </div>
      <input v-model="q" type="text" placeholder="Search fonts…" class="field-input !py-1.5 !text-xs" autofocus />
      <div class="flex gap-1 overflow-x-auto hide-scrollbar">
        <button v-for="c in CATEGORIES" :key="c.value"
                class="px-2 py-1 rounded-md text-2xs font-bold whitespace-nowrap"
                :class="category === c.value ? 'bg-brand-primary-glow text-brand-primary-deep' : 'text-surface-slate dark:text-surface-ash'"
                @click="category = c.value">
          {{ c.label }}
        </button>
      </div>

      <div class="overflow-y-auto flex-1">
        <p v-if="filteredActive.length" class="text-2xs font-bold text-surface-slate dark:text-surface-ash px-1 pt-1">Your roster</p>
        <button v-for="f in filteredActive" :key="'active-' + f.family"
                class="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 text-sm"
                :style="{ fontFamily: f.family }"
                @click="choose(f.family)">
          {{ f.family }}
        </button>

        <p v-if="filteredCatalog.length" class="text-2xs font-bold text-surface-slate dark:text-surface-ash px-1 pt-2">
          Google Fonts — tap to add & use
        </p>
        <button v-for="f in filteredCatalog" :key="'catalog-' + f.family"
                class="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 text-sm flex items-center justify-between"
                @click="addAndChoose(f.family)">
          <span :style="{ fontFamily: f.family }">{{ f.family }}</span>
          <PlusCircleIcon class="w-3.5 h-3.5 text-surface-slate dark:text-surface-ash shrink-0" />
        </button>
      </div>

      <div class="border-t border-surface-mist dark:border-surface-fog pt-2">
        <label class="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 text-2xs font-bold flex items-center gap-1.5 cursor-pointer"
               :class="{ 'pointer-events-none opacity-60': uploading }">
          <ArrowUpTrayIcon class="w-3.5 h-3.5 shrink-0" />
          {{ uploading ? 'Reading and importing fonts…' : 'Import font files…' }}
          <input ref="fontFileRef" type="file" multiple accept=".ttf,.otf,.woff,.woff2" class="hidden" @change="onFontFilesChosen" />
        </label>
        <p class="px-2 text-[10px] leading-tight text-surface-slate dark:text-surface-ash">
          Select one font or a whole family. Name, weight and italic style are read automatically from every file.
        </p>
        <p v-if="uploadMessage" class="px-2 mt-1 text-2xs text-emerald-600 dark:text-emerald-400">{{ uploadMessage }}</p>
        <p v-if="uploadError" class="px-2 mt-1 text-2xs text-red-500 whitespace-pre-line">{{ uploadError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronDownIcon, PlusCircleIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline';
import { listFonts, searchGoogleCatalog, addGoogleFont, uploadFontVariant, uploadFontFiles, getFontsByFamilies } from '@/services/fonts.service';
import { apiErrorMessage } from '@/services/http';
import { loadFont, loadGoogleFont } from '@/utils/fontLoader';

const props = defineProps({
  modelValue: { type: String, default: '' },
  requiredFamily: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

const CATEGORIES = [
  { value: '', label: 'All' }, { value: 'serif', label: 'Serif' }, { value: 'sans-serif', label: 'Sans' },
  { value: 'display', label: 'Display' }, { value: 'handwriting', label: 'Script' }, { value: 'monospace', label: 'Mono' },
];

const open = ref(false);
const q = ref('');
const category = ref('');
const active = ref([]);
const catalog = ref([]);

const uploadError = ref('');
const uploadMessage = ref('');
const uploading = ref(false);
const fontFileRef = ref(null);
const requiredAvailable = ref(null);
let pendingFamilyHint = '';
const SYSTEM_FONTS = new Set(['arial', 'helvetica', 'times new roman', 'georgia', 'courier new', 'verdana', 'trebuchet ms', 'system-ui', 'sans-serif', 'serif', 'monospace']);

function openRequiredUpload() {
  pendingFamilyHint = props.requiredFamily;
  fontFileRef.value?.click();
}

async function checkRequiredFamily() {
  if (!props.requiredFamily) { requiredAvailable.value = null; return; }
  if (SYSTEM_FONTS.has(props.requiredFamily.toLowerCase())) { requiredAvailable.value = true; return; }
  try {
    const rows = await getFontsByFamilies([props.requiredFamily]);
    const wanted = props.requiredFamily.toLowerCase();
    requiredAvailable.value = rows.some((row) => row.family?.toLowerCase() === wanted
      || (row.aliases || []).some((alias) => alias.toLowerCase() === wanted));
  } catch { requiredAvailable.value = null; }
}

async function onFontFilesChosen(event) {
  const files = [...(event.target.files || [])];
  event.target.value = '';
  if (!files.length || uploading.value) return;
  uploadError.value = '';
  uploadMessage.value = '';
  uploading.value = true;
  try {
    let imported;
    let failed = [];
    if (pendingFamilyHint && files.length === 1) {
      imported = [await uploadFontVariant(files[0], { family: pendingFamilyHint })];
    } else {
      const result = await uploadFontFiles(files);
      imported = result.fonts || [];
      failed = result.failed || [];
    }
    await Promise.allSettled(imported.map((font) => loadFont(font)));
    await refreshActive();
    const importedNames = imported.map((font) => font.family);
    uploadMessage.value = `${imported.length} font file${imported.length === 1 ? '' : 's'} imported${importedNames.length ? `: ${importedNames.join(', ')}` : ''}.`;
    if (failed.length) uploadError.value = failed.map((item) => `${item.fileName}: ${item.error}`).join('\n');
    if (pendingFamilyHint && imported.length) {
      requiredAvailable.value = true;
      choose(pendingFamilyHint);
    } else if (imported.length === 1) {
      choose(imported[0].family);
    }
  } catch (err) {
    uploadError.value = apiErrorMessage(err) || 'The selected font files could not be imported.';
  } finally {
    pendingFamilyHint = '';
    uploading.value = false;
  }
}

// Roster search now happens server-side (q/category/limit) — with 1,500+
// fonts in the roster after the bulk import, fetching everything on every
// open just to filter it in the browser meant a huge unfiltered payload
// AND, per the font-loading watch below, hundreds of unwanted font-file
// fetches. `active` here is already exactly what should be listed.
async function refreshActive() {
  active.value = await listFonts({ q: q.value || undefined, category: category.value || undefined, limit: 40 });
}
async function refreshCatalog() {
  catalog.value = await searchGoogleCatalog({ category: category.value || undefined, q: q.value || undefined });
}

const activeFamilies = computed(() => new Set(active.value.map((f) => f.family)));
const filteredCatalog = computed(() => catalog.value.filter((f) => !activeFamilies.value.has(f.family)).slice(0, 40));
const filteredActive = active;

watch([q, category], () => { refreshActive(); refreshCatalog(); });
watch(() => props.requiredFamily, checkRequiredFamily, { immediate: true });
// Preview each catalog font in its own real typeface, not just its name —
// otherwise "Script" and "Display" fonts are indistinguishable from the
// default UI font until you've already added one. Loading is cheap (CSS
// only, glyphs fetch lazily) and doesn't add the font to anyone's roster.
watch(filteredCatalog, (list) => { list.forEach((f) => loadGoogleFont(f.family)); }, { immediate: true });
// Same reasoning as the catalog watch above, and now load-bearing rather
// than just tidy: `loadFont()` calls FontFace#load(), which actively
// fetches the font file over the network (unlike a passive CSS @font-face
// declaration). Preloading the FULL roster used to mean a handful of
// requests; with the 1,500+-family bulk font import it would mean ~1,900
// concurrent font-file fetches every time this picker opens. Loading only
// the currently-filtered/visible rows keeps this at (at most) a couple
// hundred, same cap as the catalog list.
watch(filteredActive, (list) => { list.forEach((f) => loadFont(f)); }, { immediate: true });

function choose(family) {
  emit('update:modelValue', family);
  open.value = false;
}

async function addAndChoose(family) {
  await loadGoogleFont(family);
  await addGoogleFont(family).catch(() => {}); // best-effort roster registration; font already loaded either way
  await refreshActive();
  choose(family);
}

onMounted(() => { refreshActive(); refreshCatalog(); });
</script>
