<template>
  <PageShell v-if="!loading" :title="pageTitle" :description="pageDescription">
    <template #actions>
      <router-link to="/app/bundles">
        <Button variant="ghost" size="md">
          <template #leading>
            <CreditCardIcon class="w-4 h-4" />
          </template>
          Wallet · {{ fmtTZS(wallet.balanceTZS || 0) }}
        </Button>
      </router-link>
      <router-link to="/app/events/new">
        <Button variant="primary" size="md">
          <template #leading>
            <PlusIcon class="w-4 h-4" />
          </template>
          New event
        </Button>
      </router-link>
    </template>

    <!-- ── GUEST-ONLY ─────────────────────────────────────────────────
         Users who've only ever been invited (no events of their own) see
         a much lighter dashboard: just their invitations. -->
    <template v-if="isGuestOnly">
      <SectionHeader title="Your invitations" :description="`${myInvitations.length} event${myInvitations.length === 1 ? '' : 's'} waiting for your response`" />
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <router-link v-for="inv in myInvitations" :key="inv.guestId"
                     :to="`/app/my-invitations/${inv.event._id}`"
                     class="surface-card p-5 hover:shadow-elev-3 hover:border-brand-primary/40 transition-all">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-md font-black text-surface-charcoal dark:text-surface-bone truncate">{{ inv.event.name }}</p>
              <p class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ formatDate(inv.event.date) }}</p>
            </div>
            <Badge :tone="rsvpTone(inv.rsvpStatus)">{{ rsvpLabel(inv.rsvpStatus) }}</Badge>
          </div>
          <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mt-4 font-mono">{{ inv.shortCode }}</p>
        </router-link>
      </div>
    </template>

    <!-- ── OWNER dashboard ────────────────────────────────────────── -->
    <template v-else>
      <!-- KPI grid — 4 stats, top of the page, calm not shouty. -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Events"        :value="ov.events.total"           :meta="`${ov.events.upcoming} upcoming`" to="/app/events" />
        <StatTile label="Guests"        :value="ov.guests.total.toLocaleString()" :meta="`${ov.guests.arrived} arrived · ${ov.guests.vip} VIP`" />
        <StatTile label="RSVP yes"      :value="ov.guests.rsvpYes.toLocaleString()"  :meta="`${ov.guests.rsvpPending} awaiting reply`" />
        <StatTile label="Received"      :value="fmtTZSCompact(ov.pledges.receivedTZS)" :meta="`${fmtTZSCompact(ov.pledges.outstandingTZS)} outstanding`" />
      </div>

      <!-- Two-column: activity chart + wallet health -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 surface-card p-6">
          <SectionHeader title="Messages sent" :description="`Last 14 days · ${activityTotals.total.toLocaleString()} total`">
            <template #actions>
              <div class="flex items-center gap-4 text-xs text-surface-slate dark:text-surface-ash">
                <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-state-success" /> WhatsApp</span>
                <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-brand-primary" /> SMS</span>
                <span v-if="activityTotals.failed" class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-state-danger" /> Failed</span>
              </div>
            </template>
          </SectionHeader>
          <div v-if="activity.length" class="relative">
            <!-- Two-column chart layout: Y-axis labels on the left,
                 SVG plot area on the right. -->
            <div class="flex gap-2">
              <!-- Y axis ticks (4 labels: max, ⅔, ⅓, 0) -->
              <div class="flex flex-col justify-between text-2xs text-surface-slate dark:text-surface-ash h-40 py-0 tabular-nums shrink-0 text-right pr-1" style="width: 32px;">
                <span>{{ activityTotals.dayMax }}</span>
                <span>{{ Math.round(activityTotals.dayMax * 2 / 3) }}</span>
                <span>{{ Math.round(activityTotals.dayMax / 3) }}</span>
                <span>0</span>
              </div>
              <div class="flex-1 min-w-0">
                <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full h-40" preserveAspectRatio="none">
                  <g stroke="currentColor" stroke-width="0.5" opacity="0.4" class="text-surface-mist dark:text-surface-fog">
                    <line v-for="n in 3" :key="'g'+n" x1="0" :x2="chartW" :y1="(chartH / 3) * n" :y2="(chartH / 3) * n" />
                  </g>
                  <g v-for="(d, i) in activity" :key="d.date">
                    <rect :x="i * barSlot + barPad" :y="chartH - scale(d.whatsapp)"                       :width="barWidth" :height="scale(d.whatsapp)" fill="#10B981" rx="1.5">
                      <title>{{ shortDay(d.date) }} · WhatsApp {{ d.whatsapp }} · SMS {{ d.sms }}{{ d.failed ? ` · Failed ${d.failed}` : '' }}</title>
                    </rect>
                    <rect :x="i * barSlot + barPad" :y="chartH - scale(d.whatsapp) - scale(d.sms)"        :width="barWidth" :height="scale(d.sms)"     fill="#C06FEF" rx="1.5" />
                    <rect v-if="d.failed"
                          :x="i * barSlot + barPad" :y="chartH - scale(d.whatsapp) - scale(d.sms) - scale(d.failed)" :width="barWidth" :height="scale(d.failed)" fill="#EF4444" rx="1.5" />
                  </g>
                </svg>
                <!-- X axis: every 3rd day gets a label, dense enough to
                     anchor the eye but not enough to cause overlap. -->
                <div class="grid mt-1.5 text-2xs text-surface-slate dark:text-surface-ash tabular-nums" :style="{ gridTemplateColumns: `repeat(${activity.length}, 1fr)` }">
                  <div v-for="(d, i) in activity" :key="d.date" class="text-center">
                    <span v-if="i % Math.max(1, Math.ceil(activity.length / 5)) === 0 || i === activity.length - 1">
                      {{ shortDay(d.date) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <EmptyState v-else title="No sends yet" description="Once you send an invite, the activity chart lights up." />
        </div>

        <!-- Wallet card — filled with the purple gradient, hero for money. -->
        <div class="rounded-2xl bg-gradient-primary text-white p-6 shadow-primary-soft relative overflow-hidden">
          <div class="absolute inset-0 opacity-25" aria-hidden="true"
               style="background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4), transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25), transparent 50%);" />
          <div class="relative">
            <p class="text-2xs uppercase font-black tracking-widest text-white/70">Wallet</p>
            <p class="mt-2 text-3xl font-black tabular-nums">{{ fmtTZS(wallet.balanceTZS || 0) }}</p>
            <p class="mt-1 text-xs text-white/70">
              <span v-if="(wallet.lifetimeSpentTZS || 0) > 0">{{ fmtTZS(wallet.lifetimeSpentTZS || 0) }} spent lifetime</span>
              <span v-else>Top up to pay for bundles or event add-ons from here</span>
            </p>

            <div class="mt-5 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-white/80">SMS units left</span>
                <span class="font-black tabular-nums">{{ (wallet.smsUnitsLeft || 0).toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/80">WhatsApp units left</span>
                <span class="font-black tabular-nums">{{ (wallet.waUnitsLeft || 0).toLocaleString() }}</span>
              </div>
            </div>

            <router-link to="/app/bundles" class="mt-6 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold transition-colors">
              Top up
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Events + pledge progress -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2">
          <SectionHeader title="Your events">
            <template #actions>
              <router-link to="/app/events" class="text-sm font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline">View all →</router-link>
            </template>
          </SectionHeader>
          <EmptyState v-if="!ov.events.recent.length" title="No events yet" description="Create your first event to start inviting guests.">
            <template #actions>
              <router-link to="/app/events/new"><Button variant="primary">Create event</Button></router-link>
            </template>
          </EmptyState>
          <div v-else class="surface-card overflow-hidden">
            <table class="w-full text-sm">
              <thead class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash bg-surface-cream dark:bg-surface-night">
                <tr>
                  <th class="text-left px-5">Event</th>
                  <th class="text-left px-5 hidden sm:table-cell">When</th>
                  <th class="text-right px-5">Guests</th>
                  <th class="text-right px-5 hidden md:table-cell">Arrived</th>
                  <th class="text-right px-5">Payment</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-mist dark:divide-surface-fog">
                <tr v-for="e in ov.events.recent" :key="e._id"
                    class="hover:bg-surface-mist/40 dark:hover:bg-surface-fog/40 cursor-pointer transition-colors"
                    @click="$router.push(`/app/events/${e._id}`)">
                  <td class="px-5">
                    <p class="font-bold text-surface-charcoal dark:text-surface-bone">{{ e.name }}</p>
                    <p class="text-2xs text-surface-slate dark:text-surface-ash sm:hidden">{{ formatDate(e.date) }}</p>
                  </td>
                  <td class="px-5 hidden sm:table-cell text-surface-slate dark:text-surface-ash">{{ formatDate(e.date) }}</td>
                  <td class="px-5 text-right tabular-nums text-surface-charcoal dark:text-surface-bone">{{ e.guestCount || 0 }}</td>
                  <td class="px-5 text-right tabular-nums hidden md:table-cell text-surface-charcoal dark:text-surface-bone">{{ e.arrivedCount || 0 }}</td>
                  <td class="px-5 text-right"><Badge :tone="paymentTone(e.paymentStatus)">{{ paymentLabel(e.paymentStatus) }}</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pledge health -->
        <div class="surface-card p-6">
          <SectionHeader title="Money collected" level="subsection" />
          <p class="text-3xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums leading-none">{{ fmtTZSCompact(ov.pledges.receivedTZS) }}</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash mt-1.5">of {{ fmtTZSCompact(ov.pledges.totalTZS) }} pledged</p>
          <Progress :value="pledgePct" :max="100" tone="primary" size="lg" class="mt-4" />
          <p class="text-xs text-surface-slate dark:text-surface-ash mt-2">{{ pledgePct }}% received · {{ fmtTZSCompact(ov.pledges.outstandingTZS) }} still coming</p>

          <div class="mt-6 pt-6 border-t border-surface-mist dark:border-surface-fog">
            <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">Gate scans</p>
            <p class="text-2xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums leading-none mt-2">{{ ov.scans.last30Days.toLocaleString() }}</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash mt-1.5">unique guests in the last 30 days</p>
          </div>
        </div>
      </div>
    </template>
  </PageShell>

  <div v-else class="flex items-center justify-center py-20"><LoadingSpinner /></div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { PlusIcon, CreditCardIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import http, { unwrap, apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { listMyInvitations } from '@/services/guestPortal.service';
import { formatDate } from '@/utils/format';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PageShell from '@/components/shell/PageShell.vue';
import { Badge, Button, EmptyState, Progress, SectionHeader, StatTile } from '@/components/ui';

const auth = useAuthStore();
const toast = useToast();
const router = useRouter();
const loading = ref(true);

const ov = ref({
  events:  { total: 0, upcoming: 0, unpaid: 0, recent: [] },
  guests:  { total: 0, arrived: 0, vip: 0, rsvpYes: 0, rsvpPending: 0 },
  pledges: { totalTZS: 0, receivedTZS: 0, outstandingTZS: 0 },
  messaging: { whatsapp: { sent: 0 }, sms: { sent: 0 } },
  scans:   { last30Days: 0 },
});
const wallet = ref({ balanceTZS: 0, smsUnitsLeft: 0, waUnitsLeft: 0, lifetimeSpentTZS: 0 });
const activity = ref([]);
const myInvitations = ref([]);

const firstName = computed(() => (auth.user?.name || 'friend').split(' ')[0]);
const isGuestOnly = computed(() => ov.value.events.total === 0 && myInvitations.value.length > 0);
const pageTitle = computed(() => isGuestOnly.value ? 'Welcome' : `Karibu, ${firstName.value}.`);
const pageDescription = computed(() => isGuestOnly.value
  ? 'The events you\'ve been invited to are below.'
  : 'Everything moving across your events today.');
const pledgePct = computed(() => {
  const t = ov.value.pledges.totalTZS || 0;
  return t ? Math.min(100, Math.round((ov.value.pledges.receivedTZS / t) * 100)) : 0;
});

// Compact TZS (~140k / 2.1M) — used in KPI tiles where full digits crowd
// the number. Full form kept in the wallet card and pledge headline.
function fmtTZS(n) { return `${Number(n || 0).toLocaleString('sw-TZ')} TZS`; }
function fmtTZSCompact(n) {
  const v = Number(n || 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M TZS`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k TZS`;
  return `${v} TZS`;
}

// Chart geometry — identical logic to before, just refactored for clarity.
const chartW = 700, chartH = 120, barPad = 3;
const barSlot = computed(() => activity.value.length ? chartW / activity.value.length : 0);
const barWidth = computed(() => Math.max(4, barSlot.value - barPad * 2));
const activityTotals = computed(() => {
  let sms = 0, whatsapp = 0, failed = 0, dayMax = 0;
  for (const d of activity.value) {
    sms += d.sms; whatsapp += d.whatsapp; failed += d.failed;
    dayMax = Math.max(dayMax, d.sms + d.whatsapp + d.failed);
  }
  return { sms, whatsapp, failed, dayMax: dayMax || 1, total: sms + whatsapp };
});
const scale = (v) => (v / activityTotals.value.dayMax) * chartH;

function paymentLabel(s) { return ({ paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' }[s] || 'Unpaid'); }
function paymentTone(s)  { return ({ paid: 'success', partial: 'warning', unpaid: 'neutral' }[s] || 'neutral'); }
function rsvpLabel(s)    { return ({ yes: 'Attending', no: 'Declined', maybe: 'Maybe', pending: 'Awaiting reply' })[s] || 'Awaiting reply'; }
function rsvpTone(s)     { return ({ yes: 'success', no: 'danger', maybe: 'warning' })[s] || 'neutral'; }
function shortDay(iso)   { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }

onMounted(async () => {
  try {
    const [ovRes, walletRes, activityRes, invs] = await Promise.all([
      http.get('/overview'),
      http.get('/messaging/wallet').catch(() => ({ data: {} })),
      http.get('/overview/activity?days=14').catch(() => ({ data: { data: { days: [] } } })),
      listMyInvitations().catch(() => []),
    ]);
    ov.value = unwrap(ovRes);
    wallet.value = walletRes.data?.data || walletRes.data || wallet.value;
    activity.value = (activityRes.data?.data || activityRes.data)?.days || [];
    myInvitations.value = invs || [];

    // First-run redirect: an owner (not guest-only) with zero events and
    // no prior dismissal gets shunted into the welcome flow. Once they
    // pass through or skip, the flag sticks.
    const onboarded = typeof localStorage !== 'undefined' && localStorage.getItem('ae.onboarded') === '1';
    if (!isGuestOnly.value && ov.value.events.total === 0 && !onboarded) {
      router.replace('/app/welcome');
      return;
    }
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
});
</script>
