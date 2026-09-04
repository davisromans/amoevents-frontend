<template>
  <PageShell>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>
    <div v-else class="space-y-5">
      <div class="surface-card p-5 space-y-4">
        <p class="text-heading flex items-center gap-1.5">
          Per-message rates
          <InfoHint text="Every SMS segment and WhatsApp send debits the tenant's wallet at these rates. Composer shows live cost." />
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model.number="cfg.smsRateTZS" label="Per-SMS segment (TZS)"   type="number" min="0" step="1" />
          <AppInput v-model.number="cfg.waRateTZS"  label="WhatsApp fallback (TZS)" type="number" min="0" step="1" />
        </div>
        <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft pt-2 flex items-center gap-1.5">
          WhatsApp — Meta bills by category
          <InfoHint text="Utility (reminders, receipts) is cheapest. Marketing (invitations, promos) costs more. Authentication is for one-time codes." />
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AppInput v-model.number="cfg.waUtilityRateTZS"        label="Utility (TZS)"        type="number" min="0" />
          <AppInput v-model.number="cfg.waMarketingRateTZS"      label="Marketing (TZS)"      type="number" min="0" />
          <AppInput v-model.number="cfg.waAuthenticationRateTZS" label="Authentication (TZS)" type="number" min="0" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model.number="cfg.defaultBalanceTZS" label="New-tenant starting balance (TZS)"
                    type="number" min="0" step="500"
                    placeholder="0 for no free credit" />
          <label class="flex items-center gap-2 pb-3">
            <input type="checkbox" v-model="cfg.enforceBalance" class="accent-brand-gold w-4 h-4" />
            <p class="text-heading flex items-center gap-1.5">
              Enforce balance
              <InfoHint text="Refuse sends when a tenant's wallet is empty. Turn on once bundle top-ups are live." />
            </p>
          </label>
        </div>
        <div class="flex justify-end">
          <AppButton :loading="saving" @click="save">Save rates</AppButton>
        </div>
      </div>

      <div class="surface-card p-5 space-y-3">
        <p class="text-heading flex items-center gap-1.5">
          Top up a tenant
          <InfoHint text="Manual credit — a stop-gap until the PawaPay bundle-purchase flow is fully rolled out. Adds TZS and/or free unit bundles." />
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppInput v-model="topup.tenantId" label="Tenant ID" placeholder="65a…" />
          <AppInput v-model.number="topup.amountTZS" label="TZS to add" type="number" min="0" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppInput v-model.number="topup.smsUnits" label="SMS free units" type="number" min="0" />
          <AppInput v-model.number="topup.waUnits"  label="WhatsApp free units" type="number" min="0" />
        </div>
        <div class="flex justify-end">
          <AppButton :loading="topupBusy" @click="doTopup" :disabled="!topup.tenantId">Credit wallet</AppButton>
        </div>
        <p v-if="topupMsg" class="text-sm" :class="topupOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
          {{ topupMsg }}
        </p>
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import InfoHint from '@/components/common/InfoHint.vue';

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const cfg = ref({ smsRateTZS: 30, waRateTZS: 100, defaultBalanceTZS: 0, enforceBalance: false });

const topup = reactive({ tenantId: '', amountTZS: 0, smsUnits: 0, waUnits: 0 });
const topupBusy = ref(false);
const topupMsg = ref('');
const topupOk = ref(false);

onMounted(async () => {
  try {
    const r = await http.get('/messaging/pricing');
    cfg.value = r.data?.data || r.data;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});

async function save() {
  saving.value = true;
  try {
    const r = await http.patch('/messaging/pricing', cfg.value);
    cfg.value = r.data?.data || r.data;
    toast.success('Saved — takes effect on next send');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { saving.value = false; }
}

async function doTopup() {
  topupBusy.value = true; topupMsg.value = ''; topupOk.value = false;
  try {
    const r = await http.post('/messaging/wallet/topup', topup);
    const w = r.data?.data || r.data;
    topupOk.value = true;
    topupMsg.value = `Balance now ${(w.balanceTZS || 0).toLocaleString('sw-TZ')} TZS · SMS ${w.smsUnitsLeft} · WA ${w.waUnitsLeft}`;
  } catch (err) { topupMsg.value = apiErrorMessage(err); }
  finally { topupBusy.value = false; }
}
</script>
