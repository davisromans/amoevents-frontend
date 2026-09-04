<template>
  <PageShell>
    <template #actions>
      <Button variant="ghost" size="md" @click="refresh">
        <template #leading><ArrowPathIcon class="w-4 h-4" /></template>
        Refresh
      </Button>
    </template>

    <div class="surface-inset rounded-xl p-4 mb-6 text-sm text-surface-slate dark:text-surface-ash">
      <p class="font-bold text-surface-charcoal dark:text-surface-bone mb-1">Two ways to pay</p>
      <p>
        <strong>Mobile-money push</strong> — we send a payment prompt to your phone (M-Pesa, Mixx, Airtel, HaloPesa).
        &nbsp;·&nbsp;
        <strong>From your wallet</strong> — deducts TZS you already topped up. Same result, no phone prompt.
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="TZS balance" :value="fmtTZS(wallet.balanceTZS || 0)" variant="filled" />
        <StatTile label="SMS left" :value="(wallet.smsUnitsLeft || 0).toLocaleString()" :meta="`${(wallet.lifetimeSpentTZS || 0).toLocaleString()} TZS spent lifetime`" />
        <StatTile label="WhatsApp left" :value="(wallet.waUnitsLeft || 0).toLocaleString()" />
      </div>

      <div class="surface-card p-5 border-2 border-brand-primary-deep/30 bg-brand-primary-glow/20">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0 flex-1">
            <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">Just messages</p>
            <p class="text-heading flex items-center gap-1.5">
              Top up any amount
              <InfoHint text="Adds TZS to your wallet directly. Every message you send comes out of this balance." />
            </p>
          </div>
          <button class="btn-primary" @click="openTopup">
            <PlusIcon class="w-4 h-4" /> Top up wallet
          </button>
        </div>
      </div>

      <!-- Amoview interop — appears only when the account is linked to
           Amoview AND that wallet actually has TZS. Otherwise it would
           just be noise for a first-time user. -->
      <div v-if="(wallet.amoviewBalanceTZS || 0) > 0"
           class="surface-card p-5 border-2 border-state-info/30 bg-state-info-bg/40">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0 flex-1">
            <p class="text-2xs uppercase font-black tracking-widest text-state-info">Linked Amoview account</p>
            <p class="text-heading">You have {{ fmtTZS(wallet.amoviewBalanceTZS) }} in Amoview</p>
            <p class="text-subtext mt-0.5">Move some of it here to buy bundles or pay for events without another mobile-money prompt.</p>
          </div>
          <button class="btn-primary" @click="openAmoviewTransfer">
            Transfer from Amoview
          </button>
        </div>
      </div>

      <AppModal v-model="transferOpen" title="Transfer from Amoview" :maxWidth="440">
        <div class="space-y-3">
          <div class="surface-inset p-3 rounded-lg">
            <p class="text-subtext">Amoview balance</p>
            <p class="text-xl font-black text-state-info tabular-nums">{{ fmtTZS(wallet.amoviewBalanceTZS || 0) }}</p>
          </div>
          <div>
            <label class="field-label">Amount (TZS)</label>
            <div class="flex gap-1.5 flex-wrap">
              <button v-for="q in [1000, 5000, 10000, 20000, wallet.amoviewBalanceTZS]" :key="q"
                      v-show="q > 0 && q <= (wallet.amoviewBalanceTZS || 0)"
                      class="chip-neutral !text-xs"
                      :class="transfer.amount === q ? '!bg-state-info !text-white' : ''"
                      @click="transfer.amount = q">
                {{ q === wallet.amoviewBalanceTZS ? 'All' : q.toLocaleString() }}
              </button>
            </div>
            <input type="number" min="100" :max="wallet.amoviewBalanceTZS || 0" v-model.number="transfer.amount"
                   placeholder="Or type any amount (min 100)" class="field-input mt-2" />
          </div>
          <p v-if="transferSuccess" class="text-sm text-state-success font-bold">
            ✓ Moved {{ fmtTZS(transferSuccess) }} — AmoEvents wallet updated.
          </p>
          <p v-if="transferErr" class="text-sm text-state-danger font-medium">{{ transferErr }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-ghost" @click="transferOpen = false">{{ transferSuccess ? 'Done' : 'Cancel' }}</button>
            <AppButton v-if="!transferSuccess" :loading="transferBusy"
                       :disabled="!transfer.amount || transfer.amount < 100"
                       @click="doTransfer">
              Move {{ (transfer.amount || 0).toLocaleString() }} TZS
            </AppButton>
          </div>
        </div>
      </AppModal>

      <div v-if="bundles.length" class="pt-3">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-2 flex items-center gap-1.5">
          Or pick a bundle
          <InfoHint text="Bundles include bonus messages and sometimes extra services — better value than plain TZS." />
        </p>
      </div>

      <div v-if="!bundles.length" class="surface-card p-8 text-center text-subtext">
        No bundles are on sale right now — you can still top up any amount above.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="b in bundles" :key="b._id" class="surface-card p-5 relative flex flex-col">
          <span v-if="b.badge" class="chip-warn !text-2xs absolute top-3 right-3">{{ b.badge }}</span>
          <p class="text-heading">{{ b.name }}</p>
          <p class="text-3xl font-black text-brand-primary-deep dark:text-brand-primary-soft mt-1">{{ fmtTZS(b.priceTZS) }}</p>
          <ul class="text-sm text-surface-charcoal dark:text-surface-bone mt-3 space-y-1 flex-1">
            <li v-if="b.smsUnits"><strong>{{ b.smsUnits.toLocaleString() }}</strong> SMS messages</li>
            <li v-if="b.waUnits"><strong>{{ b.waUnits.toLocaleString() }}</strong> WhatsApp messages</li>
            <li v-if="b.walletCreditTZS">+ <strong>{{ fmtTZS(b.walletCreditTZS) }}</strong> in wallet credit</li>
          </ul>
          <div class="mt-4 space-y-2">
            <button class="btn-primary w-full" @click="openCheckout(b)">
              Pay with mobile-money push
            </button>
            <!-- Wallet button — enabled only when the tenant already has
                 enough TZS to cover the SKU price. Otherwise shown greyed
                 out with a "Top up first" hint so users understand why. -->
            <button type="button"
                    class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-colors"
                    :class="hasEnoughInWallet(b)
                      ? 'border-brand-primary-deep/40 text-brand-primary-deep dark:text-brand-primary-soft hover:bg-brand-primary-glow'
                      : 'border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash cursor-not-allowed opacity-70'"
                    :disabled="!hasEnoughInWallet(b) || walletBuying === b._id"
                    @click="buyFromWallet(b)">
              <span v-if="walletBuying === b._id" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
              {{ hasEnoughInWallet(b) ? `Pay from wallet (${fmtTZS(wallet.balanceTZS)})` : `Wallet: ${fmtTZS(wallet.balanceTZS)} — top up first` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppModal v-model="topupOpen" title="Top up your wallet" :maxWidth="440">
      <div class="space-y-3">
        <div>
          <label class="field-label">Amount (TZS)</label>
          <div class="grid grid-cols-4 gap-2 mb-2">
            <button v-for="q in [5000, 10000, 25000, 50000]" :key="q"
                    class="rounded-lg py-2 text-sm font-bold border-2 transition"
                    :class="topup.amount === q
                      ? 'border-brand-gold bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft'
                      : 'border-surface-mist dark:border-surface-fog hover:border-brand-gold/60'"
                    @click="topup.amount = q">{{ q.toLocaleString() }}</button>
          </div>
          <input type="number" min="500" v-model.number="topup.amount" placeholder="Or type any amount (min 500)" class="field-input" />
        </div>
        <PhoneInput v-model="topup.phone" label="Mobile money phone" />
        <div>
          <label class="field-label">Network</label>
          <select v-model="topup.correspondent" class="field-input">
            <option value="" disabled>Select network</option>
            <option v-for="n in NETWORKS" :key="n.value" :value="n.value">{{ n.label }}</option>
          </select>
        </div>
        <div v-if="topupStage === 'pending'" class="text-sm text-brand-gold-deep dark:text-brand-gold-soft">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin"></span>
          Approve the {{ networkLabel(topup.correspondent) }} prompt on your phone.
        </div>
        <div v-if="topupStage === 'success'" class="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
          ✓ Paid — {{ topup.amount.toLocaleString() }} TZS added to your wallet.
        </div>
        <p v-if="topupErr" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ topupErr }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="closeTopup">{{ topupStage === 'success' ? 'Done' : 'Cancel' }}</button>
          <AppButton v-if="topupStage !== 'success'" :loading="topupBusy"
                     :disabled="!topup.amount || topup.amount < 500 || !topup.phone || !topup.correspondent"
                     @click="doTopup">
            Send prompt
          </AppButton>
        </div>
      </div>
    </AppModal>

    <AppModal v-model="checkoutOpen" title="Complete purchase" :maxWidth="440">
      <div v-if="chosen" class="space-y-3">
        <div class="surface-inset p-3 rounded-lg">
          <p class="text-heading">{{ chosen.name }}</p>
          <p class="text-xl font-black text-brand-gold-deep dark:text-brand-gold-soft">{{ fmtTZS(chosen.priceTZS) }}</p>
        </div>

        <PhoneInput v-model="checkout.phone" label="Mobile money phone" />
        <div>
          <label class="field-label">Network</label>
          <select v-model="checkout.correspondent" class="field-input">
            <option value="" disabled>Select network</option>
            <option v-for="n in NETWORKS" :key="n.value" :value="n.value">{{ n.label }}</option>
          </select>
        </div>

        <div v-if="stage === 'pending'" class="text-sm text-brand-gold-deep dark:text-brand-gold-soft">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin"></span>
          Approve the {{ networkLabel(checkout.correspondent) }} prompt on your phone.
        </div>
        <div v-if="stage === 'success'" class="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
          ✓ Paid — {{ chosen.name }} added to your balance.
        </div>
        <p v-if="err" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ err }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="closeCheckout">{{ stage === 'success' ? 'Done' : 'Cancel' }}</button>
          <AppButton v-if="stage !== 'success'" :loading="checkingOut"
                     :disabled="!checkout.phone || !checkout.correspondent" @click="doCheckout">
            Send payment prompt
          </AppButton>
        </div>
      </div>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ArrowPathIcon, PlusIcon } from '@heroicons/vue/24/outline';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppButton from '@/components/common/AppButton.vue';
import InfoHint from '@/components/common/InfoHint.vue';
import { Button, StatTile } from '@/components/ui';
import PhoneInput from '@/components/common/PhoneInput.vue';

const NETWORKS = [
  { value: 'MPESA_TZA',   label: 'M-Pesa (Vodacom)' },
  { value: 'TIGO_TZA',    label: 'Mixx by Yas (was Tigo Pesa)' },
  { value: 'AIRTEL_TZA',  label: 'Airtel Money' },
  { value: 'HALOTEL_TZA', label: 'HaloPesa' },
];
const networkLabel = (v) => NETWORKS.find((n) => n.value === v)?.label || 'mobile-money';

const toast = useToast();
const loading = ref(true);
const bundles = ref([]);
const wallet = ref({});
const fmtTZS = (n) => (Number(n || 0)).toLocaleString('sw-TZ') + ' TZS';

const topupOpen = ref(false);
const topup = reactive({ amount: 5000, phone: '', correspondent: '' });
const topupBusy = ref(false);
const topupErr = ref('');
const topupStage = ref('idle');
let topupTimer = null;

function openTopup() {
  topup.amount = 5000; topup.phone = ''; topup.correspondent = '';
  topupErr.value = ''; topupStage.value = 'idle';
  topupOpen.value = true;
}
function closeTopup() {
  topupOpen.value = false;
  clearInterval(topupTimer); topupTimer = null;
}

async function doTopup() {
  topupErr.value = ''; topupBusy.value = true; topupStage.value = 'idle';
  try {
    const { data } = await http.post('/messaging/bundles/topup', {
      amountTZS: Number(topup.amount),
      phone: topup.phone.trim(),
      correspondent: topup.correspondent,
    });
    const d = data?.data || data;
    topupStage.value = 'pending';
    pollStatus(d.depositId, 'topup');
  } catch (e) { topupErr.value = apiErrorMessage(e); topupStage.value = 'idle'; }
  finally { topupBusy.value = false; }
}

const checkoutOpen = ref(false);
const chosen = ref(null);
const checkout = reactive({ phone: '', correspondent: '' });
const checkingOut = ref(false);
const stage = ref('idle');
const err = ref('');
let pollTimer = null;

// Amoview → AmoEvents transfer state. Runs against the shared bridge
// (server-to-server debit + credit inside one AmoEvents endpoint). No
// mobile-money prompt involved — the user's Amoview TZS just moves over.
const transferOpen = ref(false);
const transfer = reactive({ amount: 5000 });
const transferBusy = ref(false);
const transferErr = ref('');
const transferSuccess = ref(0);
function openAmoviewTransfer() {
  const max = wallet.value.amoviewBalanceTZS || 0;
  transfer.amount = Math.min(5000, max);
  transferErr.value = ''; transferSuccess.value = 0;
  transferOpen.value = true;
}
async function doTransfer() {
  if (transferBusy.value) return;
  transferBusy.value = true;
  transferErr.value = ''; transferSuccess.value = 0;
  try {
    const { data } = await http.post('/messaging/wallet/transfer-from-amoview', {
      amountTZS: Number(transfer.amount),
    });
    const d = data?.data || data;
    transferSuccess.value = d.transferred;
    await refresh();
  } catch (e) { transferErr.value = apiErrorMessage(e); }
  finally { transferBusy.value = false; }
}

// Wallet-pay state — tracks which SKU is mid-charge so its button spins.
const walletBuying = ref(null);
const hasEnoughInWallet = (b) => (wallet.value.balanceTZS || 0) >= (b.priceTZS || 0);
async function buyFromWallet(b) {
  if (!hasEnoughInWallet(b) || walletBuying.value) return;
  walletBuying.value = b._id;
  try {
    await http.post(`/messaging/bundles/${b._id}/checkout-wallet`);
    toast.success(`${b.name} added — paid from wallet`);
    await refresh();
  } catch (e) { toast.error(apiErrorMessage(e)); }
  finally { walletBuying.value = null; }
}

async function refresh() {
  loading.value = true;
  try {
    const [b, w] = await Promise.all([
      http.get('/messaging/bundles'),
      http.get('/messaging/wallet'),
    ]);
    bundles.value = b.data?.data || b.data;
    wallet.value = w.data?.data || w.data;
  } catch (e) { toast.error(apiErrorMessage(e)); }
  finally { loading.value = false; }
}

function openCheckout(b) {
  chosen.value = b;
  checkout.phone = ''; checkout.correspondent = '';
  stage.value = 'idle'; err.value = '';
  checkoutOpen.value = true;
}
function closeCheckout() {
  checkoutOpen.value = false;
  clearInterval(pollTimer); pollTimer = null;
}
onBeforeUnmount(() => { clearInterval(pollTimer); clearInterval(topupTimer); });

async function doCheckout() {
  err.value = ''; checkingOut.value = true; stage.value = 'idle';
  try {
    const { data } = await http.post(`/messaging/bundles/${chosen.value._id}/checkout`, {
      phone: checkout.phone.trim(),
      correspondent: checkout.correspondent,
    });
    const d = data?.data || data;
    stage.value = 'pending';
    pollStatus(d.depositId, 'checkout');
  } catch (e) { err.value = apiErrorMessage(e); stage.value = 'idle'; }
  finally { checkingOut.value = false; }
}

// Shared poller — hits GET /purchases/:depositId which does an on-demand
// PawaPay status pull server-side (no webhook needed for the credit).
function pollStatus(depositId, which) {
  const timerRef = which === 'topup' ? { set: (t) => topupTimer = t, get: () => topupTimer }
                                     : { set: (t) => pollTimer = t,  get: () => pollTimer };
  const setStage = (s) => which === 'topup' ? (topupStage.value = s) : (stage.value = s);
  const setErr = (e) => which === 'topup' ? (topupErr.value = e) : (err.value = e);

  clearInterval(timerRef.get());
  let ticks = 0;
  const id = setInterval(async () => {
    ticks += 1;
    try {
      const { data } = await http.get(`/messaging/bundles/purchases/${depositId}`);
      const p = data?.data || data;
      if (p.status === 'completed') {
        setStage('success');
        clearInterval(id);
        await refresh();
      } else if (['failed', 'cancelled'].includes(p.status)) {
        setErr(p.failureReason || 'Payment did not go through — try again.');
        setStage('idle');
        clearInterval(id);
      } else if (ticks > 90) {
        setErr('Timed out waiting for approval. Try again.');
        setStage('idle');
        clearInterval(id);
      }
    } catch (_) { /* keep polling */ }
  }, 2000);
  timerRef.set(id);
}

onMounted(refresh);
</script>
