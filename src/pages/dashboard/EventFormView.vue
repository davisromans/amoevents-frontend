<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
    <PageHeader :title="isEdit ? form.name || 'Edit event' : 'New event'" :back="isEdit ? `/app/events/${route.params.id}` : '/app/events'" />

    <form class="surface-card p-4 sm:p-6 space-y-5" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="form.name" label="Event name *" placeholder="Harusi ya Davis & Neema" required />
        <AppSelect v-model="form.eventType" label="Type" :options="TYPES" @update:modelValue="applyTypeDefaults" />
      </div>

      <!-- Date + times as three separate fields, default 00:00 → 23:59 -->
      <div class="grid grid-cols-3 gap-3">
        <AppInput v-model="form.day" label="Date *" type="date" required />
        <AppInput v-model="form.startTime" label="Start" type="time" />
        <AppInput v-model="form.endTime" label="End" type="time" />
      </div>

      <AppInput v-model="form.coupleNames" label="Celebrant / couple names" placeholder="Davis Mwaisemba & Neema Yohana" />
      <AppInput v-model="form.hostText" label="Host text" type="textarea" placeholder="Familia ya Mzee Mwaisemba kwa ajili ya kijana yao…" />

      <!-- Venue — the picker sets name + address + lat/lng; capacity is separate. -->
      <div class="surface-inset p-4 space-y-3 venue-picker-root">
        <VenuePicker v-model="form.venue" />
        <AppInput v-model.number="form.venueCapacity" label="Venue capacity" type="number" placeholder="500" />
        <details class="text-sm">
          <summary class="cursor-pointer text-subtext">Advanced — lat/lng override</summary>
          <div class="grid grid-cols-2 gap-3 mt-2">
            <AppInput v-model.number="form.venue.lat" label="Lat" type="number" placeholder="-6.7654" />
            <AppInput v-model.number="form.venue.lng" label="Lng" type="number" placeholder="39.2078" />
          </div>
        </details>
      </div>

      <!-- Card branding colors — used when compositing the QR + labels
           onto guest cards. Empty = default gold. -->
      <div class="surface-inset p-4 space-y-3">
        <p class="section-eyebrow">Card colors</p>
        <div class="grid grid-cols-3 gap-3">
          <label class="flex flex-col items-start gap-1">
            <span class="text-xs font-bold text-surface-charcoal dark:text-surface-bone">QR modules</span>
            <input type="color" :value="form.branding.qrColor || DEFAULT_QR_COLOR"
                   @input="form.branding.qrColor = $event.target.value"
                   class="h-10 w-full rounded-md border border-surface-mist cursor-pointer" />
          </label>
          <label class="flex flex-col items-start gap-1">
            <span class="text-xs font-bold text-surface-charcoal dark:text-surface-bone">Logo ring</span>
            <input type="color" :value="form.branding.logoColor || DEFAULT_LOGO_COLOR"
                   @input="form.branding.logoColor = $event.target.value"
                   class="h-10 w-full rounded-md border border-surface-mist cursor-pointer" />
          </label>
          <label class="flex flex-col items-start gap-1">
            <span class="text-xs font-bold text-surface-charcoal dark:text-surface-bone">Text over QR</span>
            <input type="color" :value="form.branding.textColor || DEFAULT_TEXT_COLOR"
                   @input="form.branding.textColor = $event.target.value"
                   class="h-10 w-full rounded-md border border-surface-mist cursor-pointer" />
          </label>
        </div>
        <button class="btn-ghost !text-xs" @click.prevent="form.branding.qrColor = null; form.branding.logoColor = null; form.branding.textColor = null">
          Reset to default gold
        </button>
      </div>

      <!-- Payment contacts — rendered into message templates via {{payment_contacts}}.
           One row per method (M-Pesa, Mixx, Tigo Pesa, bank), account name and phone. -->
      <div class="surface-inset p-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-heading">Payment contacts</p>
          <button class="btn-ghost !text-xs" @click.prevent="form.paymentContacts.push({ method: 'mixx', label: '', phone: '', accountName: '' })">
            <PlusIcon class="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div v-for="(c, i) in form.paymentContacts" :key="'pc'+i" class="grid grid-cols-12 gap-2 items-center">
          <select v-model="c.method" class="col-span-3 field-input !py-1.5 !text-sm">
            <option value="mpesa">M-Pesa</option>
            <option value="mixx">Mixx</option>
            <option value="tigopesa">Tigo Pesa</option>
            <option value="airtel">Airtel Money</option>
            <option value="halopesa">Halopesa</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
          <input v-if="c.method === 'bank'" v-model="c.bankName" placeholder="Bank (CRDB, NMB…)" class="col-span-3 field-input !py-1.5 !text-sm" />
          <input v-model="c.phone" :placeholder="c.method === 'bank' ? 'Account number' : '0658457580'" class="col-span-3 field-input !py-1.5 !text-sm" />
          <input v-model="c.accountName" placeholder="Account name" :class="c.method === 'bank' ? 'col-span-2' : 'col-span-5'" class="field-input !py-1.5 !text-sm" />
          <button class="col-span-1 text-red-500 hover:text-red-700" @click.prevent="form.paymentContacts.splice(i, 1)">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
        <p v-if="!form.paymentContacts.length" class="text-2xs text-surface-slate dark:text-surface-ash">
          Add mobile-money / bank details so pledge reminders can auto-fill them.
        </p>
      </div>

      <!-- Communication contacts — {{contact_phones}}. Family reps, MC, ushers. -->
      <div class="surface-inset p-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-heading">Contact phones for guests</p>
          <button class="btn-ghost !text-xs" @click.prevent="form.contactPhones.push({ label: '', phone: '' })">
            <PlusIcon class="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div v-for="(c, i) in form.contactPhones" :key="'cp'+i" class="grid grid-cols-12 gap-2 items-center">
          <input v-model="c.label" placeholder="Role (Best man, MC…)" class="col-span-5 field-input !py-1.5 !text-sm" />
          <input v-model="c.phone" placeholder="0712345678" class="col-span-6 field-input !py-1.5 !text-sm" />
          <button class="col-span-1 text-red-500 hover:text-red-700" @click.prevent="form.contactPhones.splice(i, 1)">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Optional church / ceremony venue (weddings). Toggle off if not used. -->
      <div class="surface-inset p-4 space-y-3">
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.church.enabled" class="accent-brand-gold w-4 h-4" />
          <span class="text-heading">Church / ceremony venue</span>
        </label>
        <div v-if="form.church.enabled" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="form.church.name" label="Church name" placeholder="St. Joseph Cathedral" />
            <AppInput v-model="form.church.address" label="Address" placeholder="Sokoine Dr, Dar es Salaam" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="form.church.arrivalTime" label="Arrival time" placeholder="10:00 AM" />
            <AppInput v-model="form.church.serviceTime" label="Service time" placeholder="11:00 AM" />
          </div>
        </div>
      </div>

      <DressCodePicker v-model="form.dressCode" />
      <AppInput v-model="form.notes" label="Notes" type="textarea" />

      <!-- Which optional cards guests see on their /g/<token> page -->
      <div>
        <p class="section-eyebrow mb-2">Guest page — visible sections</p>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="f in FEATURE_TOGGLES" :key="f.key" class="flex items-center gap-2 surface-inset p-2 rounded-lg cursor-pointer">
            <input type="checkbox" v-model="form.features[f.key]" class="accent-brand-gold w-4 h-4" />
            <span class="text-heading">{{ f.label }}</span>
          </label>
        </div>
        <p class="text-2xs text-surface-slate dark:text-surface-ash mt-1">Uncheck to hide a section from guests without deleting the data.</p>
      </div>

      <!-- Guest-list visibility — controls the "Guest list" tab a logged-in
           invitee sees on their My Invitations dashboard. -->
      <div>
        <p class="section-eyebrow mb-2">Guest list visibility</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label v-for="opt in GUEST_LIST_VISIBILITY" :key="opt.value"
                 class="surface-inset p-3 rounded-lg cursor-pointer border-2"
                 :class="form.features.guestListVisibility === opt.value ? 'border-brand-gold' : 'border-transparent'">
            <input type="radio" :value="opt.value" v-model="form.features.guestListVisibility" class="accent-brand-gold" />
            <span class="ml-2 text-heading">{{ opt.label }}</span>
            <p class="text-2xs text-surface-slate dark:text-surface-ash mt-1">{{ opt.hint }}</p>
          </label>
        </div>
        <label class="flex items-center gap-2 mt-2">
          <input type="checkbox" v-model="form.features.guestListShowsPhone" class="accent-brand-gold w-4 h-4" />
          <span class="text-sm text-surface-charcoal dark:text-surface-bone">Also show each guest's phone number</span>
        </label>
      </div>

      <p v-if="serverError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ serverError }}</p>

      <div class="flex items-center justify-end gap-2 pt-2">
        <router-link :to="isEdit ? `/app/events/${route.params.id}` : '/app/events'">
          <button type="button" class="btn-ghost">Cancel</button>
        </router-link>
        <AppButton :loading="loading" type="submit">{{ isEdit ? 'Save changes' : 'Create event' }}</AppButton>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createEvent, updateEvent, getEvent } from '@/services/events.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';
import DressCodePicker from '@/components/events/DressCodePicker.vue';
import VenuePicker from '@/components/events/VenuePicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';

// Fetched from the server (super-admin manages the master list at
// /app/admin/event-types). Falls back to the classic seven while loading.
// Same defaults the backend renderer uses when qrColor/textColor/logoColor
// are null — so the picker swatch shows what the guest actually sees today.
const DEFAULT_QR_COLOR   = '#9A7B2E';  // GOLD_DEEP
const DEFAULT_LOGO_COLOR = '#E5C97A';  // GOLD_LIGHT
const DEFAULT_TEXT_COLOR = '#2A2417';  // charcoal

const TYPES = ref([
  { value: 'wedding', label: 'Wedding' },
  { value: 'send_off', label: 'Send-off' },
  { value: 'kitchen_party', label: 'Kitchen party' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'other', label: 'Other' },
]);
const EVENT_TYPE_DEFS = ref([]);
import('@/services/eventTypes.service').then(({ listEventTypes }) =>
  listEventTypes().then((rows) => {
    EVENT_TYPE_DEFS.value = rows;
    TYPES.value = rows.map((r) => ({ value: r.slug, label: r.label }));
  }).catch(() => {}),
);

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isEdit = computed(() => !!route.params.id);

const FEATURE_TOGGLES = [
  { key: 'showMaps', label: 'Venue + Maps' },
  { key: 'showCalendar', label: 'Add to Calendar' },
  { key: 'showProgram', label: 'Program' },
  { key: 'showDressCode', label: 'Dress code' },
  { key: 'showGallery', label: 'Photo gallery' },
];
const GUEST_LIST_VISIBILITY = [
  { value: 'owner_only', label: 'Private',  hint: 'Only you (and collaborators) see the guest list.' },
  { value: 'invited',    label: 'Invited only', hint: 'Every guest on the list can see the others.' },
  { value: 'public',     label: 'Anyone logged in', hint: 'Any AmoEvents account can see the list.' },
];

const form = reactive({
  name: '', eventType: 'wedding',
  day: '', startTime: '00:00', endTime: '23:59',
  coupleNames: '', hostText: '',
  venue: { name: '', address: '', lat: null, lng: null },
  church: { enabled: false, name: '', address: '', arrivalTime: '', serviceTime: '' },
  paymentContacts: [],
  contactPhones: [],
  branding: { qrColor: null, logoColor: null, textColor: null },
  venueCapacity: null,
  dressCode: '', notes: '',
  features: { showMaps: true, showCalendar: true, showProgram: true, showDressCode: true, showGallery: false, guestListVisibility: 'owner_only', guestListShowsPhone: false },
});
const loading = ref(false);
const serverError = ref('');

function splitDT(iso, fallback = '00:00') {
  if (!iso) return { day: '', time: fallback };
  const d = new Date(iso);
  // Use LOCAL date parts, not toISOString() (UTC) — joinDT() below builds the
  // Date from a bare "YYYY-MM-DDTHH:mm" string, which the JS Date constructor
  // parses as local time. Splitting via UTC here shifted the calendar day
  // back by one for any timezone ahead of UTC (e.g. EAT, UTC+3) whenever the
  // stored time crossed midnight UTC — a 03/10 local date round-tripped to
  // 02/10 on reload.
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { day, time };
}
function joinDT(day, time) {
  if (!day) return null;
  return new Date(`${day}T${time || '00:00'}`).toISOString();
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const { event } = await getEvent(route.params.id);
      const s = splitDT(event.date, '00:00');
      const e = splitDT(event.endDate || event.date, '23:59');
      Object.assign(form, {
        name: event.name || '',
        eventType: event.eventType || 'wedding',
        day: s.day, startTime: s.time || '00:00',
        endTime: e.time || '23:59',
        coupleNames: event.coupleNames || '',
        hostText: event.hostText || '',
        venue: event.venue || { name: '', address: '', lat: null, lng: null },
        church: event.church || { enabled: false, name: '', address: '', arrivalTime: '', serviceTime: '' },
        paymentContacts: Array.isArray(event.paymentContacts) ? event.paymentContacts.map((c) => ({ ...c })) : [],
        contactPhones: Array.isArray(event.contactPhones) ? event.contactPhones.map((c) => ({ ...c })) : [],
        branding: {
          qrColor: event.branding?.qrColor || null,
          logoColor: event.branding?.logoColor || null,
          textColor: event.branding?.textColor || null,
        },
        venueCapacity: event.venueCapacity || null,
        dressCode: event.dressCode || '',
        notes: event.notes || '',
        features: {
          showMaps: event.features?.showMaps !== false,
          showCalendar: event.features?.showCalendar !== false,
          showProgram: event.features?.showProgram !== false,
          showDressCode: event.features?.showDressCode !== false,
          showGallery: event.features?.showGallery === true,
          guestListVisibility: event.features?.guestListVisibility || 'owner_only',
          guestListShowsPhone: !!event.features?.guestListShowsPhone,
        },
      });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }
});

// When creating a fresh event, picking a type prefills sensible defaults
// (dress code, host text, church-enabled flag) that the super-admin
// configured. Skip on edit so we don't stomp on the user's own values.
function applyTypeDefaults(slug) {
  if (isEdit.value) return;
  const def = EVENT_TYPE_DEFS.value.find((d) => d.slug === slug);
  if (!def) return;
  if (!form.dressCode && def.defaultDressCode) form.dressCode = def.defaultDressCode;
  if (!form.hostText && def.defaultHostText) form.hostText = def.defaultHostText;
  if (def.hasChurch) form.church.enabled = true;
}

async function submit() {
  serverError.value = '';
  if (!form.name.trim()) { serverError.value = 'Event name required'; return; }
  if (!form.day) { serverError.value = 'Date required'; return; }
  loading.value = true;
  try {
    const payload = {
      name: form.name,
      eventType: form.eventType,
      date: joinDT(form.day, form.startTime || '00:00'),
      endDate: joinDT(form.day, form.endTime || '23:59'),
      coupleNames: form.coupleNames,
      hostText: form.hostText,
      venue: form.venue?.name || form.venue?.address ? form.venue : undefined,
      venueCapacity: form.venueCapacity || undefined,
      dressCode: form.dressCode,
      notes: form.notes,
      features: form.features,
      church: form.church?.enabled ? form.church : { enabled: false },
      paymentContacts: form.paymentContacts.filter((c) => c.phone || c.accountName),
      contactPhones: form.contactPhones.filter((c) => c.phone),
      branding: form.branding,
    };
    const evt = isEdit.value
      ? await updateEvent(route.params.id, payload)
      : await createEvent(payload);
    toast.success(isEdit.value ? 'Saved' : 'Event created');
    router.replace(`/app/events/${evt._id}`);
  } catch (err) {
    serverError.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>
