<template>
  <div class="relative">
    <button class="field-input !py-1.5 !text-xs w-full text-left flex items-center justify-between" @click="open = !open">
      <span :style="{ fontFamily: modelValue }" class="truncate">{{ modelValue || 'Choose a font' }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 shrink-0 text-surface-slate dark:text-surface-ash" />
    </button>

    <div v-if="open" class="absolute z-30 mt-1 w-72 max-h-80 surface-card shadow-card p-2 flex flex-col gap-2">
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronDownIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';
import { listFonts, searchGoogleCatalog, addGoogleFont } from '@/services/fonts.service';
import { loadFont, loadGoogleFont } from '@/utils/fontLoader';

const props = defineProps({ modelValue: { type: String, default: '' } });
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
