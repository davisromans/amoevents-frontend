<template>
  <Modal :model-value="open" title="Delivery report" description="A polished PDF of who received the invitation, by WhatsApp and SMS." :max-width="640" @update:model-value="$emit('update:open', $event)">
    <div v-if="loading" class="py-10 flex justify-center"><LoadingSpinner /></div>
    <p v-else-if="error" class="text-sm text-danger py-4">{{ error }}</p>
    <div v-else-if="data" class="space-y-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="k in kpis" :key="k.label" class="rounded-xl border border-border bg-surface p-3">
          <div class="text-[10px] font-semibold tracking-wide text-muted uppercase">{{ k.label }}</div>
          <div class="text-2xl font-bold mt-1" :style="{ color: k.color }">{{ k.value }}</div>
          <div class="text-xs text-muted">{{ k.sub }}</div>
        </div>
      </div>

      <div>
        <div class="flex h-3.5 rounded-full overflow-hidden bg-gray-200">
          <div v-for="s in segments" :key="s.label" :style="{ width: s.pct + '%', background: s.color }" :title="`${s.label}: ${s.n}`" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
          <div v-for="s in segments" :key="s.label" class="flex items-start gap-2">
            <span class="mt-1 h-2 w-2 rounded-full shrink-0" :style="{ background: s.color }" />
            <span><span class="font-semibold">{{ s.label }}</span><br><span class="text-muted">{{ s.n }} ({{ s.pct }}%)</span></span>
          </div>
        </div>
      </div>

      <div class="space-y-2 border-t border-border pt-4">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide">Include in the PDF</div>
        <label class="flex items-center gap-2 text-sm"><input v-model="opts.attention" type="checkbox"> Needs attention list ({{ data.neither }} not reached)</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="opts.list" type="checkbox"> Full guest list with status for every guest</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="opts.phones" type="checkbox"> Show phone numbers</label>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="secondary" @click="$emit('update:open', false)">Close</Button>
        <Button :disabled="loading || !data || downloading" @click="download">
          <ArrowDownTrayIcon class="h-4 w-4" /> {{ downloading ? 'Building PDF…' : 'Download PDF' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline';
import { Button, Modal } from '@/components/ui';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { getDeliveryOverview, exportDeliveryPdf } from '@/services/guests.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const props = defineProps({ open: Boolean, eventId: { type: String, required: true } });
defineEmits(['update:open']);
const toast = useToast();

const data = ref(null);
const loading = ref(false);
const downloading = ref(false);
const error = ref('');
const opts = reactive({ attention: true, list: true, phones: true });

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;
  loading.value = true; error.value = ''; data.value = null;
  try { data.value = await getDeliveryOverview(props.eventId); } catch (err) { error.value = apiErrorMessage(err); } finally { loading.value = false; }
});

const pct = (n) => (data.value?.guests ? Math.round((n / data.value.guests) * 100) : 0);
const kpis = computed(() => {
  const d = data.value; if (!d) return [];
  return [
    { label: 'Guests', value: d.guests, sub: `${d.people} people`, color: '#2E1065' },
    { label: 'Reached', value: d.reached, sub: `${pct(d.reached)}% of guests`, color: '#15803D' },
    { label: 'WhatsApp', value: d.whatsapp.delivered, sub: `${pct(d.whatsapp.delivered)}% delivered`, color: '#0F766E' },
    { label: 'SMS', value: d.sms.delivered, sub: `${pct(d.sms.delivered)}% delivered`, color: '#1D4ED8' },
  ];
});
const segments = computed(() => {
  const d = data.value; if (!d) return [];
  return [['Both channels', d.both, '#15803D'], ['WhatsApp only', d.waOnly, '#0F766E'], ['SMS only', d.smsOnly, '#1D4ED8'], ['Not reached', d.neither, '#E11D48']]
    .map(([label, n, color]) => ({ label, n, color, pct: pct(n) }));
});

async function download() {
  downloading.value = true;
  try {
    const { blob, filename } = await exportDeliveryPdf(props.eventId, opts);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success('Delivery report downloaded');
  } catch (err) { toast.error(apiErrorMessage(err)); } finally { downloading.value = false; }
}
</script>
