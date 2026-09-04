<template>
  <PageShell
    title="My invitations"
    description="Every event where your verified number appears on a guest list — from any organiser on the platform."
  >
    <template #actions>
      <router-link to="/app/my-invitations/link">
        <Button variant="secondary">
          <MagnifyingGlassIcon class="w-4 h-4" /> Link by code
        </Button>
      </router-link>
    </template>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <EmptyState v-else-if="!invitations.length"
                title="No invitations yet"
                :description="phoneReady
                  ? 'When someone adds your number to their guest list, it shows up here automatically. You can also link a specific event with a short code.'
                  : 'Add and verify your phone number in Settings so we can match you to guest lists across the platform. Or link a specific event with a short code.'">
      <template #icon>
        <TicketIcon class="w-7 h-7" />
      </template>
      <template #actions>
        <router-link v-if="!phoneReady" to="/app/settings">
          <Button variant="primary">Add my phone</Button>
        </router-link>
        <router-link to="/app/my-invitations/link">
          <Button :variant="phoneReady ? 'primary' : 'secondary'">Link by short code</Button>
        </router-link>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link v-for="inv in invitations" :key="inv.guestId"
                   :to="`/app/my-invitations/${inv.event._id}`"
                   class="surface-card p-5 interactive-lift block">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="min-w-0 flex-1">
            <p class="text-heading truncate">{{ inv.event.name }}</p>
            <p class="text-subtext">{{ formatDate(inv.event.date) }}</p>
            <p v-if="inv.event.venue?.name" class="text-subtext truncate">📍 {{ inv.event.venue.name }}</p>
          </div>
          <span v-if="inv.isVip" class="chip-warn !text-2xs">★ VIP</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span :class="rsvpClass(inv.rsvpStatus)">{{ rsvpLabel(inv.rsvpStatus) }}</span>
          <span class="chip-neutral !text-2xs">{{ inv.type }}{{ inv.type === 'family' ? ` (${inv.familySize})` : '' }}</span>
          <span v-if="inv.arrivalStatus === 'arrived'" class="chip-success !text-2xs">✓ arrived</span>
          <span class="text-2xs font-mono text-brand-primary-deep dark:text-brand-primary-soft ml-auto">{{ inv.shortCode }}</span>
        </div>
        <!-- Contribution summary — non-repudiable, appears whenever the
             organiser recorded a pledge for you. Guest can't hide this. -->
        <div v-if="inv.pledge?.amount" class="mt-3 pt-3 border-t border-surface-mist dark:border-surface-fog flex items-center justify-between gap-2">
          <div>
            <p class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">Your pledge</p>
            <p class="text-md font-black tabular-nums text-surface-charcoal dark:text-surface-bone">{{ formatTZS(inv.pledge.amount) }}</p>
          </div>
          <div class="text-right">
            <p class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">Paid</p>
            <p class="text-md font-black tabular-nums" :class="(inv.pledge.receivedTZS || 0) >= inv.pledge.amount ? 'text-state-success' : 'text-state-warning'">
              {{ formatTZS(inv.pledge.receivedTZS || 0) }}
            </p>
          </div>
        </div>
      </router-link>
    </div>
  </PageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { MagnifyingGlassIcon, TicketIcon } from '@heroicons/vue/24/outline';
import { listMyInvitations } from '@/services/guestPortal.service';
import { formatDate, formatTZS } from '@/utils/format';
import { useAuthStore } from '@/stores/auth';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { Button, EmptyState } from '@/components/ui';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/services/http';

const auth = useAuthStore();
const toast = useToast();
const loading = ref(true);
const invitations = ref([]);

// Placeholder phones (`google:<sub>`, `taiview:<id>`) never match any Guest
// row — the empty state calls this out and points the user at Settings
// instead of leaving them guessing why nothing shows up.
const phoneReady = computed(() => {
  const p = auth.user?.phone || '';
  return !!p && !p.startsWith('google:') && !p.startsWith('taiview:');
});

function rsvpLabel(s) { return ({ yes: 'Attending', no: 'Not attending', maybe: 'Maybe', pending: 'Awaiting reply' })[s] || 'Awaiting reply'; }
function rsvpClass(s) {
  const base = '!text-2xs';
  return ({
    yes:    `chip-success ${base}`,
    no:     `chip bg-state-danger-bg text-state-danger ${base}`,
    maybe:  `chip-warn ${base}`,
  })[s] || `chip-neutral ${base}`;
}

onMounted(async () => {
  try { invitations.value = await listMyInvitations(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
