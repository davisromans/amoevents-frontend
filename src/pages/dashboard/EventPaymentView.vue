<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
    <PageHeader title="Pay for this event" :back="`/app/events/${route.params.id}`" />

    <div v-if="event?.paymentStatus === 'paid'" class="surface-card p-5 border-l-4 border-l-emerald-500 mb-5 flex items-start gap-3">
      <CheckCircleIcon class="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
      <div>
        <p class="text-heading">Payment confirmed</p>
        <p class="text-subtext">You can send invitations and reminders now.</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <template v-else>
      <!-- Package picker — real catalog (PricingTier/PricingAddon), nothing
           typed. Hidden once fully paid; still visible while partial so the
           organizer can see what they picked. -->
      <section v-if="event?.paymentStatus !== 'paid'" class="mb-6">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft mb-3">Choose your package</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button v-for="tier in catalog.tiers" :key="tier._id"
                  class="surface-card p-5 text-left relative flex flex-col transition-all border-2"
                  :class="billing.mode === 'package' && String(billing.tierId?._id || billing.tierId) === tier._id
                    ? 'border-brand-gold bg-brand-gold-glow/20'
                    : 'border-transparent hover:border-brand-gold/40'"
                  @click="pickTier(tier)">
            <p class="text-heading">{{ tier.name }}</p>
            <p class="text-2xl font-black text-brand-gold-deep dark:text-brand-gold-soft mt-1">
              {{ fmtTZS(tier.priceTZS) }}<span class="text-sm font-bold text-subtext">/card</span>
            </p>
            <p class="text-subtext mt-0.5">Up to {{ tier.slots.toLocaleString() }} guests · {{ fmtTZS(tier.priceTZS * tier.slots) }} total</p>
            <ul class="text-sm text-surface-charcoal dark:text-surface-bone mt-3 space-y-1 flex-1">
              <li class="flex items-start gap-1.5">
                <CheckIcon class="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                {{ fmtTZS(tier.bundledSmsUnits) }} SMS + {{ fmtTZS(tier.bundledWaUnits) }} WhatsApp budget per guest
              </li>
              <li v-if="tier.perksFeatureFlags?.length || tier.includesReminderCascade" class="flex items-start gap-1.5">
                <CheckIcon class="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                {{ tierHighlight(tier) }}
              </li>
              <li v-if="tier.storageYears" class="flex items-start gap-1.5">
                <CheckIcon class="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                {{ tier.storageYears }}-year gallery storage + guest wallet credits
              </li>
              <li v-if="tier.bundledFulfillmentItems?.length" class="flex items-start gap-1.5">
                <CheckIcon class="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                {{ tier.bundledFulfillmentItems.join(', ') }} included
              </li>
            </ul>
            <button class="text-2xs text-subtext underline mt-3 self-start" @click.stop="expandedTier = expandedTier === tier._id ? null : tier._id">
              {{ expandedTier === tier._id ? 'Hide details' : 'See full details' }}
            </button>
            <ul v-if="expandedTier === tier._id" class="text-2xs text-subtext mt-2 space-y-1 border-t border-surface-mist dark:border-surface-fog pt-2">
              <li v-for="(f, i) in tier.features" :key="i">• {{ f }}</li>
            </ul>
          </button>
          <button class="surface-card p-5 text-left flex flex-col justify-center items-center gap-1 border-2 transition-all"
                  :class="billing.mode === 'per_card' ? 'border-brand-gold bg-brand-gold-glow/20' : 'border-transparent hover:border-brand-gold/40'"
                  @click="pickPerCard">
            <p class="text-heading">Pay per card</p>
            <p class="text-subtext text-center">{{ fmtTZS(catalog.perCard?.rateTZS) }} per guest — no package commitment.</p>
          </button>
        </div>

        <!-- Add-ons — only meaningful in package mode. Storage duration is
             mutually-exclusive (a plan, not a stacking quantity); every
             other add-on takes a real quantity, since most of these are
             metered (guests funded, messages, extra slots), not toggles. -->
        <div v-if="billing.mode === 'package'" class="mt-4 space-y-5">
          <div v-for="cat in addonCategories" :key="cat">
            <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-2">{{ cat }}</p>

            <!-- Storage — radio-style, one plan at a time. -->
            <div v-if="cat === 'Storage' && storageAddons.length" class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <label v-for="addon in storageAddons" :key="addon._id"
                     class="surface-card p-3 flex items-start gap-2 cursor-pointer border-2"
                     :class="isAddonSelected(addon._id) ? 'border-brand-gold bg-brand-gold-glow/20' : 'border-transparent'">
                <input type="radio" name="storage-plan" class="w-4 h-4 accent-brand-gold shrink-0 mt-0.5"
                       :checked="isAddonSelected(addon._id)" @change="pickStoragePlan(addon)" />
                <span class="min-w-0">
                  <span class="block text-heading">{{ addon.name }}</span>
                  <span class="block text-subtext">{{ addon.description }}</span>
                </span>
              </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="addon in addonsByCategory(cat)" :key="addon._id"
                   class="surface-card p-3 flex items-center gap-3"
                   :class="isAddonSelected(addon._id) ? 'border-2 border-brand-gold bg-brand-gold-glow/10' : ''">
                <span class="min-w-0 flex-1">
                  <span class="block text-heading">{{ addon.name }}</span>
                  <span class="block text-subtext">{{ addon.description }}</span>
                  <span class="block text-2xs text-subtext mt-0.5">{{ fmtTZS(addon.priceTZS) }} / {{ addon.unit }}</span>
                </span>
                <input type="number" class="field-input !w-20 !py-1 !text-sm !text-center shrink-0"
                       :min="addon.minQty || 1" :max="addon.maxQty || undefined"
                       :placeholder="String(addon.minQty || 1)"
                       :value="addonQty(addon._id)"
                       @change="setAddonQty(addon, $event.target.value)" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="savingPackage" class="text-xs text-subtext mt-2">Saving…</div>
      </section>

      <!-- Current total -->
      <div class="surface-card p-4 mb-5 flex items-center justify-between gap-3">
        <div>
          <p class="text-heading">Total for this event</p>
          <p class="text-subtext">Paid {{ fmtTZS(billing.amountPaidTZS) }} of {{ fmtTZS(billing.computedTotalTZS) }}</p>
        </div>
        <p class="text-2xl font-black" :class="billing.balanceTZS > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
          {{ billing.balanceTZS > 0 ? fmtTZS(billing.balanceTZS) + ' due' : 'Paid in full' }}
        </p>
      </div>

      <!-- Wallet-pay — no phone push, deducts from the tenant TZS balance. -->
      <div v-if="billing.balanceTZS > 0 && (wallet.balanceTZS || 0) > 0" class="surface-card p-4 sm:p-6 mb-6 border-brand-primary-deep/30">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0 flex-1">
            <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-1">Pay from wallet</p>
            <p class="text-heading">Wallet balance: <span class="tabular-nums">{{ fmtTZS(wallet.balanceTZS) }}</span></p>
            <p class="text-subtext mt-1">
              We'll deduct
              <strong class="tabular-nums text-surface-charcoal dark:text-surface-bone">{{ fmtTZS(walletChargeAmount) }}</strong>
              from your wallet — no mobile-money prompt.
              <span v-if="(wallet.balanceTZS || 0) < billing.balanceTZS">This covers a partial payment; the rest stays on the balance until you pay it another way.</span>
            </p>
          </div>
          <AppButton :loading="walletPaying" :disabled="walletChargeAmount <= 0" @click="payFromWallet">
            Pay {{ fmtTZS(walletChargeAmount) }} from wallet
          </AppButton>
        </div>
      </div>

      <!-- PawaPay checkout — the primary, real payment path. Amount is
           editable and defaults to the full balance — pay less now (e.g.
           guest count may still grow and change the final total) and
           finish the rest later; the event stays "partial" until the
           balance actually reaches zero. -->
      <div v-if="billing.balanceTZS > 0" class="surface-card p-4 sm:p-6 mb-6">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft mb-3">Pay with mobile money</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PhoneInput v-model="checkout.phone" label="Mobile money phone" />
          <div>
            <label class="field-label">Network</label>
            <select v-model="checkout.correspondent" class="field-input">
              <option value="" disabled>Select network</option>
              <option v-for="n in NETWORKS" :key="n.value" :value="n.value">{{ n.label }}</option>
            </select>
          </div>
        </div>
        <div class="mt-3">
          <AppInput v-model="checkoutAmount" label="Amount to pay now (TZS)" thousands />
          <p class="text-2xs text-subtext mt-1">
            <span v-if="checkoutAmountValid && checkoutAmount < billing.balanceTZS">
              Paying part now — {{ fmtTZS(billing.balanceTZS - checkoutAmount) }} will remain due after this.
            </span>
            <span v-else>Balance due: {{ fmtTZS(billing.balanceTZS) }}.</span>
            <button type="button" class="underline ml-1" @click="checkoutAmount = billing.balanceTZS">Pay full balance</button>
          </p>
        </div>
        <div v-if="checkoutStage === 'pending'" class="text-sm text-brand-gold-deep dark:text-brand-gold-soft mt-3">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-current border-r-transparent animate-spin"></span>
          Approve the {{ networkLabel(checkout.correspondent) }} prompt on your phone.
        </div>
        <div v-if="checkoutStage === 'success'" class="text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-3">
          ✓ Paid — thank you.
        </div>
        <p v-if="checkoutErr" class="text-sm text-red-600 dark:text-red-400 font-medium mt-3">{{ checkoutErr }}</p>
        <div class="flex justify-end mt-4">
          <AppButton v-if="checkoutStage !== 'success'" :loading="checkingOut"
                     :disabled="!checkout.phone || !checkout.correspondent || !checkoutAmountValid" @click="doCheckout">
            Send payment prompt for {{ fmtTZS(checkoutAmount) }}
          </AppButton>
        </div>
      </div>

      <!-- Manual fallback — bank transfer / cash, reviewed by AmoEvents staff. -->
      <details v-if="billing.balanceTZS > 0" class="surface-card p-4 sm:p-6">
        <summary class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash cursor-pointer">
          Paid by bank transfer or cash instead?
        </summary>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div v-for="i in instructions" :key="i.method" class="surface-inset p-3 rounded-lg">
            <p class="text-heading mb-1">{{ i.label }}</p>
            <ol class="space-y-1 text-sm text-surface-charcoal dark:text-surface-bone">
              <li v-for="(s, idx) in i.steps" :key="idx" class="flex items-start gap-2">
                <span class="chip-gold shrink-0 !text-2xs">{{ idx + 1 }}</span>
                <span>{{ s }}</span>
              </li>
            </ol>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect v-model="form.method" label="Payment method *" :options="METHOD_OPTIONS" />
            <div>
              <AppInput v-model="form.amountTZS" label="Amount (TZS) *" thousands placeholder="75,000" required />
              <p class="text-2xs text-subtext mt-1">Doesn't have to be the full {{ fmtTZS(billing.balanceTZS) }} due — a partial payment is fine, and the balance updates once we confirm it.</p>
            </div>
          </div>
          <AppInput v-model="form.reference" label="Reference number *" placeholder="e.g. M-Pesa confirmation code" required />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput v-model="form.payerName" label="Payer name (if different)" />
            <AppInput v-model="form.payerPhone" label="Payer phone (if different)" />
          </div>
          <AppInput v-model="form.note" label="Note (optional)" type="textarea" :rows="2" />
          <p v-if="serverError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ serverError }}</p>
          <p class="text-xs text-subtext">A staff member reviews and confirms this manually — it can take a little longer than mobile money.</p>
          <div class="flex justify-end">
            <AppButton :loading="submitting" type="submit">
              <PaperAirplaneIcon class="w-4 h-4" /> Submit for review
            </AppButton>
          </div>
        </form>
      </details>

      <!-- History -->
      <div v-if="submissions.length" class="mt-6">
        <h2 class="text-heading mb-3">Your manual submissions</h2>
        <div class="space-y-2">
          <div v-for="s in submissions" :key="s._id" class="surface-card p-3 flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="statusBg(s.status)">
              <component :is="statusIcon(s.status)" class="w-4 h-4" />
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-heading">
                {{ formatTZS(s.amountTZS) }} · <span class="uppercase">{{ s.method }}</span>
              </p>
              <p class="text-subtext truncate">
                Ref: <code class="chip !text-2xs !py-0 !px-1">{{ s.reference }}</code> · {{ new Date(s.createdAt).toLocaleString() }}
              </p>
              <p v-if="s.reviewNote" class="text-subtext mt-0.5 italic">{{ s.reviewNote }}</p>
            </div>
            <span :class="statusChip(s.status)">{{ s.status }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, PaperAirplaneIcon, CheckIcon } from '@heroicons/vue/24/outline';
import http from '@/services/http';
import {
  getInstructions, listMySubmissions, submitPayment,
  getBillingCatalog, getBillingSummary, selectPackage, checkoutPackage, pollCheckout, checkoutFromWallet,
} from '@/services/payments.service';
import { getEvent } from '@/services/events.service';
import { formatTZS } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';
import PhoneInput from '@/components/common/PhoneInput.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const METHOD_OPTIONS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'tigopesa', label: 'Tigo Pesa' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'halopesa', label: 'Halopesa' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];
const NETWORKS = [
  { value: 'MPESA_TZA',   label: 'M-Pesa (Vodacom)' },
  { value: 'TIGO_TZA',    label: 'Mixx by Yas (was Tigo Pesa)' },
  { value: 'AIRTEL_TZA',  label: 'Airtel Money' },
  { value: 'HALOTEL_TZA', label: 'HaloPesa' },
];
const networkLabel = (v) => NETWORKS.find((n) => n.value === v)?.label || 'mobile-money';
const fmtTZS = (n) => (Number(n || 0)).toLocaleString('sw-TZ') + ' TZS';

const route = useRoute();
const toast = useToast();
const loading = ref(true);
const event = ref(null);
const instructions = ref([]);
const submissions = ref([]);
const catalog = ref({ tiers: [], addons: [], perCard: {} });
const billing = ref({ mode: 'per_card', tierId: null, addons: [], computedTotalTZS: 0, amountPaidTZS: 0, balanceTZS: 0 });
const wallet = ref({ balanceTZS: 0 });
// How much we'd deduct from the wallet: never more than the outstanding
// balance, never more than the wallet has.
const walletChargeAmount = computed(() => Math.min(wallet.value.balanceTZS || 0, billing.value.balanceTZS || 0));
const walletPaying = ref(false);
async function payFromWallet() {
  if (walletPaying.value || walletChargeAmount.value <= 0) return;
  walletPaying.value = true;
  try {
    const amount = walletChargeAmount.value;
    await checkoutFromWallet(route.params.id, amount);
    toast.success(`Paid ${formatTZS(amount)} from wallet`);
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { walletPaying.value = false; }
}
const savingPackage = ref(false);
const expandedTier = ref(null);

function tierHighlight(tier) {
  const flags = tier.perksFeatureFlags || [];
  const labels = {
    showGallery: 'Photo gallery', tvMode: 'Live TV mode', prioritySupport: 'Priority support',
    whiteLabel: 'White-label branding', multiLanguage: 'Multi-language pages',
  };
  const parts = flags.map((f) => labels[f]).filter(Boolean);
  if (tier.includesReminderCascade) parts.unshift('Automatic reminders');
  return parts.join(' · ') || 'Included perks';
}

const submitting = ref(false);
const serverError = ref('');
const form = reactive({ method: 'mpesa', amountTZS: null, reference: '', payerName: '', payerPhone: '', note: '' });

function statusChip(s) { return { pending: 'chip-warn', confirmed: 'chip-success', rejected: 'chip-danger' }[s] || 'chip'; }
function statusIcon(s) { return { pending: ClockIcon, confirmed: CheckCircleIcon, rejected: ExclamationCircleIcon }[s] || ClockIcon; }
function statusBg(s) {
  return { pending: 'bg-amber-500/15 text-amber-500', confirmed: 'bg-emerald-500/15 text-emerald-500', rejected: 'bg-red-500/15 text-red-500' }[s] || '';
}

async function refresh() {
  try {
    const [ev, ins, subs, cat, bill, w] = await Promise.all([
      getEvent(route.params.id),
      getInstructions(route.params.id),
      listMySubmissions(route.params.id),
      getBillingCatalog(route.params.id),
      getBillingSummary(route.params.id),
      http.get('/messaging/wallet').then((r) => r.data?.data || r.data).catch(() => ({ balanceTZS: 0 })),
    ]);
    event.value = ev.event;
    instructions.value = ins;
    submissions.value = subs;
    catalog.value = cat;
    billing.value = bill.billing;
    wallet.value = w || { balanceTZS: 0 };
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

function isAddonSelected(addonId) {
  return (billing.value.addons || []).some((a) => String(a.addonId?._id || a.addonId) === addonId);
}
function addonQty(addonId) {
  const a = (billing.value.addons || []).find((x) => String(x.addonId?._id || x.addonId) === addonId);
  return a ? a.qty : '';
}
// Every add-on category except Storage — sorted so category headers render
// in a stable, sensible order even though the catalog itself is one flat list.
const CATEGORY_ORDER = ['Guests', 'Messaging', 'Storage', 'Design', 'Support', 'Advanced'];
const addonCategories = computed(() => {
  const present = new Set((catalog.value.addons || []).map((a) => a.category || 'General'));
  return CATEGORY_ORDER.filter((c) => present.has(c)).concat([...present].filter((c) => !CATEGORY_ORDER.includes(c)));
});
const storageAddons = computed(() => (catalog.value.addons || []).filter((a) => a.effect === 'storage_years'));
function addonsByCategory(cat) {
  return (catalog.value.addons || []).filter((a) => (a.category || 'General') === cat && a.effect !== 'storage_years');
}

async function pickTier(tier) {
  savingPackage.value = true;
  try {
    const addonSelections = (billing.value.addons || []).map((a) => ({ addonId: String(a.addonId?._id || a.addonId), qty: a.qty }));
    const res = await selectPackage(route.params.id, { mode: 'package', tierId: tier._id, addonSelections });
    billing.value = res.billing;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingPackage.value = false; }
}

async function pickPerCard() {
  savingPackage.value = true;
  try {
    const res = await selectPackage(route.params.id, { mode: 'per_card' });
    billing.value = res.billing;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingPackage.value = false; }
}

function currentAddonSelections() {
  return (billing.value.addons || []).map((a) => ({ addonId: String(a.addonId?._id || a.addonId), qty: a.qty }));
}
async function saveAddonSelections(selections) {
  savingPackage.value = true;
  try {
    const tierId = String(billing.value.tierId?._id || billing.value.tierId);
    const res = await selectPackage(route.params.id, { mode: 'package', tierId, addonSelections: selections });
    billing.value = res.billing;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingPackage.value = false; }
}

// Numeric quantity input, committed on change/blur — 0 or blank removes
// the add-on entirely rather than leaving a zero-qty row.
function setAddonQty(addon, rawValue) {
  const qty = Math.max(0, Math.floor(Number(rawValue) || 0));
  const current = currentAddonSelections();
  const idx = current.findIndex((a) => a.addonId === addon._id);
  if (qty <= 0) {
    if (idx >= 0) current.splice(idx, 1); else return; // nothing to save
  } else if (idx >= 0) {
    current[idx].qty = qty;
  } else {
    current.push({ addonId: addon._id, qty });
  }
  saveAddonSelections(current);
}

// Storage plans are mutually exclusive — selecting one drops any other
// storage_years addon from the selection before adding the new one.
function pickStoragePlan(addon) {
  const storageIds = new Set(storageAddons.value.map((a) => a._id));
  const current = currentAddonSelections().filter((a) => !storageIds.has(a.addonId));
  current.push({ addonId: addon._id, qty: 1 });
  saveAddonSelections(current);
}

const checkout = reactive({ phone: '', correspondent: '' });
// Defaults to the full balance but the organizer can lower it — e.g. guest
// count may still grow and change the final total, so pay part now and
// finish the rest later rather than being forced to pay everything upfront.
const checkoutAmount = ref(0);
watch(() => billing.value.balanceTZS, (bal) => {
  // Only snap to the new balance if the field was still at the old full
  // balance (or empty) — don't clobber an amount the organizer typed in.
  if (checkoutAmount.value === 0 || checkoutAmount.value > bal) checkoutAmount.value = bal;
}, { immediate: true });
const checkoutAmountValid = computed(() => {
  const n = Number(checkoutAmount.value);
  return n > 0 && n <= billing.value.balanceTZS;
});
const checkingOut = ref(false);
const checkoutStage = ref('idle');
const checkoutErr = ref('');
let pollTimer = null;
onBeforeUnmount(() => clearInterval(pollTimer));

async function doCheckout() {
  if (!checkoutAmountValid.value) return;
  checkoutErr.value = ''; checkingOut.value = true; checkoutStage.value = 'idle';
  try {
    const d = await checkoutPackage(route.params.id, {
      phone: checkout.phone.trim(),
      correspondent: checkout.correspondent,
      amountTZS: Number(checkoutAmount.value),
    });
    checkoutStage.value = 'pending';
    pollDeposit(d.depositId);
  } catch (err) { checkoutErr.value = apiErrorMessage(err); checkoutStage.value = 'idle'; }
  finally { checkingOut.value = false; }
}

// Same self-serve poll pattern as the messaging-bundle checkout — the
// shared PawaPay merchant's webhook isn't guaranteed to reach this app, so
// this endpoint does an on-demand status pull server-side.
function pollDeposit(depositId) {
  clearInterval(pollTimer);
  let ticks = 0;
  pollTimer = setInterval(async () => {
    ticks += 1;
    try {
      const p = await pollCheckout(route.params.id, depositId);
      if (p.status === 'completed') {
        checkoutStage.value = 'success';
        clearInterval(pollTimer);
        await refresh();
      } else if (['failed', 'cancelled'].includes(p.status)) {
        checkoutErr.value = p.failureReason || 'Payment did not go through — try again.';
        checkoutStage.value = 'idle';
        clearInterval(pollTimer);
      } else if (ticks > 90) {
        checkoutErr.value = 'Timed out waiting for approval. Try again.';
        checkoutStage.value = 'idle';
        clearInterval(pollTimer);
      }
    } catch (_) { /* keep polling */ }
  }, 2000);
}

async function submit() {
  serverError.value = '';
  if (!form.amountTZS || form.amountTZS < 100) { serverError.value = 'Amount is required'; return; }
  if (!form.reference?.trim()) { serverError.value = 'Reference number is required'; return; }
  submitting.value = true;
  try {
    await submitPayment(route.params.id, { ...form });
    toast.success('Submitted. Amo Events will confirm shortly.');
    Object.assign(form, { amountTZS: null, reference: '', payerName: '', payerPhone: '', note: '' });
    await refresh();
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { submitting.value = false; }
}

onMounted(refresh);
</script>
