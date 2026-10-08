<template>
  <PageShell title="Template requests" description="Review private tenant SMS and WhatsApp templates.">
    <div v-if="loading" class="flex justify-center py-12"><LoadingSpinner /></div>
    <div v-else class="space-y-4">
      <div v-for="r in rows" :key="r._id" class="surface-card p-5 space-y-4">
        <div class="flex flex-wrap justify-between gap-3">
          <div>
            <p class="text-heading">{{ r.name }}</p>
            <p class="text-subtext">{{ r.tenantId?.name }} · {{ r.requestedBy?.name }} · {{ r.channel.toUpperCase() }} · {{ r.category }} · {{ r.language }}</p>
          </div>
          <span class="chip-info">{{ r.status.replaceAll('_', ' ') }}</span>
        </div>
        <pre class="surface-inset rounded-xl p-4 whitespace-pre-wrap text-sm font-sans">{{ r.body }}</pre>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select v-model="r.status" class="field-input">
            <option value="submitted">Submitted</option><option value="in_review">In review</option>
            <option v-if="r.channel === 'whatsapp'" value="submitted_to_provider">Submitted to Meta</option>
            <option value="live">Live</option><option value="rejected">Rejected</option>
          </select>
          <input v-model="r.resultingTemplateName" class="field-input" placeholder="Provider template name" />
          <input v-model="r.expectedLiveAt" type="datetime-local" class="field-input" />
        </div>
        <textarea v-model="r.adminNote" rows="2" class="field-input w-full" placeholder="Note visible to the tenant, e.g. Meta review usually takes up to 24 hours." />
        <div class="flex justify-end"><AppButton :loading="saving === r._id" @click="save(r)">Save update</AppButton></div>
      </div>
      <p v-if="!rows.length" class="surface-card p-12 text-center text-subtext">No template requests.</p>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppButton from '@/components/common/AppButton.vue';
const rows = ref([]); const loading = ref(true); const saving = ref(''); const toast = useToast();
async function refresh() { try { const r = await http.get('/whatsapp-templates/requests'); rows.value = r.data?.data || r.data || []; } catch (e) { toast.error(apiErrorMessage(e)); } finally { loading.value = false; } }
async function save(row) { saving.value = row._id; try { const payload = { status: row.status, adminNote: row.adminNote || '', resultingTemplateName: row.resultingTemplateName || '', expectedLiveAt: row.expectedLiveAt || null }; const r = await http.patch(`/whatsapp-templates/requests/${row._id}`, payload); Object.assign(row, r.data?.data || r.data); toast.success(row.channel === 'sms' && row.status === 'live' ? 'SMS template is live immediately' : 'Request updated'); } catch (e) { toast.error(apiErrorMessage(e)); } finally { saving.value = ''; } }
onMounted(refresh);
</script>
