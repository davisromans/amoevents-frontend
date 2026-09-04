<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <router-link :to="`/app/events/${route.params.id}/cards/variants`" class="btn-ghost !text-sm !px-2 !py-1 mb-1">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Back to variants
    </router-link>
    <div class="flex items-end justify-between gap-3 mb-1">
      <h1 class="section-title text-2xl">Templates library</h1>
      <div class="flex gap-2">
        <label class="btn-secondary !text-sm cursor-pointer">
          <input type="file" accept=".psd" class="hidden" @change="onImportPsd" />
          {{ importing ? 'Importing…' : 'Import your own PSD' }}
        </label>
        <button class="btn-primary !text-sm" :disabled="creatingBlank" @click="createBlank">
          {{ creatingBlank ? 'Creating…' : 'Start from scratch' }}
        </button>
      </div>
    </div>
    <p class="text-subtext mb-5">
      Pick a design from our shared library — templates marked <span class="chip-success !text-2xs">Editable</span>
      clone into this event as your own copy you can customize (text, artwork, QR position). Or import your own
      PSD design, or start blank — either way, your edits are yours alone; nothing you change here touches the
      shared library.
    </p>

    <div class="flex flex-col sm:flex-row gap-2 mb-4">
      <div class="inline-flex items-center gap-1 p-1 rounded-2xl surface-inset flex-wrap">
        <button v-for="c in CATEGORIES" :key="c.value"
                class="px-3 py-1.5 rounded-xl text-sm font-bold transition"
                :class="category === c.value
                  ? 'bg-gradient-gold text-surface-charcoal shadow-gold-soft'
                  : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'"
                @click="category = c.value">{{ c.label }}</button>
      </div>
      <div class="relative flex-1 max-w-xs">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate" />
        <input v-model="search" type="search" placeholder="Search…" class="field-input !pl-9 w-full" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <EmptyState v-else-if="!items.length" title="No templates in this category" description="Try a different category or upload your own variant." />

    <EmptyState v-else-if="!filtered.length" title="No templates match" description="Try a different search term." />

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <button v-for="tpl in filtered" :key="tpl._id"
              class="surface-card p-2 text-left hover:shadow-gold-soft transition group relative"
              @click="pick(tpl)">
        <span v-if="tpl.sourceType === 'document'" class="chip-success !text-2xs absolute top-3 right-3 z-10">Editable</span>
        <div class="aspect-[3/4] rounded-lg overflow-hidden bg-surface-mist dark:bg-surface-fog mb-2">
          <img :src="tpl.imageUrl" alt="" class="w-full h-full object-cover" />
        </div>
        <p class="text-heading truncate">{{ tpl.name }}</p>
        <p class="text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash">{{ tpl.category.replaceAll('_', ' ') }}</p>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import * as api from '@/services/cardTemplates.service';
import * as variantApi from '@/services/cardVariants.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'send_off', label: 'Send-off' },
  { value: 'kitchen_party', label: 'Kitchen party' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'other', label: 'Other' },
];

const route = useRoute();
const router = useRouter();
const toast = useToast();
const category = ref('');
const items = ref([]);
const loading = ref(true);
const search = ref('');
const filtered = computed(() => items.value.filter((t) => !search.value || t.name.toLowerCase().includes(search.value.toLowerCase())));

async function load() {
  loading.value = true;
  try { items.value = await api.listTemplates(category.value || undefined); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

watch(category, load);
onMounted(load);

async function pick(tpl) {
  if (!(await askConfirm(`Clone "${tpl.name}" into this event as a new variant?`))) return;
  try {
    const variant = await api.cloneTemplate(tpl._id, route.params.id);
    toast.success('Cloned to your event');
    // A 'document' template clones into an equally-editable CardVariant —
    // send them straight into the Studio to customize it (text, artwork,
    // QR position) instead of back to the flat variants grid, where the
    // only lever for a document-type card is the old flat-image QR sliders.
    if (variant.sourceType === 'document') {
      router.push(`/studio/variants/${route.params.id}/${variant._id}`);
    } else {
      router.push(`/app/events/${route.params.id}/cards/variants`);
    }
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

const importing = ref(false);
async function onImportPsd(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  importing.value = true;
  try {
    const variant = await variantApi.importVariantPsd(route.params.id, file, {});
    const fm = variant.fontMatch;
    if (fm?.unmatched?.length) {
      toast.error(`Imported, but couldn't find a matching font for: ${fm.unmatched.join(', ')} — upload it manually from the font picker.`);
    } else {
      toast.success('Imported — opening in the editor');
    }
    router.push(`/studio/variants/${route.params.id}/${variant._id}`);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { importing.value = false; }
}

const creatingBlank = ref(false);
async function createBlank() {
  creatingBlank.value = true;
  try {
    const variant = await variantApi.createBlankVariant(route.params.id, { name: 'Untitled card' });
    router.push(`/studio/variants/${route.params.id}/${variant._id}`);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { creatingBlank.value = false; }
}
</script>
