<template>
  <AppModal :modelValue="open" @update:modelValue="onClose" :title="title" :maxWidth="960">
    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else>
      <div class="flex flex-wrap gap-2 mb-3 items-center">
        <span class="chip">{{ items.length }} messages</span>
        <span v-for="[k, n] in Object.entries(counts)" :key="k" :class="chipClass(k)">
          {{ n }} {{ k }}
        </span>
        <button v-if="mode === 'job' && failedCount > 0"
                class="btn-primary !text-xs !py-1 !px-3 ml-auto"
                :disabled="actionBusy"
                @click="retryAll">
          <ArrowPathIcon class="w-3.5 h-3.5" :class="retryingAll ? 'animate-spin' : ''" />
          Retry {{ failedCount }} failed
        </button>
      </div>

      <div v-if="mode === 'job' && items.length" class="space-y-2 mb-4">
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-slate dark:text-surface-ash pointer-events-none" />
          <input v-model="search" type="search" class="field-input !pl-9 !py-2 w-full"
                 placeholder="Search name, phone, WhatsApp number or guest code…" />
        </div>

        <div class="surface-inset rounded-xl p-2.5 flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
            <input type="checkbox" class="accent-brand-primary"
                   :checked="allFilteredSelected"
                   :disabled="!filteredItems.length || actionBusy"
                   @change="toggleSelectAll" />
            Select all shown
          </label>
          <span class="chip !text-2xs">{{ filteredItems.length }} shown</span>
          <span v-if="selectedLogIds.length" class="chip-gold !text-2xs">{{ selectedLogIds.length }} selected</span>

          <div class="flex flex-wrap gap-1.5 ml-auto">
            <button v-if="selectedLogIds.length" class="btn-ghost !text-xs !py-1 !px-2"
                    :disabled="actionBusy" @click="resendSelected('sms')">
              <PaperAirplaneIcon class="w-3.5 h-3.5" /> Resend SMS
            </button>
            <button v-if="selectedLogIds.length" class="btn-ghost !text-xs !py-1 !px-2"
                    :disabled="actionBusy" @click="resendSelected('whatsapp')">
              <PaperAirplaneIcon class="w-3.5 h-3.5" /> Resend WhatsApp
            </button>
            <button v-if="selectedLogIds.length" class="btn-primary !text-xs !py-1 !px-2"
                    :disabled="actionBusy || !selectedSuccessfulIds.length" @click="markSelectedInvited">
              <CheckCircleIcon class="w-3.5 h-3.5" /> Mark selected invited
            </button>
            <button class="btn-ghost !text-xs !py-1 !px-2"
                    :disabled="actionBusy || !successfulCount" @click="markAllInvited">
              <CheckCircleIcon class="w-3.5 h-3.5" /> Mark all invited
            </button>
          </div>
        </div>

        <p class="text-2xs text-surface-slate dark:text-surface-ash">
          Invitation marking is one record per guest and channel for this job: one SMS and one WhatsApp maximum. Failed or skipped rows are not marked invited.
        </p>
      </div>

      <div v-if="!items.length" class="text-center py-8 text-surface-slate dark:text-surface-ash text-md">
        No messages recorded yet.
      </div>

      <div v-else-if="!filteredItems.length" class="text-center py-8 text-surface-slate dark:text-surface-ash text-md">
        No delivery rows match “{{ search }}”.
      </div>

      <div v-else class="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
        <div v-for="l in filteredItems" :key="l._id" class="surface-inset p-3 rounded-xl">
          <div class="flex items-start gap-2">
            <input v-if="mode === 'job' && guestIdOf(l)" type="checkbox"
                   class="accent-brand-primary mt-1.5 shrink-0"
                   :checked="selectedLogIds.includes(l._id)"
                   :disabled="actionBusy"
                   :aria-label="`Select ${guestLabel(l.guestId)}`"
                   @change="toggleSelected(l._id)" />

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span :class="chipClass(l.status)">{{ l.status }}</span>
                <span class="chip !text-2xs uppercase">{{ l.channel }}</span>
                <span v-if="l.invitationMarked" class="chip-success !text-2xs">invited</span>
                <span v-if="l.fallbackFrom" class="chip-warn !text-2xs">fell back from {{ l.fallbackFrom }}</span>
                <span class="text-xs text-surface-slate dark:text-surface-ash ml-auto">
                  {{ formatDateTime(l.sentAt || l.createdAt) }}
                </span>
              </div>

              <div v-if="mode === 'job' && l.guestId">
                <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">
                  {{ guestLabel(l.guestId) }}
                </p>
                <p v-if="guestContact(l.guestId)" class="text-xs text-surface-slate dark:text-surface-ash">
                  {{ guestContact(l.guestId) }}<span v-if="guestMemberId(l.guestId)"> · {{ guestMemberId(l.guestId) }}</span>
                </p>
                <p v-if="messageText(l) !== 'Message'" class="text-sm text-surface-slate dark:text-surface-ash mt-1 line-clamp-2">
                  {{ messageText(l) }}
                </p>
              </div>
              <p v-if="mode === 'guest'" class="text-md text-surface-charcoal dark:text-surface-bone">
                {{ messageText(l) }}
              </p>

              <p v-if="l.error" class="text-sm text-red-600 dark:text-red-400 mt-1">
                ✗ {{ l.error }}
              </p>
              <p v-if="l.costTZS" class="text-2xs text-surface-slate dark:text-surface-ash mt-1">
                Cost: {{ l.costTZS }} TZS
              </p>

              <div v-if="mode === 'job' && guestIdOf(l)" class="mt-2 flex flex-wrap gap-1.5">
                <button class="btn-ghost !text-xs !py-1 !px-2"
                        :disabled="actionBusy"
                        @click="resendOne(l)">
                  <ArrowPathIcon class="w-3 h-3" :class="workingRowIds.includes(l._id) ? 'animate-spin' : ''" />
                  Resend {{ l.channel }}
                </button>
                <button v-if="isSuccessful(l) && !l.invitationMarked"
                        class="btn-ghost !text-xs !py-1 !px-2"
                        :disabled="actionBusy"
                        @click="markOneInvited(l)">
                  <CheckCircleIcon class="w-3 h-3" /> Mark invited
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ArrowPathIcon, CheckCircleIcon, MagnifyingGlassIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline';
import AppModal from '@/components/common/AppModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { formatDateTime } from '@/utils/format';
import {
  jobLogs,
  guestMessageHistory,
  retryFailedFromJob,
  resendFromJob,
  markDeliveryInvited,
} from '@/services/messaging.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { askConfirm } from '@/composables/useConfirm';

const props = defineProps({
  open: Boolean,
  mode: { type: String, required: true, validator: (v) => ['job', 'guest'].includes(v) },
  jobId: String,
  eventId: String,
  guestId: String,
  title: { type: String, default: 'Delivery status' },
});
const emit = defineEmits(['update:open', 'job-created']);

const toast = useToast();
const items = ref([]);
const loading = ref(false);
const search = ref('');
const selectedLogIds = ref([]);
const retryingAll = ref(false);
const resendingChannel = ref('');
const marking = ref(false);
const workingRowIds = ref([]);

const counts = computed(() => {
  const c = {};
  for (const l of items.value) c[l.status] = (c[l.status] || 0) + 1;
  return c;
});

function chipClass(k) {
  return {
    delivered: 'chip-success',
    read: 'chip-success',
    sent: 'chip-gold',
    queued: 'chip',
    failed: 'chip-danger',
    skipped: 'chip-warn',
  }[k] || 'chip';
}

function guestLabel(g) {
  if (typeof g === 'string') return g;
  return `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.phone || g._id;
}
function guestPhone(g) { return typeof g === 'object' ? (g.phone || '') : ''; }
function guestWhatsapp(g) { return typeof g === 'object' ? (g.whatsapp || '') : ''; }
function guestMemberId(g) { return typeof g === 'object' ? (g.memberId || '') : ''; }
function guestContact(g) {
  const phone = guestPhone(g);
  const whatsapp = guestWhatsapp(g);
  return whatsapp && whatsapp !== phone ? `${phone} · WhatsApp ${whatsapp}` : (phone || whatsapp);
}

function localPhoneForms(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return [];
  const forms = [digits];
  if (digits.startsWith('255')) forms.push(`0${digits.slice(3)}`, digits.slice(3));
  return forms;
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q || props.mode !== 'job') return items.value;
  const qDigits = q.replace(/\D/g, '');
  return items.value.filter((l) => {
    const g = typeof l.guestId === 'object' ? l.guestId : {};
    const text = [guestLabel(g), g.memberId, l.channel, l.status, l.body, l.error]
      .filter(Boolean).join(' ').toLowerCase();
    if (text.includes(q)) return true;
    if (!qDigits) return false;
    return [...localPhoneForms(g.phone), ...localPhoneForms(g.whatsapp)]
      .some((phone) => phone.includes(qDigits));
  });
});

function isSuccessful(l) { return ['sent', 'delivered', 'read'].includes(l.status); }
const successfulCount = computed(() => items.value.filter(isSuccessful).length);
const selectedSuccessfulIds = computed(() => items.value
  .filter((l) => selectedLogIds.value.includes(l._id) && isSuccessful(l))
  .map((l) => l._id));
const allFilteredSelected = computed(() => filteredItems.value.length > 0
  && filteredItems.value.every((l) => selectedLogIds.value.includes(l._id)));
const actionBusy = computed(() => retryingAll.value || !!resendingChannel.value || marking.value);

function toggleSelected(logId) {
  selectedLogIds.value = selectedLogIds.value.includes(logId)
    ? selectedLogIds.value.filter((id) => id !== logId)
    : [...selectedLogIds.value, logId];
}
function toggleSelectAll() {
  const shown = filteredItems.value.map((l) => l._id);
  if (allFilteredSelected.value) selectedLogIds.value = selectedLogIds.value.filter((id) => !shown.includes(id));
  else selectedLogIds.value = [...new Set([...selectedLogIds.value, ...shown])];
}

function messageText(l) {
  if (l.body) return l.body;
  const raw = l.jobId?.templateSnapshot?.body;
  if (!raw) return 'Message';
  const g = typeof l.guestId === 'object' ? l.guestId : {};
  return String(raw)
    .replaceAll('{{first_name}}', g.firstName || '')
    .replaceAll('{{guest_name}}', `${g.firstName || ''} ${g.lastName || ''}`.trim())
    .replaceAll('{{member_id}}', g.memberId || '')
    .replaceAll('{{code}}', g.memberId || '');
}

async function load() {
  loading.value = true;
  try {
    if (props.mode === 'job' && props.jobId) items.value = await jobLogs(props.jobId);
    else if (props.mode === 'guest' && props.eventId && props.guestId) {
      items.value = await guestMessageHistory(props.eventId, props.guestId);
    } else items.value = [];
    const valid = new Set(items.value.map((l) => l._id));
    selectedLogIds.value = selectedLogIds.value.filter((id) => valid.has(id));
  } catch (err) { toast.error(apiErrorMessage(err)); items.value = []; }
  finally { loading.value = false; }
}

const failedCount = computed(() => items.value.filter((l) => l.status === 'failed').length);

function guestIdOf(l) {
  if (!l.guestId) return '';
  return typeof l.guestId === 'string' ? l.guestId : (l.guestId._id || '');
}
function uniqueGuestIds(rows) {
  return [...new Set(rows.map(guestIdOf).filter(Boolean))];
}

async function retryAll() {
  if (!(await askConfirm(`Retry all ${failedCount.value} failed delivery rows? This sends real messages and may charge your wallet.`))) return;
  retryingAll.value = true;
  try {
    await retryFailedFromJob(props.jobId, []);
    toast.success(`Started a new retry job for ${failedCount.value} failed messages.`);
    emit('job-created');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { retryingAll.value = false; }
}

async function runResend(rows, channel, rowId = '') {
  const guestIds = uniqueGuestIds(rows);
  if (!guestIds.length) return;
  const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
  if (!(await askConfirm(`Resend ${channelLabel} to ${guestIds.length} selected guest${guestIds.length === 1 ? '' : 's'}? This sends real messages and may charge your wallet.`))) return;
  resendingChannel.value = channel;
  if (rowId) workingRowIds.value = [...workingRowIds.value, rowId];
  try {
    await resendFromJob(props.jobId, guestIds, channel);
    toast.success(`${channelLabel} resend started for ${guestIds.length} guest${guestIds.length === 1 ? '' : 's'}.`);
    emit('job-created');
    selectedLogIds.value = [];
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally {
    resendingChannel.value = '';
    workingRowIds.value = workingRowIds.value.filter((id) => id !== rowId);
  }
}
function resendSelected(channel) {
  return runResend(items.value.filter((l) => selectedLogIds.value.includes(l._id)), channel);
}
function resendOne(row) { return runResend([row], row.channel, row._id); }

function invitationResultMessage(result) {
  const marked = Number(result?.marked || 0);
  const existing = Number(result?.alreadyMarked || 0);
  const skipped = Number(result?.skipped || 0);
  const parts = [`${marked} invitation mark${marked === 1 ? '' : 's'} added`];
  if (existing) parts.push(`${existing} already marked`);
  if (skipped) parts.push(`${skipped} failed/skipped row${skipped === 1 ? '' : 's'} ignored`);
  return parts.join(' · ');
}
async function runMarkInvited(payload, rowId = '') {
  marking.value = true;
  if (rowId) workingRowIds.value = [...workingRowIds.value, rowId];
  try {
    const result = await markDeliveryInvited(props.jobId, payload);
    toast.success(invitationResultMessage(result));
    await load();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally {
    marking.value = false;
    workingRowIds.value = workingRowIds.value.filter((id) => id !== rowId);
  }
}
async function markSelectedInvited() {
  if (!(await askConfirm('Mark the successful rows among these selections as invited? Each guest is marked once per SMS/WhatsApp channel for this job.'))) return;
  await runMarkInvited({ logIds: selectedSuccessfulIds.value });
  selectedLogIds.value = [];
}
async function markAllInvited() {
  if (!(await askConfirm(`Mark all ${successfulCount.value} successful rows in this delivery report as invited? Failed and skipped rows will remain uninvited.`))) return;
  await runMarkInvited({ all: true });
}
async function markOneInvited(row) {
  await runMarkInvited({ logIds: [row._id] }, row._id);
}

function onClose(v) { emit('update:open', v); }

watch(() => props.open, (v) => {
  if (v) {
    search.value = '';
    selectedLogIds.value = [];
    load();
  }
});
</script>
