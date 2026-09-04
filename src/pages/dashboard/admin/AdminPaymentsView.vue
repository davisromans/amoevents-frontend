<template>
  <PageShell title="Payments queue" description="Manual payment submissions awaiting confirmation. Filter by status to focus on what needs a decision.">
    <template #actions>
      <div class="inline-flex items-center gap-1 p-1 rounded-xl surface-inset">
        <button v-for="f in FILTERS" :key="f.value"
                type="button"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast',
                         filter === f.value
                           ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                           : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
                @click="filter = f.value; refresh()">{{ f.label }}</button>
      </div>
    </template>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else-if="!items.length" class="surface-card p-16 text-center">
      <BanknotesIcon class="w-8 h-8 text-surface-slate mx-auto mb-2" />
      <p class="text-subtext">Nothing to review here.</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="s in items" :key="s._id" class="surface-card p-4 sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span :class="statusChip(s.status)">{{ s.status }}</span>
              <span class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">{{ s.method }}</span>
            </div>
            <p class="text-xl font-black text-surface-charcoal dark:text-surface-bone">{{ formatTZS(s.amountTZS) }}</p>
            <p class="text-subtext">
              For <span class="font-bold text-surface-charcoal dark:text-surface-bone">{{ s.eventId?.name || '—' }}</span>
              · Tenant <span class="font-bold text-surface-charcoal dark:text-surface-bone">{{ s.tenantId?.name || '—' }}</span>
            </p>
            <p class="text-subtext mt-1">
              Submitted by {{ s.submittedBy?.name }} ({{ s.submittedBy?.phone }}) · {{ new Date(s.createdAt).toLocaleString() }}
            </p>
          </div>
          <div v-if="s.status === 'pending'" class="flex gap-2">
            <button class="btn-secondary !text-sm" @click="openReject(s)">
              <XMarkIcon class="w-4 h-4" /> Reject
            </button>
            <button class="btn-primary !text-sm" @click="approve(s)">
              <CheckIcon class="w-4 h-4" /> Confirm
            </button>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-surface-mist dark:border-surface-fog grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <p><span class="text-surface-slate dark:text-surface-ash">Reference:</span> <code class="chip !text-2xs !py-0 !px-1">{{ s.reference }}</code></p>
          <p v-if="s.payerName"><span class="text-surface-slate dark:text-surface-ash">Payer name:</span> {{ s.payerName }}</p>
          <p v-if="s.payerPhone"><span class="text-surface-slate dark:text-surface-ash">Payer phone:</span> {{ s.payerPhone }}</p>
          <p v-if="s.note" class="sm:col-span-2 italic text-surface-slate dark:text-surface-ash">"{{ s.note }}"</p>
          <p v-if="s.reviewNote" class="sm:col-span-2">
            <span class="text-surface-slate dark:text-surface-ash">Review note:</span> {{ s.reviewNote }}
            <span v-if="s.reviewedBy" class="text-2xs text-surface-slate dark:text-surface-ash">— {{ s.reviewedBy.name }}</span>
          </p>
        </div>
      </div>
    </div>

    <AppModal v-model="rejectOpen" title="Reject payment" :maxWidth="440">
      <form class="space-y-3" @submit.prevent="doReject">
        <p class="text-subtext">
          Tell the owner why you're rejecting so they can fix it.
        </p>
        <AppInput v-model="rejectNote" label="Reason" type="textarea" :rows="3" required />
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-ghost" @click="rejectOpen = false">Cancel</button>
          <AppButton :loading="rejectLoading" type="submit">Reject</AppButton>
        </div>
      </form>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { BanknotesIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { listAllSubmissions, confirmSubmission, rejectSubmission } from '@/services/payments.service';
import { askConfirm } from '@/composables/useConfirm';
import { formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

const toast = useToast();
const items = ref([]);
const loading = ref(true);
const filter = ref('pending');

const rejectOpen = ref(false);
const rejectTarget = ref(null);
const rejectNote = ref('');
const rejectLoading = ref(false);

async function refresh() {
  loading.value = true;
  try { items.value = await listAllSubmissions(filter.value ? { status: filter.value } : {}); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function approve(s) {
  if (!(await askConfirm({
    title: 'Confirm payment',
    message: `Confirm ${new Intl.NumberFormat().format(s.amountTZS)} TZS for "${s.eventId?.name}"?`,
  }))) return;
  try {
    await confirmSubmission(s._id);
    toast.success('Confirmed. Event flipped to paid.');
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

function openReject(s) {
  rejectTarget.value = s;
  rejectNote.value = '';
  rejectOpen.value = true;
}
async function doReject() {
  if (!rejectNote.value.trim()) return;
  rejectLoading.value = true;
  try {
    await rejectSubmission(rejectTarget.value._id, rejectNote.value.trim());
    toast.success('Rejected');
    rejectOpen.value = false;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { rejectLoading.value = false; }
}

function statusChip(s) { return { pending: 'chip-warn', confirmed: 'chip-success', rejected: 'chip-danger' }[s] || 'chip'; }

onMounted(refresh);
</script>
