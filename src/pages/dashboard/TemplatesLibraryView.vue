<template>
  <PageShell
    title="Message templates"
    description="Meta-approved WhatsApp templates for invites, RSVPs, reminders, and thank-yous."
  >
    <template #actions>
      <Button variant="secondary" :loading="syncingWa" @click="syncMeta">
        <template #leading><ArrowPathIcon class="w-4 h-4" /></template>
        Sync
      </Button>
      <Button variant="primary" @click="openRequest">
        <template #leading><PlusIcon class="w-4 h-4" /></template>
        Request template
      </Button>
    </template>

    <!-- Filter chip row + search -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div class="flex items-center gap-1 p-1 rounded-xl surface-inset overflow-x-auto hide-scrollbar">
        <button v-for="f in FILTERS" :key="f.value"
                type="button"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast whitespace-nowrap',
                         filter === f.value
                           ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                           : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                @click="filter = f.value">
          {{ f.label }}
          <span v-if="counts[f.value] != null" class="ml-1 text-2xs opacity-70 tabular-nums">{{ counts[f.value] }}</span>
        </button>
      </div>
      <div class="relative flex-1 max-w-md sm:ml-auto">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash pointer-events-none" />
        <input v-model="q" type="text" placeholder="Search templates by name…"
               class="field-input !pl-10 w-full" />
      </div>
      <label v-if="isSuper" class="flex items-center gap-2 text-sm text-surface-slate dark:text-surface-ash cursor-pointer whitespace-nowrap">
        <input type="checkbox" v-model="showHidden" class="accent-brand-primary w-4 h-4 rounded" />
        Show hidden
      </label>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <EmptyState v-else-if="!templates.length"
                title="No templates yet"
                description="Once your WhatsApp Business account has templates approved, they'll appear here.">
      <template #icon><ChatBubbleLeftRightIcon class="w-7 h-7" /></template>
      <template #actions>
        <Button variant="primary" @click="openRequest">Request your first template</Button>
      </template>
    </EmptyState>

    <EmptyState v-else-if="!filtered.length"
                title="No templates match your filter"
                description="Try a different status filter or clear the search.">
      <template #icon><MagnifyingGlassIcon class="w-7 h-7" /></template>
      <template #actions>
        <Button variant="secondary" @click="q = ''; filter = 'all'">Clear filters</Button>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <TemplateCard
        v-for="t in filtered" :key="t.name + t.language"
        :template="t"
        :selected="selected?.name === t.name && selected?.language === t.language"
        @select="selected = t; sheetOpen = true"
      />
    </div>

    <TemplateDetailSheet
      v-model="sheetOpen"
      :template="selected"
      :is-super="isSuper"
      @use="onUse"
      @toggle-hide="toggleHide"
    />

    <!-- Request template modal -->
    <Modal v-model="requestOpen" title="Request a new template" :max-width="640" description="Our team builds and submits it to Meta for approval.">
      <div class="space-y-4">
        <Field label="Template name" required>
          <template #default="{ id }">
            <TextInput v-model="request.name" :id="id" placeholder="Wedding invitation" />
          </template>
        </Field>

        <Field label="Category" required>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="c in CATEGORIES" :key="c.value" type="button"
                    :class="['p-3 rounded-xl text-sm font-bold border transition-colors duration-fast',
                             request.category === c.value
                               ? 'border-brand-primary bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft'
                               : 'border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                    @click="request.category = c.value">
              {{ c.label }}
            </button>
          </div>
        </Field>

        <Field label="Language">
          <template #default="{ id }">
            <Select v-model="request.language" :id="id" :options="[
              { value: 'sw', label: 'Swahili' },
              { value: 'en', label: 'English' },
            ]" />
          </template>
        </Field>

        <Field label="Message body" :help="`${request.body.length} chars · Meta caps at 1024`" required>
          <template #default="{ id }">
            <Textarea v-model="request.body" :id="id" :rows="5"
                      placeholder="Habari [name], karibu [event] tarehe [date] sehemu ya [venue]." />
          </template>
        </Field>

        <label class="flex items-center gap-2 text-sm text-surface-charcoal dark:text-surface-bone">
          <input type="checkbox" v-model="request.hasImageHeader" class="accent-brand-primary w-4 h-4 rounded" />
          Include a header image
        </label>

        <Field label="Buttons" help="Up to 3. Meta only allows all-URL OR all-quick-reply — not mixed.">
          <div class="grid grid-cols-2 gap-2">
            <label v-for="b in BUTTON_CHOICES" :key="b.id"
                   :class="['p-2.5 rounded-lg text-sm border cursor-pointer flex items-start gap-2 transition-colors duration-fast',
                            request.buttons.includes(b.id)
                              ? 'border-brand-primary bg-brand-primary-glow'
                              : 'border-surface-mist dark:border-surface-fog hover:border-surface-slate/40']">
              <input type="checkbox" :value="b.id" v-model="request.buttons"
                     @change="enforceButtonLimits"
                     class="accent-brand-primary w-4 h-4 mt-0.5 shrink-0" />
              <div class="min-w-0">
                <p class="font-bold text-surface-charcoal dark:text-surface-bone">{{ b.label }}</p>
                <p class="text-2xs text-surface-slate dark:text-surface-ash truncate">{{ b.kind }}</p>
              </div>
            </label>
          </div>
        </Field>

        <Field label="Notes" optional>
          <template #default="{ id }">
            <Textarea v-model="request.notes" :id="id" :rows="2" />
          </template>
        </Field>

        <p v-if="requestErr" class="text-sm text-state-danger font-medium">{{ requestErr }}</p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="requestOpen = false">Cancel</Button>
        <Button variant="primary" :loading="submitting" @click="submitRequest">Send request</Button>
      </template>
    </Modal>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowPathIcon, PlusIcon, MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import TemplateCard from '@/components/messaging/TemplateCard.vue';
import TemplateDetailSheet from '@/components/messaging/TemplateDetailSheet.vue';
import { Button, EmptyState, Field, Modal, Select, TextInput, Textarea } from '@/components/ui';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const templates = ref([]);
const selected = ref(null);
const sheetOpen = ref(false);
const filter = ref('all');
const q = ref('');
const showHidden = ref(false);
const syncingWa = ref(false);
const isSuper = computed(() => auth.isSuperAdmin);

const FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
];
const CATEGORIES = [
  { value: 'UTILITY',        label: 'Utility' },
  { value: 'MARKETING',      label: 'Invitation' },
  { value: 'AUTHENTICATION', label: 'One-time code' },
];
const BUTTON_CHOICES = [
  { id: 'rsvp_yes',   label: 'Nitakuja',        kind: 'Quick reply' },
  { id: 'rsvp_no',    label: 'Sitakuja',        kind: 'Quick reply' },
  { id: 'rsvp_maybe', label: 'Sijui bado',      kind: 'Quick reply' },
  { id: 'location',   label: 'Open location',   kind: 'URL button' },
  { id: 'calendar',   label: 'Add to calendar', kind: 'URL button' },
  { id: 'gallery',    label: 'View gallery',    kind: 'URL button' },
  { id: 'pay',        label: 'Pay pledge',      kind: 'URL button' },
  { id: 'view_event', label: 'View event page', kind: 'URL button' },
];

const baseList = computed(() => showHidden.value ? templates.value : templates.value.filter((t) => !t.hidden));

const filtered = computed(() => {
  let list = baseList.value;
  if (filter.value !== 'all') list = list.filter((t) => t.status === filter.value);
  const s = q.value.trim().toLowerCase();
  if (!s) return list;
  return list.filter((t) => t.name.toLowerCase().includes(s));
});
const counts = computed(() => {
  const c = { all: baseList.value.length, APPROVED: 0, PENDING: 0, REJECTED: 0 };
  for (const t of baseList.value) if (c[t.status] != null) c[t.status] += 1;
  return c;
});

async function refresh() {
  loading.value = true;
  try {
    const url = isSuper.value ? '/whatsapp-templates/all' : '/whatsapp-templates';
    const r = await http.get(url);
    const resp = r.data?.data || r.data;
    templates.value = (resp.items || resp || []).sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function syncMeta() {
  syncingWa.value = true;
  try { await http.post('/whatsapp-templates/sync'); await refresh(); toast.success('Synced'); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { syncingWa.value = false; }
}

async function toggleHide(t) {
  try {
    await http.patch(`/whatsapp-templates/${t._id}/hide`, { hidden: !t.hidden });
    t.hidden = !t.hidden;
    toast.success(t.hidden ? 'Hidden from tenants' : 'Visible to tenants');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

// "Use this template" — jumps to the messaging composer with the template
// pre-selected. Composer picks up ?template= from the URL (existing behavior).
function onUse(t) {
  sheetOpen.value = false;
  // Messaging is event-scoped — bounce to events list if no current event.
  router.push({ path: '/app/events', query: { template: t.name } });
}

// ── Request modal ────────────────────────────────────────────────────
const requestOpen = ref(false);
const submitting = ref(false);
const requestErr = ref('');
const request = reactive({
  name: '', category: 'UTILITY', language: 'sw', body: '',
  hasImageHeader: false, buttons: [], notes: '',
});
function openRequest() {
  Object.assign(request, {
    name: '', category: 'UTILITY', language: 'sw', body: '',
    hasImageHeader: false, buttons: [], notes: '',
  });
  requestErr.value = '';
  requestOpen.value = true;
}
function enforceButtonLimits() {
  const chosen = request.buttons;
  if (chosen.length === 0) return;
  const kindOf = (id) => BUTTON_CHOICES.find((b) => b.id === id)?.kind;
  const firstKind = kindOf(chosen[0]);
  request.buttons = chosen.filter((id) => kindOf(id) === firstKind).slice(0, 3);
}
async function submitRequest() {
  requestErr.value = '';
  if (!request.name.trim() || !request.body.trim()) { requestErr.value = 'Name and body are required.'; return; }
  submitting.value = true;
  try {
    await http.post('/whatsapp-templates/request', {
      ...request,
      buttonsPreset: request.buttons.length ? 'custom' : 'none',
      buttonIds: request.buttons,
    });
    toast.success('Request received — we\'ll build and submit to Meta.');
    requestOpen.value = false;
    await refresh();
  } catch (err) { requestErr.value = apiErrorMessage(err); }
  finally { submitting.value = false; }
}

onMounted(refresh);
</script>
