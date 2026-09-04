<template>
  <AppModal v-model="open" title="Smart import — PDF, CSV or Excel" :maxWidth="1280">
    <div class="space-y-4">
      <!-- Step 1: file drop -->
      <div v-if="step === 'drop'"
           class="surface-inset p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer"
           :class="dragging ? 'border-brand-gold bg-brand-gold-glow' : 'border-surface-mist dark:border-surface-fog hover:border-brand-gold'"
           @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false"
           @drop.prevent="onDrop" @click="$refs.fileEl.click()">
        <ArrowUpTrayIcon class="w-6 h-6 text-brand-gold-deep dark:text-brand-gold-soft mx-auto mb-2" />
        <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">Drop a PDF, CSV, or Excel file</p>
        <p class="text-xs text-surface-slate dark:text-surface-ash mt-1">
          Pledge sheets, contribution lists, guest lists — we'll detect names, phones, and pledge amounts.
        </p>
        <input ref="fileEl" type="file" accept=".pdf,.csv,.xlsx,.xlsm" class="hidden" @change="onPick" />
      </div>
      <div v-if="parsing" class="flex justify-center py-8"><LoadingSpinner label="Reading file…" /></div>
      <p v-if="error" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ error }}</p>

      <!-- Step 2: column mapping (CSV/Excel only — PDFs auto-map) -->
      <div v-if="step === 'map'" class="space-y-3">
        <p class="text-sm text-surface-slate dark:text-surface-ash">
          Match each column to a field. Columns left as "Ignore" are skipped.
        </p>
        <div class="max-h-[60vh] overflow-y-auto space-y-2">
          <div v-for="(h, i) in headers" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <span class="col-span-4 text-sm font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ h || `Column ${i+1}` }}</span>
            <select v-model="mapping[i]" class="col-span-5 field-input !py-1.5 !text-sm">
              <option value="">Ignore</option>
              <option v-for="f in FIELD_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
            <span class="col-span-3 text-2xs text-surface-slate dark:text-surface-ash truncate">
              e.g. {{ sampleValue(i) }}
            </span>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="step = 'drop'">Back</button>
          <AppButton @click="buildWorkingRows">Continue</AppButton>
        </div>
      </div>

      <!-- Step 3: preview + edit + transforms -->
      <div v-if="step === 'preview'" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-bold text-surface-charcoal dark:text-surface-bone">
            {{ rows.length }} rows ready — {{ rows.filter(r => r.phone).length }} with phone,
            {{ rows.filter(r => !r.phone).length }} without (still imported, addable later)
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span class="text-2xs text-surface-slate dark:text-surface-ash self-center mr-1">Name case:</span>
            <button class="chip !text-2xs" @click="applyCaseToAll('upper')">UPPER</button>
            <button class="chip !text-2xs" @click="applyCaseToAll('title')">Title Case</button>
            <button class="chip !text-2xs" @click="applyCaseToAll('lower')">lower</button>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-1.5 px-1">
          <span class="col-span-1 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">#</span>
          <span class="col-span-2 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">First name</span>
          <span class="col-span-2 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Last name</span>
          <span class="col-span-2 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Phone</span>
          <span class="col-span-2 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Pledged</span>
          <span class="col-span-2 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Paid (remaining shown below)</span>
          <span class="col-span-1"></span>
        </div>
        <div class="max-h-[55vh] overflow-y-auto space-y-2">
          <div v-for="(r, i) in rows" :key="i" class="grid grid-cols-12 gap-2 items-center surface-inset p-3 rounded-lg">
            <span class="col-span-1 text-2xs text-surface-slate dark:text-surface-ash text-center tabular-nums">{{ i + 1 }}</span>
            <input v-model="r.firstName" placeholder="First name" class="col-span-2 field-input !py-1 !text-sm" />
            <input v-model="r.lastName" placeholder="Last name" class="col-span-2 field-input !py-1 !text-sm" />
            <input v-model="r.phone" placeholder="Phone" class="col-span-2 field-input !py-1 !text-sm" />
            <input v-model.number="r.pledgeAmount" type="number" placeholder="Pledged" class="col-span-2 field-input !py-1 !text-sm" />
            <div class="col-span-2">
              <input v-model.number="r.pledgeReceived" type="number" placeholder="Paid" class="field-input !py-1 !text-sm w-full" />
              <p class="text-2xs text-surface-slate dark:text-surface-ash mt-0.5">
                Remaining: {{ Math.max(0, (r.pledgeAmount || 0) - (r.pledgeReceived || 0)).toLocaleString() }}
              </p>
            </div>
            <button class="col-span-1 text-red-500 hover:text-red-700 flex justify-center" @click="rows.splice(i, 1)"><TrashIcon class="w-4 h-4" /></button>
          </div>
        </div>

        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="rememberLayout" class="accent-brand-gold w-4 h-4" />
          <span class="text-sm text-surface-charcoal dark:text-surface-bone">
            Save this layout for this event — next upload of an updated sheet applies it automatically
          </span>
        </label>

        <p v-if="commitError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ commitError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="reset">Start over</button>
          <AppButton :loading="committing" @click="doCommit">Import {{ rows.length }} guests</AppButton>
        </div>
      </div>

      <!-- Step 4: result -->
      <div v-if="step === 'done'" class="text-center space-y-3 py-4">
        <CheckCircleIcon class="w-10 h-10 text-emerald-500 mx-auto" />
        <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">
          {{ result.created }} created · {{ result.updated }} updated
          <span v-if="result.skipped">· {{ result.skipped }} skipped (blank name)</span>
        </p>
        <AppButton @click="finish">Done</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref } from 'vue';
import { ArrowUpTrayIcon, TrashIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import AppModal from '@/components/common/AppModal.vue';
import AppButton from '@/components/common/AppButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { parseImportFile, getSavedLayout, commitImport } from '@/services/smartImport.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const props = defineProps({ eventId: { type: String, required: true } });
const emit = defineEmits(['imported']);
const toast = useToast();

const open = defineModel('open', { type: Boolean, default: false });

const FIELD_OPTIONS = [
  { value: 'fullName', label: 'Full name (auto-split)' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'phone', label: 'Phone' },
  { value: 'pledgeAmount', label: 'Pledged amount' },
  { value: 'pledgeReceived', label: 'Amount paid' },
];

const step = ref('drop'); // drop | map | preview | done
const dragging = ref(false);
const parsing = ref(false);
const error = ref('');
const committing = ref(false);
const commitError = ref('');
const rememberLayout = ref(false);
const result = ref({});

const headers = ref([]);
const rawRows = ref([]);
const mapping = ref({});
const rows = ref([]);

// Titles/honorifics common on these sheets — kept glued to the given name
// instead of being peeled off as a standalone "first name" on their own.
// "MR & MRS" style entries span 2-3 tokens ("MR", "&"/"AND", "MRS"), so the
// title run is walked token-by-token rather than matched as one word.
const NAME_TITLES = new Set(['MR', 'MRS', 'MR&MRS', 'DR', 'MISS', 'MS', 'PROF', 'BIBI', 'MAMA', 'REV', 'SHEIKH', 'FAMILIA']);
function isTitleToken(w) {
  const norm = String(w || '').toUpperCase().replace(/\./g, '');
  return norm === '&' || norm === 'AND' || norm === 'YA' || NAME_TITLES.has(norm);
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };

  let titleLen = 0;
  while (titleLen < parts.length - 1 && isTitleToken(parts[titleLen])) titleLen += 1;
  const rest = parts.slice(titleLen);

  if (rest.length <= 1) {
    // Title(s) plus at most one more word ("MRS. SHINE", "MR&MRS MWAKASENDILE")
    // — no separate given name to pull out, keep the whole thing together.
    return { firstName: parts.join(' '), lastName: '' };
  }
  // Title(s) + given name(s) + surname: last word is the surname, everything
  // before it (title included) stays together as the first name.
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function onDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
}
function onPick(e) {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
  e.target.value = '';
}

async function handleFile(file) {
  error.value = ''; parsing.value = true;
  try {
    const parsed = await parseImportFile(props.eventId, file);
    if (parsed.sourceType === 'pdf-pledge-sheet') {
      rows.value = parsed.rows.map((r) => {
        const { firstName, lastName } = splitName(r.fullName);
        return { firstName, lastName, phone: r.phone || '', pledgeAmount: r.pledgeAmount || 0, pledgeReceived: r.pledgeReceived || 0 };
      });
      step.value = 'preview';
    } else {
      headers.value = parsed.headers || [];
      rawRows.value = parsed.rows || [];
      const saved = await getSavedLayout(props.eventId).catch(() => null);
      mapping.value = (saved?.headers?.length === headers.value.length) ? { ...saved.mapping } : { ...(parsed.suggestedMapping || {}) };
      step.value = 'map';
    }
  } catch (err) { error.value = apiErrorMessage(err); }
  finally { parsing.value = false; }
}

function sampleValue(i) {
  const h = headers.value[i];
  const row = rawRows.value[0];
  if (!row) return '—';
  return String(row[h] ?? '').slice(0, 20) || '—';
}

function buildWorkingRows() {
  rows.value = rawRows.value.map((raw) => {
    const out = { firstName: '', lastName: '', phone: '', pledgeAmount: 0, pledgeReceived: 0 };
    headers.value.forEach((h, i) => {
      const field = mapping.value[i];
      if (!field) return;
      const val = raw[h];
      if (field === 'fullName') {
        const { firstName, lastName } = splitName(val);
        out.firstName = firstName; out.lastName = lastName;
      } else if (field === 'pledgeAmount' || field === 'pledgeReceived') {
        out[field] = Number(String(val || '0').replace(/,/g, '')) || 0;
      } else {
        out[field] = String(val ?? '').trim();
      }
    });
    return out;
  }).filter((r) => r.firstName);
  step.value = 'preview';
}

function transform(s, kind) {
  const str = String(s || '');
  if (kind === 'upper') return str.toUpperCase();
  if (kind === 'lower') return str.toLowerCase();
  if (kind === 'title') return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return str;
}
function applyCaseToAll(kind) {
  rows.value.forEach((r) => {
    r.firstName = transform(r.firstName, kind);
    r.lastName = transform(r.lastName, kind);
  });
}

async function doCommit() {
  commitError.value = ''; committing.value = true;
  try {
    const payload = rows.value.map((r) => ({
      firstName: r.firstName, lastName: r.lastName, phone: r.phone,
      pledgeAmount: r.pledgeAmount, pledgeReceived: r.pledgeReceived,
    }));
    const layout = rememberLayout.value ? { headers: headers.value, mapping: mapping.value } : undefined;
    result.value = await commitImport(props.eventId, payload, { saveLayout: layout });
    step.value = 'done';
  } catch (err) { commitError.value = apiErrorMessage(err); }
  finally { committing.value = false; }
}

function reset() {
  step.value = 'drop'; headers.value = []; rawRows.value = []; mapping.value = {}; rows.value = [];
  error.value = ''; commitError.value = ''; rememberLayout.value = false;
}
function finish() {
  emit('imported', result.value);
  toast.success(`${result.value.created || 0} created, ${result.value.updated || 0} updated`);
  reset();
  open.value = false;
}
</script>
