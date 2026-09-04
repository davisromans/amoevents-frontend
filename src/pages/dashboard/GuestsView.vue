<template>
  <PageShell
    :title="`Guests${stats ? ` · ${stats.total}` : ''}`"
    :description="stats ? `${stats.rsvpYes} attending · ${stats.arrived} arrived · ${stats.rsvpPending} awaiting reply` : ''"
    :crumbs="[{ label: 'Events', to: '/app/events' }, { label: eventName, to: `/app/events/${route.params.id}` }, { label: 'Guests' }]"
  >
    <template #actions>
      <Button variant="secondary" size="md" :loading="checkingAllWa" @click="runCheckAllWa">
        <template #leading><ArrowPathIcon class="w-4 h-4" /></template>
        Check WhatsApp
      </Button>
      <Button variant="secondary" size="md" @click="openSmartImport = true">
        <template #leading><ArrowUpTrayIcon class="w-4 h-4" /></template>
        Import
      </Button>
      <Button variant="primary" size="md" @click="openAddGuest">
        <template #leading><UserPlusIcon class="w-4 h-4" /></template>
        Add guest
      </Button>
    </template>

    <SmartImportModal v-model:open="openSmartImport" :event-id="route.params.id" @imported="refresh" />

    <!-- Filter row: RSVP status chips + search input -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div class="flex items-center gap-1 p-1 rounded-xl surface-inset overflow-x-auto hide-scrollbar">
        <button v-for="opt in RSVP_FILTERS" :key="opt.value"
                type="button"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast whitespace-nowrap',
                         rsvpFilter === opt.value
                           ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                           : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                @click="rsvpFilter = opt.value">
          {{ opt.label }}
          <span v-if="rsvpCounts[opt.value] != null" class="ml-1 text-2xs opacity-70 tabular-nums">{{ rsvpCounts[opt.value] }}</span>
        </button>
      </div>
      <div class="relative flex-1 max-w-md sm:ml-auto">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-slate dark:text-surface-ash pointer-events-none" />
        <input v-model="q" type="text"
               placeholder="Search name, phone, or member ID…"
               class="field-input !pl-10 w-full" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <EmptyState v-else-if="!items.length"
                title="No guests yet"
                description="Import your Excel sheet or add guests one by one to get started.">
      <template #icon><UsersIcon class="w-7 h-7" /></template>
      <template #actions>
        <Button variant="primary" @click="openAddGuest">Add a guest</Button>
        <Button variant="secondary" @click="openSmartImport = true">
          <template #leading><ArrowUpTrayIcon class="w-4 h-4" /></template>
          Import from Excel
        </Button>
      </template>
    </EmptyState>

    <EmptyState v-else-if="!filtered.length"
                title="No guests match your filter"
                description="Try a different search or clear the filter.">
      <template #icon><MagnifyingGlassIcon class="w-7 h-7" /></template>
      <template #actions>
        <Button variant="secondary" @click="q = ''; rsvpFilter = 'all'">Clear filters</Button>
      </template>
    </EmptyState>

    <div v-else class="surface-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash bg-surface-cream/50 dark:bg-surface-night/50">
            <tr>
              <th class="pl-4 py-2 w-8">
                <input type="checkbox" class="accent-brand-primary w-4 h-4 rounded"
                       :checked="allVisibleSelected"
                       :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                       @change="toggleAllVisible" />
              </th>
              <th class="text-left px-4 py-2">Guest</th>
              <th class="text-left px-4 py-2 hidden sm:table-cell">Phone</th>
              <th class="text-left px-4 py-2 hidden md:table-cell">Tags</th>
              <th class="text-left px-4 py-2">RSVP</th>
              <th class="text-left px-4 py-2 hidden lg:table-cell">Arrival</th>
              <th class="px-4 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-mist dark:divide-surface-fog">
            <tr v-for="g in filtered" :key="g._id"
                :class="['cursor-pointer transition-colors duration-fast',
                         selected.has(g._id) ? 'bg-brand-primary-glow' : 'hover:bg-surface-mist/40 dark:hover:bg-surface-fog/40']"
                @click="openDetail(g)">
              <td class="pl-4 py-3" @click.stop>
                <input type="checkbox" class="accent-brand-primary w-4 h-4 rounded"
                       :checked="selected.has(g._id)"
                       @change="toggleSelected(g._id)" />
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-2xs shrink-0"
                       :style="{ background: gradientFor(g) }">{{ initialsOf(g) }}</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ g.firstName }} {{ g.lastName }}</p>
                      <StarIcon v-if="g.isVip" class="w-3 h-3 text-brand-primary-deep dark:text-brand-primary-soft shrink-0" />
                    </div>
                    <p class="text-2xs text-surface-slate dark:text-surface-ash font-mono">{{ g.memberId }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell tabular-nums">
                <template v-if="isPlaceholderPhone(g.phone)">
                  <span class="text-2xs font-bold px-1.5 py-0.5 rounded bg-state-warning-bg text-state-warning">Missing</span>
                </template>
                <template v-else>
                  <span class="inline-flex items-center gap-1.5 text-surface-charcoal dark:text-surface-bone">
                    {{ g.phone }}
                    <CheckCircleIcon v-if="g.whatsappStatus === 'available'" class="w-3.5 h-3.5 text-state-success shrink-0" :title="`On WhatsApp${g.whatsappCheckedAt ? ' · checked ' + timeAgo(g.whatsappCheckedAt) : ''}`" />
                  </span>
                </template>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <div class="flex flex-wrap gap-1 max-w-[180px]">
                  <span v-for="t in tagsOf(g).slice(0, 2)" :key="t._id"
                        class="text-2xs font-bold px-1.5 py-0.5 rounded truncate"
                        :style="{ background: t.color || '#F0EAD6', color: '#1F1E1A' }">
                    {{ t.name }}
                  </span>
                  <span v-if="tagsOf(g).length > 2" class="text-2xs text-surface-slate dark:text-surface-ash">+{{ tagsOf(g).length - 2 }}</span>
                </div>
              </td>
              <td class="px-4 py-3"><Badge size="sm" :tone="rsvpTone(g.rsvpStatus)">{{ rsvpLabel(g.rsvpStatus) }}</Badge></td>
              <td class="px-4 py-3 hidden lg:table-cell">
                <Badge v-if="g.arrivalStatus === 'arrived'" tone="success" size="sm">✓ Arrived</Badge>
                <span v-else class="text-2xs text-surface-slate dark:text-surface-ash">—</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <button class="btn-ghost !p-1.5" @click="removeGuest(g)" aria-label="Delete" title="Delete">
                  <TrashIcon class="w-4 h-4 text-state-danger" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-4 py-3 border-t border-surface-mist dark:border-surface-fog flex items-center justify-between text-xs text-surface-slate dark:text-surface-ash">
        <span>Showing {{ filtered.length }} of {{ items.length }} guests</span>
        <span v-if="stats?.overCapacity" class="inline-flex items-center gap-1 text-state-warning font-bold">
          <ExclamationTriangleIcon class="w-3.5 h-3.5" />
          Over venue capacity ({{ stats.venueCapacity }})
        </span>
      </div>
    </div>

    <!-- Floating bulk-actions bar — appears when rows are selected. -->
    <transition
      enter-active-class="transition duration-base ease-out"
      leave-active-class="transition duration-fast ease-out"
      enter-from-class="opacity-0 translate-y-4" leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="selected.size" class="fixed z-30 bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]">
        <div class="surface-glass shadow-elev-4 rounded-2xl px-4 py-2.5 flex items-center gap-4">
          <p class="text-sm font-bold text-surface-charcoal dark:text-surface-bone tabular-nums">{{ selected.size }} selected</p>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" @click="bulkDelete">
              <template #leading><TrashIcon class="w-4 h-4 text-state-danger" /></template>
              Delete
            </Button>
            <Button variant="ghost" size="sm" @click="selected.clear(); selected = new Set()">
              <template #leading><XMarkIcon class="w-4 h-4" /></template>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Guest detail sheet (right rail) -->
    <GuestDetailSheet
      v-model="detailOpen"
      :guest="detailGuest"
      :event-id="route.params.id"
      :tags="availableTags"
      @edit="editFromSheet"
      @delete="deleteFromSheet"
      @download-qr="downloadQrFor"
    />

    <!-- Create / edit modal -->
    <Modal v-model="createOpen" :title="editingId ? 'Edit guest' : 'Add guest'" :max-width="520">
      <form class="space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <template #default="{ id }">
              <TextInput v-model="form.firstName" :id="id" required />
            </template>
          </Field>
          <Field label="Last name" optional>
            <template #default="{ id }">
              <TextInput v-model="form.lastName" :id="id" />
            </template>
          </Field>
        </div>
        <Field label="Phone" required>
          <template #default="{ id }">
            <PhoneInput v-model="form.phone" :id="id" />
          </template>
        </Field>
        <Field label="WhatsApp number" help="Leave blank if same as phone." optional>
          <template #default="{ id }">
            <TextInput v-model="form.whatsapp" :id="id" />
          </template>
        </Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label="Type">
            <template #default="{ id }">
              <Select v-model="form.type" :id="id" :options="TYPES" />
            </template>
          </Field>
          <Field v-if="form.type === 'family'" label="Family size">
            <template #default="{ id }">
              <TextInput v-model.number="form.familySize" :id="id" type="number" />
            </template>
          </Field>
        </div>
        <label class="flex items-center gap-2 text-sm text-surface-charcoal dark:text-surface-bone">
          <input v-model="form.isVip" type="checkbox" class="accent-brand-primary w-4 h-4 rounded" />
          VIP guest
        </label>
        <div v-if="availableTags.length">
          <label class="field-label">Tags</label>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="t in availableTags" :key="t._id" type="button"
                    :class="['px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors duration-fast',
                             form.tags.includes(t._id)
                               ? 'bg-gradient-primary text-white border-transparent shadow-primary-soft'
                               : 'border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                    @click="toggleFormTag(t._id)">
              {{ t.name }}
            </button>
          </div>
        </div>
        <details class="rounded-xl bg-surface-cream dark:bg-surface-night border border-surface-mist dark:border-surface-fog p-3">
          <summary class="cursor-pointer text-sm font-bold text-surface-charcoal dark:text-surface-bone">Pledge (optional)</summary>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <Field label="Amount (TZS)">
              <template #default="{ id }">
                <TextInput v-model="form.pledge.amount" :id="id" thousands placeholder="0" />
              </template>
            </Field>
            <Field label="Status">
              <template #default="{ id }">
                <Select v-model="form.pledge.status" :id="id" :options="[
                  { value: 'pending', label: 'Pending' },
                  { value: 'fulfilled', label: 'Received' },
                ]" />
              </template>
            </Field>
          </div>
          <div class="mt-3">
            <Field label="Item / note" optional>
              <template #default="{ id }">
                <TextInput v-model="form.pledge.item" :id="id" placeholder="e.g. Sofa set" />
              </template>
            </Field>
          </div>
        </details>
        <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>
      </form>
      <template #footer>
        <Button variant="secondary" @click="closeGuestModal">Cancel</Button>
        <Button variant="primary" :loading="saving" @click="submit">{{ editingId ? 'Save changes' : 'Add guest' }}</Button>
      </template>
    </Modal>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute } from 'vue-router';
import {
  MagnifyingGlassIcon, UserPlusIcon, UsersIcon, ExclamationTriangleIcon,
  ArrowUpTrayIcon, ArrowPathIcon, CheckCircleIcon, TrashIcon, XMarkIcon,
} from '@heroicons/vue/24/outline';
import { StarIcon } from '@heroicons/vue/24/solid';
import {
  listGuests, guestStats, createGuest, updateGuest, deleteGuest, downloadGuestQr,
} from '@/services/guests.service';
import { getEvent } from '@/services/events.service';
import { listTags } from '@/services/tags.service';
import SmartImportModal from '@/components/guests/SmartImportModal.vue';
import GuestDetailSheet from '@/components/guests/GuestDetailSheet.vue';
import { checkAllWa } from '@/services/messaging.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PhoneInput from '@/components/common/PhoneInput.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PageShell from '@/components/shell/PageShell.vue';
import { Badge, Button, EmptyState, Field, Modal, Select, TextInput } from '@/components/ui';

const TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'family', label: 'Family' },
];
const RSVP_FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'yes',     label: 'Yes' },
  { value: 'maybe',   label: 'Maybe' },
  { value: 'no',      label: 'No' },
  { value: 'pending', label: 'Pending' },
];

const route = useRoute();
const toast = useToast();
const items = ref([]);
const stats = ref(null);
const eventName = ref('Event');
const loading = ref(true);
const q = ref('');
const rsvpFilter = ref('all');
const availableTags = ref([]);

const openSmartImport = ref(false);

// ── Detail sheet (read-only) ─────────────────────────────────────────
const detailOpen = ref(false);
const detailGuest = ref(null);
function openDetail(g) { detailGuest.value = g; detailOpen.value = true; }

// ── Create / edit modal ──────────────────────────────────────────────
const createOpen = ref(false);
const editingId = ref(null);
const saving = ref(false);
const serverError = ref('');
const form = reactive({
  firstName: '', lastName: '', phone: '', whatsapp: '', type: 'single',
  familySize: 2, isVip: false, tags: [], pledge: { amount: 0, item: '', status: 'pending' },
});
function toggleFormTag(id) {
  const idx = form.tags.indexOf(id);
  if (idx >= 0) form.tags.splice(idx, 1); else form.tags.push(id);
}
function openAddGuest() {
  editingId.value = null;
  Object.assign(form, { firstName: '', lastName: '', phone: '', whatsapp: '', type: 'single', familySize: 2, isVip: false, tags: [], pledge: { amount: 0, item: '', status: 'pending' } });
  createOpen.value = true;
}
function editFromSheet(g) {
  detailOpen.value = false;
  editingId.value = g._id;
  Object.assign(form, {
    firstName: g.firstName || '', lastName: g.lastName || '',
    phone: isPlaceholderPhone(g.phone) ? '' : (g.phone || ''),
    whatsapp: g.whatsapp || '', type: g.type || 'single', familySize: g.familySize || 2,
    isVip: !!g.isVip,
    tags: (g.tags || []).map((t) => (typeof t === 'string' ? t : t._id)),
    pledge: { amount: g.pledge?.amount || 0, item: g.pledge?.item || '', status: g.pledge?.status || 'pending' },
  });
  createOpen.value = true;
}
function closeGuestModal() {
  createOpen.value = false;
  editingId.value = null;
}
async function submit() {
  serverError.value = ''; saving.value = true;
  try {
    const payload = {
      ...form,
      whatsapp: form.whatsapp || undefined,
      familySize: form.type === 'family' ? form.familySize : undefined,
      pledge: form.pledge?.amount > 0 ? form.pledge : undefined,
    };
    if (editingId.value) {
      await updateGuest(route.params.id, editingId.value, payload);
      toast.success('Guest updated');
    } else {
      await createGuest(route.params.id, payload);
      toast.success('Guest added');
    }
    closeGuestModal();
    await refresh();
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { saving.value = false; }
}

// ── Deletion (single + bulk) ─────────────────────────────────────────
async function removeGuest(g) {
  if (!(await askConfirm(`Delete guest ${g.firstName} ${g.lastName}?`))) return;
  try {
    await deleteGuest(route.params.id, g._id);
    items.value = items.value.filter((x) => x._id !== g._id);
    selected.value.delete(g._id);
    toast.success('Deleted');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function deleteFromSheet(g) {
  detailOpen.value = false;
  await removeGuest(g);
}

// ── Bulk selection ───────────────────────────────────────────────────
const selected = ref(new Set());
function toggleSelected(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selected.value = s;
}
function toggleAllVisible() {
  if (allVisibleSelected.value) {
    const s = new Set(selected.value);
    for (const g of filtered.value) s.delete(g._id);
    selected.value = s;
  } else {
    const s = new Set(selected.value);
    for (const g of filtered.value) s.add(g._id);
    selected.value = s;
  }
}
const allVisibleSelected  = computed(() => filtered.value.length > 0 && filtered.value.every((g) => selected.value.has(g._id)));
const someVisibleSelected = computed(() => filtered.value.some((g) => selected.value.has(g._id)));
async function bulkDelete() {
  const n = selected.value.size;
  if (!n) return;
  if (!(await askConfirm(`Delete ${n} selected guest${n === 1 ? '' : 's'}? This can't be undone.`))) return;
  const ids = [...selected.value];
  // Fire deletes in parallel — API endpoint is per-guest today. Bulk
  // endpoint can replace this in a future backend batch.
  const results = await Promise.allSettled(ids.map((id) => deleteGuest(route.params.id, id)));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed) toast.error(`${failed} guest${failed === 1 ? '' : 's'} could not be deleted`);
  else toast.success(`Deleted ${n} guest${n === 1 ? '' : 's'}`);
  selected.value = new Set();
  await refresh();
}

// ── QR (download from sheet) ─────────────────────────────────────────
async function downloadQrFor(g) {
  try {
    await downloadGuestQr(route.params.id, g._id, g.memberId);
    toast.success('Downloaded');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

// ── WhatsApp availability check across the whole guest list ─────────
const checkingAllWa = ref(false);
async function runCheckAllWa() {
  checkingAllWa.value = true;
  try {
    await checkAllWa(route.params.id);
    toast.success('WhatsApp numbers checked — cached numbers reused');
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { checkingAllWa.value = false; }
}

// ── Filtering ────────────────────────────────────────────────────────
function isPlaceholderPhone(phone) { return String(phone || '').startsWith('no-phone:'); }
function tagsOf(g) {
  const ids = (g.tags || []).map((t) => (typeof t === 'string' ? t : t._id));
  return availableTags.value.filter((t) => ids.includes(t._id));
}
function initialsOf(g) { return ((g.firstName?.[0] || '') + (g.lastName?.[0] || '')).toUpperCase() || '?'; }
function gradientFor(g) {
  const key = `${g.firstName || '?'}${g.lastName || ''}`;
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const grads = ['linear-gradient(135deg,#D084FF,#9B59B6)', 'linear-gradient(135deg,#FFB86B,#E5722F)', 'linear-gradient(135deg,#79E0B3,#2FA675)', 'linear-gradient(135deg,#7CC5FF,#3B7BD9)', 'linear-gradient(135deg,#FFB0D4,#D9457A)', 'linear-gradient(135deg,#B79CFF,#6C4CD9)'];
  return grads[h % grads.length];
}
function rsvpLabel(s) { return ({ yes: 'Yes', no: 'No', maybe: 'Maybe', pending: 'Pending' })[s] || 'Pending'; }
function rsvpTone(s)  { return ({ yes: 'success', no: 'danger', maybe: 'warning' })[s] || 'neutral'; }
function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days < 1 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
}

const rsvpCounts = computed(() => {
  const c = { all: items.value.length, yes: 0, maybe: 0, no: 0, pending: 0 };
  for (const g of items.value) {
    const s = g.rsvpStatus in c ? g.rsvpStatus : 'pending';
    c[s] = (c[s] || 0) + 1;
  }
  return c;
});

const filtered = computed(() => {
  let list = items.value;
  if (rsvpFilter.value !== 'all') list = list.filter((g) => (g.rsvpStatus || 'pending') === rsvpFilter.value);
  const s = q.value.trim().toLowerCase();
  if (!s) return list;
  return list.filter((g) =>
    (g.firstName || '').toLowerCase().includes(s)
    || (g.lastName || '').toLowerCase().includes(s)
    || (g.phone || '').includes(s)
    || (g.memberId || '').toLowerCase().includes(s)
  );
});

async function refresh() {
  loading.value = true;
  try {
    const [g, s] = await Promise.all([
      listGuests(route.params.id, { limit: 2000 }),
      guestStats(route.params.id),
    ]);
    items.value = g.items;
    stats.value = s;
    // Keep the sheet's guest reference fresh if it's open (post-edit
    // reflows into the same sheet without re-fetching).
    if (detailGuest.value) {
      const still = items.value.find((x) => x._id === detailGuest.value._id);
      if (still) detailGuest.value = still;
      else { detailOpen.value = false; detailGuest.value = null; }
    }
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

onMounted(async () => {
  await refresh();
  try { availableTags.value = await listTags(route.params.id); } catch (_) { /* ignore */ }
  try { const { event } = await getEvent(route.params.id); eventName.value = event?.name || 'Event'; } catch (_) { /* ignore */ }
});

// Clear bulk selection when filters change so users don't accidentally
// delete rows that scrolled out of view.
watch([rsvpFilter, q], () => { selected.value = new Set(); });
</script>
