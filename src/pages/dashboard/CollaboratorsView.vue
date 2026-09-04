<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
    <router-link :to="`/app/events/${route.params.id}`" class="btn-ghost !text-sm !px-2 !py-1 mb-1">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Back to event
    </router-link>
    <h1 class="section-title text-2xl mb-1">Collaborators</h1>
    <p class="text-subtext mb-5">
      Invite team members to help with data entry or scanning at the gate.
      First 3 are free. Extra collaborators are billed via add-ons.
    </p>

    <div v-if="loading" class="flex justify-center py-8"><LoadingSpinner /></div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <StatTile label="In use" :value="data.usedSlots" />
        <StatTile label="Free tier" :value="data.freeSlots" tone="gold" />
        <StatTile label="Extra charge" :value="data.extraCollabCharge" :tone="data.extraCollabCharge > 0 ? 'warn' : 'default'" />
      </div>

      <section class="surface-card p-4 space-y-3">
        <p class="section-eyebrow">Invite</p>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <AppInput v-model="form.phone" label="Phone" placeholder="+2557XXXXXXXX" />
          <AppInput v-model="form.name" label="Name (optional)" />
          <AppSelect v-model="form.role" label="Role" :options="ROLES" />
          <AppButton :loading="inviting" @click="invite">
            <UserPlusIcon class="w-4 h-4" /> Invite
          </AppButton>
        </div>
        <p v-if="lastTempPass" class="text-subtext">
          Temporary password for new user: <code class="chip-gold">{{ lastTempPass }}</code> — share this with them.
        </p>
      </section>

      <section class="surface-card p-4 space-y-3">
        <p class="section-eyebrow">Invite as co-owner (Amoview account)</p>
        <p class="text-subtext">
          Give another Amoview account — like the bride's or groom's own — full edit/delete
          rights over this event's videos, without creating a separate AmoEvents login for them.
          They'll get a notification to accept.
        </p>
        <div class="relative">
          <AppInput v-model="coOwnerQuery" placeholder="Search by name or phone" />
          <div v-if="coOwnerResults.length" class="surface-card mt-1 absolute z-10 w-full max-h-64 overflow-y-auto">
            <button
              v-for="u in coOwnerResults" :key="u.id"
              class="w-full text-left px-3 py-2 hover:bg-surface-mist/50 dark:hover:bg-surface-fog/20 flex items-center gap-2"
              @click="inviteAmoview(u)"
            >
              <span class="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-xs font-black shrink-0">{{ initials(u.name) }}</span>
              <span class="min-w-0 flex-1">
                <span class="block text-heading truncate">{{ u.name }}</span>
                <span class="block text-subtext truncate">{{ u.phoneMasked }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section v-if="data.items.length" class="space-y-2">
        <p class="section-eyebrow">Team ({{ data.items.length }})</p>
        <div v-for="c in data.items" :key="c._id" class="surface-card p-3 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-xs font-black shrink-0">
            {{ initials(c.userId?.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-heading truncate">{{ c.userId?.name || 'Unknown' }}</p>
            <p class="text-subtext truncate">{{ c.userId?.phone }} · {{ c.status }}</p>
          </div>
          <select
            :value="c.role"
            class="field-input !py-1 !text-sm !w-36"
            @change="changeRole(c, $event.target.value)"
          >
            <option value="collaborator">Collaborator</option>
            <option value="scanner">Scanner</option>
          </select>
          <button class="btn-danger !text-sm !py-1.5 !px-3" @click="revoke(c)">
            <TrashIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute } from 'vue-router';
import { ChevronLeftIcon, UserPlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import * as api from '@/services/collaborators.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatTile from '@/components/events/EventBigStat.vue';

const ROLES = [
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'scanner', label: 'Scanner (gate only)' },
];

const route = useRoute();
const toast = useToast();
const data = ref({ items: [], freeSlots: 3, usedSlots: 0, extraCollabCharge: 0 });
const loading = ref(true);
const inviting = ref(false);
const lastTempPass = ref('');
const form = reactive({ phone: '', name: '', role: 'collaborator' });
const coOwnerQuery = ref('');
const coOwnerResults = ref([]);
let coOwnerSearchTimer = null;

async function refresh() {
  loading.value = true;
  try { data.value = await api.listCollaborators(route.params.id); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function invite() {
  if (!/^\+?\d{9,15}$/.test(form.phone)) { toast.error('Enter a valid phone'); return; }
  inviting.value = true;
  try {
    const res = await api.inviteCollaborator(route.params.id, { ...form });
    if (res.tempPassword) lastTempPass.value = res.tempPassword;
    toast.success('Invited');
    form.phone = ''; form.name = '';
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { inviting.value = false; }
}

async function changeRole(collab, role) {
  try { await api.updateCollaborator(route.params.id, collab._id, { role }); toast.success('Role updated'); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

async function revoke(c) {
  if (!(await askConfirm(`Revoke ${c.userId?.name || 'this collaborator'}?`))) return;
  try { await api.revokeCollaborator(route.params.id, c._id); await refresh(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

function initials(name) { return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

watch(coOwnerQuery, (q) => {
  clearTimeout(coOwnerSearchTimer);
  q = (q || '').trim();
  if (q.length < 2) { coOwnerResults.value = []; return; }
  coOwnerSearchTimer = setTimeout(async () => {
    try { coOwnerResults.value = await api.searchAmoviewUsers(route.params.id, q); }
    catch (err) { toast.error(apiErrorMessage(err)); }
  }, 350);
});

async function inviteAmoview(u) {
  coOwnerResults.value = [];
  coOwnerQuery.value = '';
  try {
    await api.inviteAmoviewUser(route.params.id, { amoviewUserId: u.id, role: 'collaborator' });
    toast.success(`Invited ${u.name} — they'll get a notification to accept`);
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(refresh);
</script>
