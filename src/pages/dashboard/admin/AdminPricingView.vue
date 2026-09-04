<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <div class="mb-4">
      <p class="section-eyebrow mb-1">{{ t('admin.pricing.eyebrow') }}</p>
      <h1 class="section-title text-2xl">{{ t('admin.pricing.title') }}</h1>
    </div>

    <div class="inline-flex items-center gap-1 p-1 rounded-2xl surface-inset mb-5">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="px-4 py-2 rounded-xl text-md font-bold transition-all duration-200"
        :class="active === tab.value
          ? 'bg-gradient-gold text-surface-charcoal shadow-gold-soft'
          : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'"
        @click="active = tab.value"
      >{{ t(`admin.pricing.tabs.${tab.value}`) }}</button>
    </div>

    <!-- Tiers tab -->
    <section v-if="active === 'tiers'">
      <div v-if="loading.tiers" class="flex justify-center py-8"><LoadingSpinner /></div>
      <div v-else class="space-y-3">
        <div v-for="tier in tiers" :key="tier._id" class="surface-card p-5 flex flex-col gap-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppInput v-model="tier.name" :label="t('settings.name')" />
            <AppInput v-model.number="tier.slots" label="Cards" type="number" />
            <AppInput v-model="tier.priceTZS" label="TZS per card" thousands />
            <label class="flex items-center gap-2 text-md mt-6">
              <input type="checkbox" v-model="tier.isActive" class="accent-brand-gold w-4 h-4" />
              <span class="text-surface-charcoal dark:text-surface-bone">{{ t('admin.pricing.activeToggle') }}</span>
            </label>
          </div>
          <p class="text-xs text-subtext -mt-2">
            = {{ totalFor(tier) }} TZS total for {{ tier.slots || 0 }} cards.
          </p>

          <div>
            <label class="field-label">Features (one per line — these show on the public pricing page)</label>
            <textarea
              class="field-input font-mono !text-sm min-h-[90px]"
              :value="(tier.features || []).join('\n')"
              @change="tier.features = $event.target.value.split('\n').map(s => s.trim()).filter(Boolean)"
              placeholder="WhatsApp + SMS&#10;1 collaborator&#10;Basic templates"
            />
          </div>

          <!-- Real bundled resources — these actually grant on payment, not just marketing copy. See amoevents-backend's billing.service.js applyPackageEffects. -->
          <div class="surface-inset p-3 rounded-xl space-y-3">
            <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">Bundled resources — actually granted on payment</p>
            <p class="text-2xs text-subtext -mt-1">TZS per guest, spent from wallet balance at the live message rate.</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <AppInput v-model.number="tier.bundledSmsUnits" label="SMS TZS/guest" type="number" />
              <AppInput v-model.number="tier.bundledWaUnits" label="WhatsApp TZS/guest" type="number" />
              <AppInput v-model.number="tier.extraCollaboratorSlots" label="Extra collaborator slots" type="number" />
              <AppInput v-model.number="tier.bundledGuestCreditFraction" label="Guest credit fraction (0-1)" type="number" step="0.01" min="0" max="1" />
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
              <AppInput v-model.number="tier.storageYears" label="Storage plan (years, blank = default 5)" type="number" />
              <label class="flex items-center gap-2 text-md pb-2">
                <input type="checkbox" v-model="tier.includesReminderCascade" class="accent-brand-gold w-4 h-4" />
                <span class="text-surface-charcoal dark:text-surface-bone">Activates reminder cascade</span>
              </label>
            </div>
            <div>
              <label class="field-label">Feature flags this tier turns on</label>
              <div class="flex flex-wrap gap-3">
                <label v-for="f in FEATURE_FLAGS" :key="f.value" class="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" class="accent-brand-gold w-4 h-4"
                         :checked="(tier.perksFeatureFlags || []).includes(f.value)"
                         @change="toggleInArray(tier, 'perksFeatureFlags', f.value)" />
                  {{ f.label }}
                </label>
              </div>
            </div>
            <div>
              <label class="field-label">Manual/physical items included free with this tier (one per line — pings ops on payment)</label>
              <textarea
                class="field-input font-mono !text-sm min-h-[60px]"
                :value="(tier.bundledFulfillmentItems || []).join('\n')"
                @change="tier.bundledFulfillmentItems = $event.target.value.split('\n').map(s => s.trim()).filter(Boolean)"
                placeholder="Branded QR code design"
              />
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2 border-t border-surface-mist dark:border-surface-fog">
            <button class="btn-danger !text-sm !py-1.5 !px-3" @click="removeTier(tier)">{{ t('common.delete') }}</button>
            <button class="btn-primary !text-sm !py-1.5 !px-4" @click="saveTier(tier)">{{ t('common.save') }}</button>
          </div>
        </div>

        <div class="surface-inset p-4">
          <p class="text-2xs uppercase font-extrabold tracking-widest text-brand-gold-deep dark:text-brand-gold-soft mb-2">{{ t('admin.pricing.addTier') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <AppInput v-model="newTier.name" :placeholder="t('settings.name')" />
            <AppInput v-model.number="newTier.slots" placeholder="Cards" type="number" />
            <AppInput v-model="newTier.priceTZS" placeholder="TZS per card" thousands />
          </div>
          <p class="text-2xs text-subtext mt-2">Bundled resources can be filled in after creating — edit the new tier below once it appears.</p>
          <button class="btn-primary mt-3" @click="addTier"><PlusIcon class="w-4 h-4" /> {{ t('admin.pricing.addTier') }}</button>
        </div>
      </div>
    </section>

    <!-- Addons tab -->
    <section v-else-if="active === 'addons'">
      <div v-if="loading.addons" class="flex justify-center py-8"><LoadingSpinner /></div>
      <div v-else class="space-y-3">
        <div v-for="addon in addons" :key="addon._id" class="surface-card p-4 flex flex-col gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <AppInput v-model="addon.name" :label="t('settings.name')" />
            <AppInput v-model="addon.category" label="Category" placeholder="Guests / Messaging / Storage..." />
            <AppInput v-model="addon.unit" label="Unit" placeholder="each / guest / message..." />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <AppInput v-model="addon.priceTZS" label="TZS" thousands />
            <AppInput v-model.number="addon.minQty" label="Min qty" type="number" />
            <AppInput v-model.number="addon.maxQty" label="Max qty (blank = uncapped)" type="number" />
            <label class="flex items-center gap-2 text-md pb-2">
              <input type="checkbox" v-model="addon.isActive" class="accent-brand-gold w-4 h-4" />
              <span class="text-surface-charcoal dark:text-surface-bone">{{ t('admin.pricing.activeToggle') }}</span>
            </label>
          </div>

          <!-- Effect — what buying this addon actually does when the event is paid in full. -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end surface-inset p-3 rounded-xl">
            <AppSelect v-model="addon.effect" label="Effect (what this actually does)" :options="EFFECT_OPTIONS" />
            <AppInput v-if="addon.effect === 'storage_years'" v-model.number="addon.effectValue" label="Storage years" type="number" />
            <AppSelect v-if="addon.effect === 'set_feature_flag'" v-model="addon.featureFlagKey" label="Feature flag" :options="[{value:'',label:'Select...'}, ...FEATURE_FLAGS]" />
          </div>

          <AppInput v-model="addon.description" label="Description (shown to organizers)" />

          <div class="flex gap-2 justify-end pt-2 border-t border-surface-mist dark:border-surface-fog">
            <button class="btn-danger !text-sm !py-1.5 !px-3" @click="removeAddon(addon)">{{ t('common.delete') }}</button>
            <button class="btn-primary !text-sm !py-1.5 !px-4" @click="saveAddon(addon)">{{ t('common.save') }}</button>
          </div>
        </div>

        <div class="surface-inset p-4">
          <p class="text-2xs uppercase font-extrabold tracking-widest text-brand-gold-deep dark:text-brand-gold-soft mb-2">{{ t('admin.pricing.addAddon') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <AppInput v-model="newAddon.name" :placeholder="t('settings.name')" />
            <AppInput v-model="newAddon.unit" placeholder="Unit" />
            <AppInput v-model="newAddon.priceTZS" placeholder="TZS" thousands />
          </div>
          <p class="text-2xs text-subtext mt-2">Set the category/effect after creating — edit the new addon below once it appears.</p>
          <button class="btn-primary mt-3" @click="addAddon"><PlusIcon class="w-4 h-4" /> {{ t('admin.pricing.addAddon') }}</button>
        </div>
      </div>
    </section>

    <!-- Per-card tab -->
    <section v-else-if="active === 'perCard'">
      <div v-if="loading.perCard" class="flex justify-center py-8"><LoadingSpinner /></div>
      <div v-else class="surface-card p-6 max-w-md">
        <p class="section-eyebrow mb-2">{{ t('pricing.perCard.eyebrow') }}</p>
        <AppInput v-model.number="perCardRate" :label="t('admin.pricing.perCardRate')" type="number" />
        <button class="btn-primary mt-4" @click="savePerCard">{{ t('admin.pricing.updateRate') }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from '@heroicons/vue/24/outline';
import * as api from '@/services/admin.pricing.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const { t } = useI18n();
const toast = useToast();

const FEATURE_FLAGS = [
  { value: 'showGallery', label: 'Photo gallery' },
  { value: 'tvMode', label: 'Live TV mode' },
  { value: 'prioritySupport', label: 'Priority support' },
  { value: 'whiteLabel', label: 'White-label branding' },
  { value: 'multiLanguage', label: 'Multi-language pages' },
];
// Mirrors amoevents-backend's PricingAddon effect enum exactly — see
// billing.service.js's applyPackageEffects for what each one does.
const EFFECT_OPTIONS = [
  { value: 'none', label: 'None (decorative only — avoid, use fulfillment_ticket instead)' },
  { value: 'guest_credit', label: 'Funds guest wallet starter credit (qty = guests)' },
  { value: 'sms_units', label: 'Grants SMS budget (qty = TZS, not a message count)' },
  { value: 'wa_units', label: 'Grants WhatsApp budget (qty = TZS, not a message count)' },
  { value: 'extra_guests', label: 'Raises guest cap (currently inert — guest count is unlimited everywhere, avoid using this effect)' },
  { value: 'extra_collaborators', label: 'Raises collaborator slot cap (qty = slots)' },
  { value: 'storage_years', label: 'Sets gallery storage retention (see Storage years field)' },
  { value: 'set_feature_flag', label: 'Turns on a feature flag (see Feature flag field)' },
  { value: 'reminder_cascade', label: 'Activates the automatic reminder cascade' },
  { value: 'fulfillment_ticket', label: 'Manual/physical — pings ops with a fulfillment ticket' },
];

function totalFor(tier) { return ((tier.priceTZS || 0) * (tier.slots || 0)).toLocaleString(); }
function toggleInArray(obj, key, value) {
  const arr = obj[key] || [];
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
  obj[key] = arr;
}

const TABS = [
  { value: 'tiers' },
  { value: 'addons' },
  { value: 'perCard' },
];
const active = ref('tiers');

const tiers = ref([]);
const addons = ref([]);
const perCardRate = ref(300);
const loading = reactive({ tiers: true, addons: true, perCard: true });

const newTier = reactive({ name: '', slots: 100, priceTZS: 0, isActive: true, sortOrder: 999 });
const newAddon = reactive({ name: '', unit: 'each', priceTZS: 0, isActive: true, sortOrder: 999 });

async function loadAll() {
  await Promise.all([loadTiers(), loadAddons(), loadPerCard()]);
}
async function loadTiers() {
  loading.tiers = true;
  try { tiers.value = await api.listTiers(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.tiers = false; }
}
async function loadAddons() {
  loading.addons = true;
  try { addons.value = await api.listAddons(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.addons = false; }
}
async function loadPerCard() {
  loading.perCard = true;
  try { perCardRate.value = (await api.getPerCard()).rateTZS; }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.perCard = false; }
}

async function saveTier(tier) {
  try {
    const { _id, ...patch } = tier;
    await api.updateTier(_id, patch);
    toast.success(t('admin.pricing.saved'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function removeTier(tier) {
  if (!(await askConfirm(t('admin.pricing.confirmDelete')))) return;
  try {
    await api.deleteTier(tier._id);
    tiers.value = tiers.value.filter((x) => x._id !== tier._id);
    toast.success(t('admin.pricing.deleted'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function addTier() {
  if (!newTier.name) return;
  try {
    const tier = await api.createTier({ ...newTier });
    tiers.value.push(tier);
    Object.assign(newTier, { name: '', slots: 100, priceTZS: 0, isActive: true, sortOrder: 999 });
    toast.success(t('admin.pricing.created'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function saveAddon(addon) {
  try {
    const { _id, ...patch } = addon;
    await api.updateAddon(_id, patch);
    toast.success(t('admin.pricing.saved'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function removeAddon(addon) {
  if (!(await askConfirm(t('admin.pricing.confirmDelete')))) return;
  try {
    await api.deleteAddon(addon._id);
    addons.value = addons.value.filter((x) => x._id !== addon._id);
    toast.success(t('admin.pricing.deleted'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function addAddon() {
  if (!newAddon.name) return;
  try {
    const addon = await api.createAddon({ ...newAddon });
    addons.value.push(addon);
    Object.assign(newAddon, { name: '', unit: 'each', priceTZS: 0, isActive: true, sortOrder: 999 });
    toast.success(t('admin.pricing.created'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function savePerCard() {
  try {
    await api.setPerCard(perCardRate.value);
    toast.success(t('admin.pricing.saved'));
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(loadAll);
</script>
