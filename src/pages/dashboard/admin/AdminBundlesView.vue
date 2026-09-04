<template>
  <PageShell title="Messaging bundles" description="What tenants can buy from the catalog. Each bundle grants real TZS wallet credit — spent per message at whatever the live Messaging Pricing rate is, not a fixed free-send count.">
    <template #actions>
      <button class="btn-primary" @click="startNew"><PlusIcon class="w-4 h-4" /> New bundle</button>
    </template>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <!-- Pool status — tells you when to top up Beem/Meta on your side -->
    <div v-else class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Revenue lifetime" :value="fmtTZS(pool.revenueTZS)" tone="success" />
        <BigStat label="SMS in play" :value="pool.smsInPlay" :meta="`granted ${pool.smsGranted} · used ${pool.smsConsumed}`" tone="gold" />
        <BigStat label="WhatsApp in play" :value="pool.waInPlay" :meta="`granted ${pool.waGranted} · used ${pool.waConsumed}`" />
        <BigStat label="Beem credits" :value="pool.providerBalances?.beem ?? '—'" :meta="pool.providerBalances?.beemError || 'from provider'" :tone="Number(pool.providerBalances?.beem || 0) < 100 ? 'warn' : 'default'" />
      </div>

      <div v-if="!items.length" class="surface-card p-8 text-center">
        <p class="text-subtext">No bundles yet — create one to let tenants pay by mobile money.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="b in items" :key="b._id" class="surface-card p-4 relative">
          <span v-if="b.badge" class="chip-gold !text-2xs absolute top-3 right-3">{{ b.badge }}</span>
          <p class="text-heading">{{ b.name }}</p>
          <p class="text-2xl font-black text-brand-gold-deep dark:text-brand-gold-soft mt-2">{{ fmtTZS(b.priceTZS) }}</p>
          <ul class="text-subtext mt-2 space-y-0.5">
            <!-- smsUnits/waUnits are legacy — only ever non-zero on a bundle created
                 before these became plain TZS credit; shown here so an old SKU's
                 card copy stays accurate, but new bundles should just use walletCreditTZS. -->
            <li v-if="b.smsUnits">+ {{ fmtTZS(b.smsUnits) }} SMS budget (legacy field)</li>
            <li v-if="b.waUnits">+ {{ fmtTZS(b.waUnits) }} WhatsApp budget (legacy field)</li>
            <li v-if="b.walletCreditTZS">{{ fmtTZS(b.walletCreditTZS) }} wallet credit</li>
          </ul>
          <p v-if="b.description" class="text-2xs text-surface-slate dark:text-surface-ash mt-2 line-clamp-2">{{ b.description }}</p>
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-surface-mist dark:border-surface-fog">
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" :checked="b.isActive" @change="toggleActive(b, $event.target.checked)" class="accent-brand-gold w-4 h-4" />
              <span>Active</span>
            </label>
            <div class="flex gap-1">
              <button class="btn-ghost !text-xs" @click="edit(b)"><PencilSquareIcon class="w-3.5 h-3.5" /></button>
              <button class="text-red-500 hover:text-red-700 p-1" @click="remove(b)"><TrashIcon class="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppModal v-model="editorOpen" :title="editing._id ? 'Edit bundle' : 'New bundle'" :maxWidth="560">
      <div class="space-y-3">
        <AppInput v-model="editing.name" label="Bundle name" placeholder="SMS Kubwa" />
        <AppInput v-model="editing.description" label="Description (shown on card)" type="textarea" :rows="2" />
        <div class="grid grid-cols-3 gap-3">
          <AppInput v-model.number="editing.priceTZS" label="Price (TZS)" type="number" min="0" />
          <AppInput v-model.number="editing.sortOrder" label="Sort order" type="number" />
          <AppInput v-model="editing.badge" label="Badge (Popular…)" placeholder="Popular" />
        </div>
        <AppInput v-model.number="editing.walletCreditTZS" label="Wallet credit (TZS) — this is what the tenant can actually spend on messages" type="number" min="0" />
        <p v-if="editing.smsUnits || editing.waUnits" class="text-2xs text-subtext">
          This bundle also has legacy smsUnits/waUnits set ({{ editing.smsUnits || 0 }} / {{ editing.waUnits || 0 }} TZS) from before the fields were consolidated — they still credit the same wallet balance, just via separate numbers. New bundles should only need Wallet credit above.
        </p>
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="editing.isActive" class="accent-brand-gold w-4 h-4" />
          <span class="text-heading">Active — visible in tenant catalog</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="editorOpen = false">Cancel</button>
          <AppButton :loading="saving" @click="save">Save</AppButton>
        </div>
      </div>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { askConfirm } from '@/composables/useConfirm';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import BigStat from '@/components/events/EventBigStat.vue';

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const items = ref([]);
const pool = ref({});
const editorOpen = ref(false);
const editing = reactive({ _id: null, slug: '', name: '', description: '', priceTZS: 0, smsUnits: 0, waUnits: 0, walletCreditTZS: 0, isActive: true, sortOrder: 0, badge: '' });

const fmtTZS = (n) => (Number(n || 0)).toLocaleString('sw-TZ') + ' TZS';

async function refresh() {
  loading.value = true;
  try {
    const [list, poolRes] = await Promise.all([
      http.get('/messaging/bundles/admin/all'),
      http.get('/messaging/bundles/admin/pool'),
    ]);
    items.value = list.data?.data || list.data;
    pool.value = poolRes.data?.data || poolRes.data;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}
function startNew() {
  Object.assign(editing, { _id: null, slug: '', name: '', description: '', priceTZS: 0, smsUnits: 0, waUnits: 0, walletCreditTZS: 0, isActive: true, sortOrder: items.value.length + 1, badge: '' });
  editorOpen.value = true;
}
function edit(b) { Object.assign(editing, b); editorOpen.value = true; }

async function save() {
  saving.value = true;
  try {
    const payload = { ...editing }; delete payload._id;
    // Slug auto-derived from name; stays stable across edits.
    if (!payload.slug) payload.slug = editing.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (editing._id) await http.patch(`/messaging/bundles/admin/${editing._id}`, payload);
    else await http.post('/messaging/bundles/admin', payload);
    toast.success('Saved');
    editorOpen.value = false;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { saving.value = false; }
}

async function toggleActive(b, isActive) {
  try {
    await http.patch(`/messaging/bundles/admin/${b._id}`, { isActive });
    b.isActive = isActive;
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function remove(b) {
  if (!(await askConfirm({ title: 'Delete bundle', message: `Delete "${b.name}"? Existing purchases keep their credit.`, danger: true }))) return;
  try { await http.delete(`/messaging/bundles/admin/${b._id}`); await refresh(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(refresh);
</script>
