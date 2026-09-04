<template>
  <PageShell title="Audit log" description="Every action taken on the platform, by any user, across every tenant. Immutable.">

    <div class="surface-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <MagnifyingGlassIcon class="w-4 h-4 text-surface-slate ml-1" />
      <input v-model="action" @keydown.enter="refresh"
             class="flex-1 min-w-[180px] bg-transparent text-md outline-none placeholder:text-surface-slate/60"
             placeholder="Filter by action (e.g. payment.updated)…" />
      <input v-model="from" type="date" class="field-input !py-1.5 !text-sm !w-40" @change="refresh" />
      <input v-model="to" type="date" class="field-input !py-1.5 !text-sm !w-40" @change="refresh" />
      <button class="btn-secondary !text-sm" @click="refresh">Apply</button>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else-if="!items.length" class="surface-card p-16 text-center">
      <ShieldCheckIcon class="w-8 h-8 text-surface-slate mx-auto mb-2" />
      <p class="text-subtext">Nothing logged in this range.</p>
    </div>

    <div v-else class="surface-card overflow-hidden">
      <table class="w-full text-md">
        <thead>
          <tr class="text-left text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash border-b border-surface-mist dark:border-surface-fog">
            <th class="px-5 py-3 font-black">When</th>
            <th class="px-5 py-3 font-black">Actor</th>
            <th class="px-5 py-3 font-black">Action</th>
            <th class="px-5 py-3 font-black">Target</th>
            <th class="px-5 py-3 font-black">Meta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in items" :key="e._id" class="border-b border-surface-mist dark:border-surface-fog hover:bg-surface-mist/30 dark:hover:bg-surface-fog/30">
            <td class="px-5 py-3 text-xs whitespace-nowrap text-surface-slate dark:text-surface-ash">{{ formatDateTime(e.at) }}</td>
            <td class="px-5 py-3">
              <p class="text-heading truncate">{{ e.actorId?.name || 'system' }}</p>
              <RoleBadge v-if="e.actorRole" :role="e.actorRole" class="mt-0.5" />
            </td>
            <td class="px-5 py-3">
              <code class="text-xs px-2 py-0.5 rounded-md bg-surface-mist/60 dark:bg-surface-fog/60 text-brand-gold-deep dark:text-brand-gold-soft font-bold">
                {{ e.action }}
              </code>
            </td>
            <td class="px-5 py-3 text-subtext">
              <span v-if="e.targetType">{{ e.targetType }}</span>
              <span v-if="e.targetId" class="block truncate max-w-[140px] font-mono">{{ e.targetId }}</span>
            </td>
            <td class="px-5 py-3 text-xs">
              <details v-if="e.meta && Object.keys(e.meta).length" class="cursor-pointer">
                <summary class="text-surface-slate dark:text-surface-ash">{{ Object.keys(e.meta).length }} keys</summary>
                <pre class="mt-1 text-2xs overflow-x-auto max-w-xs">{{ JSON.stringify(e.meta, null, 2) }}</pre>
              </details>
              <span v-else class="text-surface-slate dark:text-surface-ash">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { MagnifyingGlassIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline';
import http, { unwrap, apiErrorMessage } from '@/services/http';
import { formatDateTime } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import RoleBadge from '@/components/common/RoleBadge.vue';

const toast = useToast();
const items = ref([]);
const loading = ref(true);
const action = ref('');
const from = ref('');
const to = ref('');

async function refresh() {
  loading.value = true;
  try {
    const res = await http.get('/admin/audit', { params: {
      action: action.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
      limit: 200,
    } });
    items.value = unwrap(res);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

onMounted(refresh);
</script>
