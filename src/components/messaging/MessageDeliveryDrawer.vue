<template>
  <AppModal :modelValue="open" @update:modelValue="onClose" :title="title" :maxWidth="720">
    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else>
      <div class="flex flex-wrap gap-2 mb-4 items-center">
        <span class="chip">{{ items.length }} messages</span>
        <span v-for="[k, n] in Object.entries(counts)" :key="k" :class="chipClass(k)">
          {{ n }} {{ k }}
        </span>
        <button v-if="mode === 'job' && failedCount > 0"
                class="btn-primary !text-xs !py-1 !px-3 ml-auto"
                :disabled="retryingAll"
                @click="retryAll">
          <ArrowPathIcon class="w-3.5 h-3.5" :class="retryingAll ? 'animate-spin' : ''" />
          Retry {{ failedCount }} failed
        </button>
      </div>

      <div v-if="!items.length" class="text-center py-8 text-surface-slate dark:text-surface-ash text-md">
        No messages recorded yet.
      </div>

      <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div v-for="l in items" :key="l._id" class="surface-inset p-3 rounded-xl">
          <div class="flex items-center gap-2 mb-1">
            <span :class="chipClass(l.status)">{{ l.status }}</span>
            <span class="chip !text-2xs uppercase">{{ l.channel }}</span>
            <span v-if="l.fallbackFrom" class="chip-warn !text-2xs">fell back from {{ l.fallbackFrom }}</span>
            <span class="text-xs text-surface-slate dark:text-surface-ash ml-auto">
              {{ formatDateTime(l.sentAt || l.createdAt) }}
            </span>
          </div>

          <div v-if="mode === 'job' && l.guestId">
            <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">
              {{ guestLabel(l.guestId) }}
            </p>
            <p v-if="guestPhone(l.guestId)" class="text-xs text-surface-slate dark:text-surface-ash">
              {{ guestPhone(l.guestId) }}<span v-if="guestMemberId(l.guestId)"> · {{ guestMemberId(l.guestId) }}</span>
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
          <div v-if="mode === 'job' && l.status === 'failed' && guestIdOf(l)" class="mt-2">
            <button class="btn-ghost !text-xs !py-1 !px-2"
                    :disabled="retryingIds.includes(guestIdOf(l))"
                    @click="retryOne(guestIdOf(l))">
              <ArrowPathIcon class="w-3 h-3" :class="retryingIds.includes(guestIdOf(l)) ? 'animate-spin' : ''" />
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import AppModal from '@/components/common/AppModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { formatDateTime } from '@/utils/format';
import { jobLogs, guestMessageHistory, retryFailedFromJob } from '@/services/messaging.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  open: Boolean,
  mode: { type: String, required: true, validator: (v) => ['job', 'guest'].includes(v) },
  jobId: String,
  eventId: String,
  guestId: String,
  title: { type: String, default: 'Delivery status' },
});
const emit = defineEmits(['update:open']);

const toast = useToast();
const items = ref([]);
const loading = ref(false);

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
function guestMemberId(g) { return typeof g === 'object' ? (g.memberId || '') : ''; }

// The message actually sent to this guest. Prefer the stored rendered body
// (placeholders already filled). For older logs without it, fill the common
// placeholders from the populated guest so we don't show raw {{first_name}}.
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
  } catch (err) { toast.error(apiErrorMessage(err)); items.value = []; }
  finally { loading.value = false; }
}

const failedCount = computed(() => items.value.filter((l) => l.status === 'failed').length);
const retryingAll = ref(false);
const retryingIds = ref([]);

function guestIdOf(l) {
  if (!l.guestId) return '';
  return typeof l.guestId === 'string' ? l.guestId : (l.guestId._id || '');
}

async function retryAll() {
  retryingAll.value = true;
  try {
    await retryFailedFromJob(props.jobId, []);
    toast.success(`Retrying ${failedCount.value} failed…`);
    await load();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { retryingAll.value = false; }
}
async function retryOne(guestId) {
  if (!guestId || retryingIds.value.includes(guestId)) return;
  retryingIds.value.push(guestId);
  try {
    await retryFailedFromJob(props.jobId, [guestId]);
    toast.success('Retrying…');
    await load();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { retryingIds.value = retryingIds.value.filter((x) => x !== guestId); }
}

function onClose(v) { emit('update:open', v); }

watch(() => props.open, (v) => { if (v) load(); });
</script>
