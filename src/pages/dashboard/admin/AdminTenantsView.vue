<template>
  <PageShell title="Tenants" description="Every workspace across the platform. Search by name, phone, or email.">

    <div class="surface-card p-4 mb-4 flex items-center gap-3">
      <MagnifyingGlassIcon class="w-4 h-4 text-surface-slate ml-1" />
      <input v-model="q" @keydown.enter="refresh"
             class="flex-1 bg-transparent text-md outline-none placeholder:text-surface-slate/60"
             placeholder="Search name, phone, email…" />
      <select v-model="status" @change="refresh" class="field-input !py-1.5 !text-sm !w-40">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else class="surface-card overflow-hidden">
      <table class="w-full text-md">
        <thead>
          <tr class="text-left text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash border-b border-surface-mist dark:border-surface-fog">
            <th class="px-5 py-3 font-black">Tenant</th>
            <th class="px-5 py-3 font-black">Phone</th>
            <th class="px-5 py-3 font-black">Plan</th>
            <th class="px-5 py-3 font-black">Status</th>
            <th class="px-5 py-3 font-black">Since</th>
            <th class="px-5 py-3 font-black"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in items" :key="t._id" class="border-b border-surface-mist dark:border-surface-fog hover:bg-surface-mist/30 dark:hover:bg-surface-fog/30">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-xs font-black">
                  {{ initials(t.name) }}
                </div>
                <div>
                  <p class="font-extrabold text-surface-charcoal dark:text-surface-bone">{{ t.name }}</p>
                  <p class="text-subtext">{{ t.email || '—' }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-4 tabular-nums text-sm">{{ t.phone }}</td>
            <td class="px-5 py-4 text-sm capitalize">{{ t.plan || 'free' }}</td>
            <td class="px-5 py-4">
              <span :class="t.status === 'active' ? 'chip-success' : 'chip-danger'">{{ t.status }}</span>
            </td>
            <td class="px-5 py-4 text-subtext">{{ formatDate(t.createdAt) }}</td>
            <td class="px-5 py-4 text-right whitespace-nowrap">
              <button class="btn-ghost !text-xs !py-1 !px-2" @click="toggle(t)">
                {{ t.status === 'active' ? 'Suspend' : 'Activate' }}
              </button>
              <button class="btn-danger !text-xs !py-1 !px-2 ml-1" @click="remove(t)">
                <TrashIcon class="w-3 h-3" />
              </button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="6" class="text-center py-16 text-subtext">No tenants match</td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/vue/24/outline';
import http, { unwrap, apiErrorMessage } from '@/services/http';
import { formatDate } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const toast = useToast();
const items = ref([]);
const loading = ref(true);
const q = ref('');
const status = ref('');

async function refresh() {
  loading.value = true;
  try {
    const res = await http.get('/admin/tenants', { params: { q: q.value || undefined, status: status.value || undefined, limit: 200 } });
    items.value = unwrap(res);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function toggle(t) {
  try {
    const path = t.status === 'active' ? 'suspend' : 'activate';
    await http.post(`/admin/tenants/${t._id}/${path}`);
    t.status = t.status === 'active' ? 'suspended' : 'active';
    toast.success('Updated');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function remove(t) {
  if (!(await askConfirm(`Delete tenant "${t.name}" and all its users? Events must be deleted first.`))) return;
  try {
    await http.delete(`/admin/tenants/${t._id}`);
    items.value = items.value.filter((x) => x._id !== t._id);
    toast.success('Deleted');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

function initials(name) { return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

onMounted(refresh);
</script>
