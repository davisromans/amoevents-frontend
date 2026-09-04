<template>
  <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner /></div>

  <div v-else-if="event" class="px-4 sm:px-6 lg:px-8 py-6">
    <!-- Full-bleed hero. Countdown, name, status pills, all in one visual. -->
    <EventHero :event="event" />

    <!-- Primary CTA row — one clear next action for the event's state. -->
    <div v-if="primaryAction" class="mb-8">
      <Card variant="inset" padding="md" class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center shrink-0">
            <component :is="primaryAction.icon" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">{{ primaryAction.title }}</p>
            <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ primaryAction.description }}</p>
          </div>
        </div>
        <router-link :to="primaryAction.to" v-if="primaryAction.to">
          <Button variant="primary" size="md">{{ primaryAction.cta }}</Button>
        </router-link>
        <Button v-else variant="primary" size="md" @click="primaryAction.onClick">{{ primaryAction.cta }}</Button>
      </Card>
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatTile label="Guests"    :value="(event.guestCount || 0).toLocaleString()"    :meta="capacityMeta" />
      <StatTile label="RSVP yes"  :value="(event.rsvpYesCount || 0).toLocaleString()"  :meta="`${event.rsvpPendingCount || 0} awaiting`" />
      <StatTile label="Arrived"   :value="(event.arrivedCount || 0).toLocaleString()"  :meta="`${arrivalPct}% of confirmed`" />
      <StatTile label="Declined"  :value="(event.rsvpNoCount || 0).toLocaleString()"   :meta="`${event.rsvpMaybeCount || 0} maybe`" />
    </div>

    <!-- Two-column: RSVP breakdown ring + event details -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <Card class="lg:col-span-1">
        <SectionHeader title="RSVP breakdown" level="subsection" />
        <div class="flex items-center gap-6">
          <!-- Donut ring -->
          <svg viewBox="0 0 42 42" class="w-32 h-32 shrink-0">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="currentColor" stroke-width="6" class="text-surface-mist dark:text-surface-fog" />
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#10B981" stroke-width="6" :stroke-dasharray="`${yesPct} ${100 - yesPct}`" stroke-dashoffset="25" />
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#EF4444" stroke-width="6" :stroke-dasharray="`${noPct} ${100 - noPct}`" :stroke-dashoffset="`${25 - yesPct}`" />
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#F59E0B" stroke-width="6" :stroke-dasharray="`${maybePct} ${100 - maybePct}`" :stroke-dashoffset="`${25 - yesPct - noPct}`" />
            <text x="21" y="20" text-anchor="middle" class="fill-surface-charcoal dark:fill-surface-bone font-black" style="font-size: 8px">{{ event.guestCount || 0 }}</text>
            <text x="21" y="26" text-anchor="middle" class="fill-surface-slate dark:fill-surface-ash" style="font-size: 3px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase">GUESTS</text>
          </svg>
          <div class="flex-1 space-y-2 text-sm">
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-state-success" /><span class="flex-1 text-surface-charcoal dark:text-surface-bone">Yes</span><span class="font-black tabular-nums">{{ event.rsvpYesCount || 0 }}</span></div>
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-state-warning" /><span class="flex-1 text-surface-charcoal dark:text-surface-bone">Maybe</span><span class="font-black tabular-nums">{{ event.rsvpMaybeCount || 0 }}</span></div>
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-state-danger" /><span class="flex-1 text-surface-charcoal dark:text-surface-bone">No</span><span class="font-black tabular-nums">{{ event.rsvpNoCount || 0 }}</span></div>
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-surface-slate dark:bg-surface-ash" /><span class="flex-1 text-surface-charcoal dark:text-surface-bone">Pending</span><span class="font-black tabular-nums">{{ event.rsvpPendingCount || 0 }}</span></div>
          </div>
        </div>
      </Card>

      <!-- Event details — venue + host + capacity in a two-col dl -->
      <Card class="lg:col-span-2">
        <SectionHeader title="Details" level="subsection">
          <template #actions>
            <router-link :to="`/app/events/${event._id}/edit`">
              <Button variant="ghost" size="sm">
                <template #leading><PencilSquareIcon class="w-4 h-4" /></template>
                Edit
              </Button>
            </router-link>
          </template>
        </SectionHeader>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <DetailRow label="Couple / celebrant" :value="event.coupleNames || '—'" />
          <DetailRow label="Venue" :value="event.venue?.name || '—'" />
          <DetailRow label="Address" :value="event.venue?.address || '—'" />
          <DetailRow v-if="event.venue?.lat && event.venue?.lng" label="Directions">
            <a class="text-brand-primary-deep dark:text-brand-primary-soft font-bold hover:underline inline-flex items-center gap-1"
               :href="`https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`"
               target="_blank" rel="noopener">Open in Maps
              <ArrowTopRightOnSquareIcon class="w-3.5 h-3.5" />
            </a>
          </DetailRow>
          <DetailRow label="Dress code" :value="event.dressCode || '—'" />
          <DetailRow label="Capacity" :value="event.venueCapacity ? event.venueCapacity.toLocaleString() : '—'" />
          <DetailRow label="Status" :value="event.status" />
        </dl>
        <div v-if="event.hostText" class="mt-5 pt-5 border-t border-surface-mist dark:border-surface-fog">
          <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-1.5">Host message</p>
          <p class="text-sm text-surface-charcoal dark:text-surface-bone leading-relaxed">{{ event.hostText }}</p>
        </div>
      </Card>
    </div>

    <!-- Capacity warning banner — only when over. -->
    <div v-if="capacityWarning" class="mb-6">
      <Card variant="inset" padding="md" class="border-l-4 !border-l-state-warning flex items-start gap-3">
        <ExclamationTriangleIcon class="w-5 h-5 text-state-warning shrink-0 mt-0.5" />
        <div>
          <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">Over venue capacity</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ event.guestCount }} guests · venue holds {{ event.venueCapacity }}. Trim the list or move to a bigger venue.</p>
        </div>
      </Card>
    </div>

    <!-- Extra images (event assets) + danger zone. Both live in Settings
         (Batch 13) but keep them here for now so nothing regresses. -->
    <Card class="mb-6">
      <SectionHeader title="Extra images" level="subsection">
        <template #actions>
          <label class="btn-secondary !text-sm cursor-pointer">
            <PlusIcon class="w-4 h-4" /> Add
            <input type="file" accept="image/*" class="hidden" @change="onAssetPick" />
          </label>
        </template>
      </SectionHeader>
      <p v-if="!assets.length" class="text-sm text-surface-slate dark:text-surface-ash">No extra images uploaded yet.</p>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div v-for="a in assets" :key="a._id" class="relative group">
          <div class="aspect-square w-full rounded-xl bg-surface-mist dark:bg-surface-fog overflow-hidden flex items-center justify-center ring-2"
               :class="coverAssetId === a._id ? 'ring-brand-gold' : 'ring-transparent'">
            <img :src="a.url" :alt="a.label" class="max-h-full max-w-full object-contain" />
          </div>
          <div class="mt-1.5 flex items-center gap-1">
            <button class="text-2xs font-bold flex-1 truncate text-left text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft"
                    :title="coverAssetId === a._id ? 'This is the thumbnail' : 'Set as event thumbnail'"
                    @click="setCover(a)">
              {{ coverAssetId === a._id ? '★ Thumbnail' : 'Set as thumbnail' }}
            </button>
            <button class="text-state-danger p-0.5 rounded hover:bg-state-danger-bg shrink-0" @click="removeAsset(a)">
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>

    <Card v-if="canDelete">
      <SectionHeader title="Danger zone" level="subsection" />
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-md font-black text-state-danger">Delete this event</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">Wipes guests, RSVPs, scans, messages, pledges, gallery photos, and every file on storage. Irreversible.</p>
        </div>
        <Button variant="danger" @click="deleteOpen = true">Delete event</Button>
      </div>
    </Card>

    <!-- Payment modal (super_admin) -->
    <Modal v-model="paymentOpen" title="Payment status" :max-width="440">
      <div class="space-y-4">
        <Field label="Status">
          <template #default="{ id }">
            <Select v-model="pay.paymentStatus" :id="id" :options="[
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
              { value: 'unpaid', label: 'Unpaid' },
            ]" />
          </template>
        </Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label="Amount (TZS)">
            <template #default="{ id }">
              <TextInput v-model="pay.amountTZS" :id="id" thousands placeholder="75,000" />
            </template>
          </Field>
          <Field label="Method">
            <template #default="{ id }">
              <Select v-model="pay.method" :id="id" :options="[
                { value: 'mpesa', label: 'M-Pesa' },
                { value: 'tigopesa', label: 'Tigo Pesa' },
                { value: 'airtel', label: 'Airtel Money' },
                { value: 'bank', label: 'Bank transfer' },
                { value: 'cash', label: 'Cash' },
                { value: 'other', label: 'Other' },
              ]" />
            </template>
          </Field>
        </div>
        <Field label="Reference" optional>
          <template #default="{ id }">
            <TextInput v-model="pay.reference" :id="id" placeholder="Transaction ID" />
          </template>
        </Field>
        <Field label="Note" optional>
          <template #default="{ id }">
            <Textarea v-model="pay.note" :id="id" :rows="2" />
          </template>
        </Field>
        <p v-if="paymentError" class="text-sm text-state-danger font-medium">{{ paymentError }}</p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="paymentOpen = false">Cancel</Button>
        <Button variant="primary" :loading="paying" @click="submitPayment">Update</Button>
      </template>
    </Modal>

    <!-- Asset upload -->
    <Modal v-model="assetModalOpen" title="Add event image" :max-width="440">
      <div class="space-y-4">
        <div v-if="assetPending.file" class="text-sm text-surface-slate dark:text-surface-ash">
          {{ assetPending.file.name }} · {{ Math.round(assetPending.file.size / 1024) }} KB
        </div>
        <Field label="Label">
          <template #default="{ id }">
            <TextInput v-model="assetPending.label" :id="id" placeholder="Save the date" />
          </template>
        </Field>
      </div>
      <template #footer>
        <Button variant="secondary" :disabled="assetUploading" @click="assetModalOpen = false">Cancel</Button>
        <Button variant="primary" :loading="assetUploading" :disabled="!assetPending.label" @click="confirmAssetUpload">Upload</Button>
      </template>
    </Modal>

    <!-- Delete confirm — requires typing the event name -->
    <Modal v-model="deleteOpen" title="Delete this event?" :max-width="480">
      <div class="space-y-4">
        <p class="text-md text-surface-charcoal dark:text-surface-bone">
          This permanently removes <strong>{{ event.name }}</strong> and every guest, RSVP, scan, message, pledge and gallery photo attached — including files on storage.
          <span class="font-bold text-state-danger">This cannot be undone.</span>
        </p>
        <Field :label="`Type ${event.name} to confirm`">
          <template #default="{ id }">
            <TextInput v-model="deleteConfirmText" :id="id" :placeholder="event.name" autocomplete="off" />
          </template>
        </Field>
        <p v-if="deleteError" class="text-sm text-state-danger font-medium">{{ deleteError }}</p>
      </div>
      <template #footer>
        <Button variant="secondary" :disabled="deleting" @click="deleteOpen = false">Cancel</Button>
        <Button variant="danger" :loading="deleting" :disabled="deleteConfirmText !== event.name" @click="submitDelete">Delete event</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute, useRouter } from 'vue-router';
import {
  ExclamationTriangleIcon, ArrowTopRightOnSquareIcon, PencilSquareIcon,
  TrashIcon, PlusIcon, PaperAirplaneIcon, BanknotesIcon, UsersIcon,
} from '@heroicons/vue/24/outline';
import { getEvent, deleteEvent } from '@/services/events.service';
import { togglePayment } from '@/services/payment.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EventHero from '@/components/events/EventHero.vue';
import DetailRow from '@/components/events/EventDetailRow.vue';
import { Button, Card, Field, Modal, Select, SectionHeader, StatTile, TextInput, Textarea } from '@/components/ui';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const event = ref(null);
const loading = ref(true);

// Primary CTA — one action, chosen by the event's current state. Every
// event page has exactly one "most important thing to do next"; this is
// where it lives so an organiser doesn't hunt for it.
const primaryAction = computed(() => {
  if (!event.value) return null;
  if (event.value.paymentStatus !== 'paid') {
    return auth.isSuperAdmin
      ? { title: 'Confirm payment', description: 'Mark this event as paid so QRs stop showing the watermark.', cta: 'Update payment', icon: BanknotesIcon, onClick: () => (paymentOpen.value = true) }
      : { title: 'Pay for this event', description: 'Guests\' cards stay watermarked and sends are blocked until payment lands.', cta: 'Pay now', icon: BanknotesIcon, to: `/app/events/${event.value._id}/payment` };
  }
  if ((event.value.guestCount || 0) === 0) {
    return { title: 'Add your guests', description: 'Import from Excel or add them one by one.', cta: 'Add guests', icon: UsersIcon, to: `/app/events/${event.value._id}/guests` };
  }
  if ((event.value.rsvpYesCount || 0) + (event.value.rsvpNoCount || 0) + (event.value.rsvpMaybeCount || 0) === 0) {
    return { title: 'Send invitations', description: 'Everyone\'s on the list — time to reach out on WhatsApp and SMS.', cta: 'Send now', icon: PaperAirplaneIcon, to: `/app/events/${event.value._id}/messaging` };
  }
  return null; // Everything's rolling — no forced CTA.
});

// Ring math — each slice is a percentage of guestCount (100 total).
const total = computed(() => event.value?.guestCount || 0);
const yesPct   = computed(() => total.value ? Math.round(((event.value.rsvpYesCount || 0)   / total.value) * 100) : 0);
const noPct    = computed(() => total.value ? Math.round(((event.value.rsvpNoCount || 0)    / total.value) * 100) : 0);
const maybePct = computed(() => total.value ? Math.round(((event.value.rsvpMaybeCount || 0) / total.value) * 100) : 0);
const arrivalPct = computed(() => {
  const confirmed = event.value?.rsvpYesCount || 0;
  return confirmed ? Math.round(((event.value.arrivedCount || 0) / confirmed) * 100) : 0;
});
const capacityMeta = computed(() => {
  const cap = event.value?.venueCapacity || 0;
  if (!cap) return `${event.value?.rsvpYesCount || 0} confirmed`;
  return `of ${cap} capacity`;
});
const capacityWarning = computed(() =>
  event.value?.venueCapacity > 0 && (event.value?.guestCount || 0) > event.value?.venueCapacity
);

// ── Payment modal (super_admin) ─────────────────────────────────────
const paymentOpen = ref(false);
const paying = ref(false);
const paymentError = ref('');
const pay = reactive({ paymentStatus: 'paid', amountTZS: null, method: 'mpesa', reference: '', note: '' });

async function submitPayment() {
  paymentError.value = ''; paying.value = true;
  try {
    await togglePayment(route.params.id, {
      paymentStatus: pay.paymentStatus,
      amountTZS: pay.amountTZS || undefined,
      method: pay.method,
      reference: pay.reference || undefined,
      note: pay.note || undefined,
    });
    toast.success('Payment updated');
    paymentOpen.value = false;
    await refresh();
  } catch (err) { paymentError.value = apiErrorMessage(err); }
  finally { paying.value = false; }
}

// ── Delete confirm ──────────────────────────────────────────────────
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const deleteConfirmText = ref('');
const canDelete = computed(() =>
  !!event.value && (auth.isSuperAdmin || String(event.value.ownerId) === String(auth.user?._id || auth.user?.id))
);
async function submitDelete() {
  if (deleteConfirmText.value !== event.value.name) return;
  deleteError.value = ''; deleting.value = true;
  try {
    await deleteEvent(route.params.id);
    toast.success(`Deleted "${event.value.name}"`);
    router.push('/app/events');
  } catch (err) { deleteError.value = apiErrorMessage(err); }
  finally { deleting.value = false; }
}

// ── Event assets ────────────────────────────────────────────────────
const assets = ref([]);
const coverAssetId = ref(null); // best-effort highlight — only known once set this session
async function loadAssets() {
  try { assets.value = await (await import('@/services/eventAssets.service')).listAssets(route.params.id); }
  catch (_) {}
}
const assetModalOpen = ref(false);
const assetPending = reactive({ file: null, label: '' });
const assetUploading = ref(false);
function onAssetPick(e) {
  const file = e.target.files?.[0]; e.target.value = '';
  if (!file) return;
  assetPending.file = file;
  assetPending.label = file.name.replace(/\.[^.]+$/, '');
  assetModalOpen.value = true;
}
function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `asset-${Date.now()}`;
}
async function confirmAssetUpload() {
  if (!assetPending.file) return;
  assetUploading.value = true;
  try {
    const base = slugify(assetPending.label);
    const existing = new Set(assets.value.map((a) => a.slug));
    let slug = base, i = 2;
    while (existing.has(slug)) { slug = `${base}-${i}`; i += 1; }
    await (await import('@/services/eventAssets.service')).uploadAsset(
      route.params.id, assetPending.file, slug, assetPending.label,
    );
    toast.success('Uploaded');
    assetModalOpen.value = false;
    assetPending.file = null;
    await loadAssets();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { assetUploading.value = false; }
}
async function removeAsset(a) {
  if (!(await askConfirm(`Delete asset "${a.slug}"?`))) return;
  try {
    await (await import('@/services/eventAssets.service')).deleteAsset(route.params.id, a._id);
    await loadAssets();
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function setCover(a) {
  try {
    const { setCoverAsset } = await import('@/services/eventAssets.service');
    const { coverImageUrl } = await setCoverAsset(route.params.id, a._id);
    if (event.value) event.value.coverImageUrl = coverImageUrl;
    coverAssetId.value = a._id;
    toast.success('Set as thumbnail');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function refresh() {
  try {
    const { event: e } = await getEvent(route.params.id);
    event.value = e;
    pay.paymentStatus = e.paymentStatus || 'paid';
    loadAssets();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

onMounted(refresh);
</script>
