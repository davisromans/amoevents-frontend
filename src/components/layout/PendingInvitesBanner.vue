<template>
  <div v-if="invites.length" class="px-4 sm:px-6 pt-4 space-y-2">
    <div v-for="inv in invites" :key="inv._id" class="surface-card p-3 flex items-center gap-3 border border-brand-gold/40">
      <div class="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-xs font-black shrink-0">
        {{ initials(inv.eventId?.name) }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-heading truncate">Co-owner invite: {{ inv.eventId?.name || 'an event' }}</p>
        <p class="text-subtext truncate">Invited by {{ inv.invitedBy?.name || 'the organizer' }} — you'll get edit/delete rights over this event's videos.</p>
      </div>
      <button class="btn-secondary !text-sm !py-1.5 !px-3" :disabled="busyId === inv._id" @click="respond(inv, 'decline')">Decline</button>
      <button class="btn-primary !text-sm !py-1.5 !px-3" :disabled="busyId === inv._id" @click="respond(inv, 'accept')">Accept</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as api from '@/services/collaborators.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const invites = ref([]);
const busyId = ref(null);

async function load() {
  try { invites.value = await api.listMyPendingInvites(); }
  catch { /* not signed in yet, or a transient error — the banner just stays empty */ }
}

async function respond(inv, action) {
  busyId.value = inv._id;
  try {
    await api.respondToInvite(inv._id, action);
    toast.success(action === 'accept' ? `Joined ${inv.eventId?.name || 'the event'} as a co-owner` : 'Invite declined');
    invites.value = invites.value.filter((i) => i._id !== inv._id);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { busyId.value = null; }
}

function initials(name) { return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

onMounted(load);
</script>
