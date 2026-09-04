<template>
  <PageShell title="Users" description="Every account across every tenant. Search by name, phone, or email.">
    <template #actions>
      <span v-if="total != null" class="text-xs text-surface-slate dark:text-surface-ash tabular-nums">{{ total.toLocaleString() }} total</span>
    </template>

    <div class="surface-card p-4 mb-4 flex items-center gap-3">
      <MagnifyingGlassIcon class="w-4 h-4 text-surface-slate ml-1" />
      <input v-model="q" @keydown.enter="refresh"
             class="flex-1 bg-transparent text-md outline-none placeholder:text-surface-slate/60"
             placeholder="Search name, phone, email…" />
      <select v-model="role" class="field-input !py-1.5 !text-sm !w-44" @change="refresh">
        <option value="">Any role</option>
        <option value="super_admin">Super admin</option>
        <option value="owner">Owner</option>
        <option value="collaborator">Collaborator</option>
        <option value="scanner">Scanner</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else class="surface-card overflow-hidden">
      <table class="w-full text-md">
        <thead>
          <tr class="text-left text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash border-b border-surface-mist dark:border-surface-fog">
            <th class="px-4 py-3 font-black">User</th>
            <th class="px-4 py-3 font-black">Phone</th>
            <th class="px-4 py-3 font-black">Role</th>
            <th class="px-4 py-3 font-black">Tenant</th>
            <th class="px-4 py-3 font-black">Status</th>
            <th class="px-4 py-3 font-black"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u._id" class="border-b border-surface-mist dark:border-surface-fog">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-xs font-black">
                  {{ initials(u.name) }}
                </div>
                <div>
                  <p class="font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ u.name }}</p>
                  <p class="text-subtext">{{ u.email || '—' }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 tabular-nums">{{ u.phone }}</td>
            <td class="px-4 py-3">
              <select :value="u.role" class="field-input !py-1 !text-sm !w-32"
                      @change="setRole(u, $event.target.value)">
                <option value="super_admin">super_admin</option>
                <option value="owner">owner</option>
                <option value="collaborator">collaborator</option>
                <option value="scanner">scanner</option>
              </select>
            </td>
            <td class="px-4 py-3 text-sm truncate max-w-[160px]">{{ u.tenantId?.name || '—' }}</td>
            <td class="px-4 py-3">
              <span :class="u.isActive ? 'chip-success' : 'chip-danger'">
                {{ u.isActive ? 'Active' : 'Suspended' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="btn-ghost !text-xs !py-1 !px-2" @click="resetPw(u)">Reset PW</button>
              <button class="btn-ghost !text-xs !py-1 !px-2" @click="toggleActive(u)">
                {{ u.isActive ? 'Suspend' : 'Activate' }}
              </button>
              <button class="btn-danger !text-xs !py-1 !px-2 ml-1" @click="remove(u)">
                <TrashIcon class="w-3 h-3" />
              </button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="6" class="text-center py-10 text-subtext">No users</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reset password modal -->
    <AppModal v-model="resetOpen" :title="resetUser ? `Reset password — ${resetUser.name}` : 'Reset password'" :maxWidth="440">
      <form class="space-y-3" @submit.prevent="submitReset">
        <AppInput v-model="newPassword" type="password" label="New password" placeholder="Min 6 characters" required />
        <p class="text-subtext">The user will need to log in with this new password.</p>
        <p v-if="resetError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ resetError }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-ghost" @click="resetOpen = false">Cancel</button>
          <AppButton :loading="resetLoading" type="submit">Reset</AppButton>
        </div>
      </form>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/vue/24/outline';
import http, { unwrap, apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { reactive } from 'vue';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';

const toast = useToast();
const items = ref([]);
const total = ref(null);
const loading = ref(true);
const q = ref('');
const role = ref('');

async function refresh() {
  loading.value = true;
  try {
    const res = await http.get('/admin/users', { params: { q: q.value || undefined, role: role.value || undefined, limit: 200 } });
    items.value = unwrap(res);
    total.value = res.data?.meta?.total ?? items.value.length;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function setRole(u, r) {
  try { await http.patch(`/admin/users/${u._id}`, { role: r }); toast.success('Role updated'); u.role = r; }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

async function toggleActive(u) {
  try {
    const path = u.isActive ? 'suspend' : 'activate';
    await http.post(`/admin/users/${u._id}/${path}`);
    u.isActive = !u.isActive;
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

const resetOpen = ref(false);
const resetUser = ref(null);
const newPassword = ref('');
const resetLoading = ref(false);
const resetError = ref('');

function resetPw(u) {
  resetUser.value = u;
  newPassword.value = '';
  resetError.value = '';
  resetOpen.value = true;
}

async function submitReset() {
  resetError.value = '';
  if (newPassword.value.length < 6) { resetError.value = 'Min 6 characters'; return; }
  resetLoading.value = true;
  try {
    await http.post(`/admin/users/${resetUser.value._id}/reset-password`, { newPassword: newPassword.value });
    toast.success('Password reset');
    resetOpen.value = false;
  } catch (err) { resetError.value = apiErrorMessage(err); }
  finally { resetLoading.value = false; }
}

async function remove(u) {
  if (!(await askConfirm(`Delete ${u.name} permanently?`))) return;
  try { await http.delete(`/admin/users/${u._id}`); items.value = items.value.filter((x) => x._id !== u._id); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

function initials(name) { return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

onMounted(refresh);
</script>
