<template>
  <PageShell
    :crumbs="[
      { label: 'Events',      to: '/app/events' },
      { label: event?.name || 'Event', to: `/app/events/${route.params.id}` },
      { label: 'Pledges' },
    ]"
    title="Pledges"
  >
    <template #actions>
      <Button variant="secondary" @click="tiersOpen = true">
        <Cog6ToothIcon class="w-4 h-4" /> Pledge tiers
      </Button>
    </template>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>

    <div v-else class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Guests who pledged" :value="stats.pledgeCount" />
        <BigStat label="Total pledged" :value="formatTZS(stats.pledgeTotalTZS)" tone="primary" />
        <BigStat label="Received" :value="formatTZS(stats.pledgeFulfilledTZS)" tone="success" />
        <BigStat label="Outstanding" :value="formatTZS(stats.pledgePendingTZS)" :tone="stats.pledgePendingTZS > 0 ? 'warn' : 'default'" />
      </div>

      <div v-if="!items.length" class="surface-card p-16 text-center">
        <BanknotesIcon class="w-8 h-8 text-surface-slate mx-auto mb-2" />
        <p class="text-subtext">No pledges recorded yet.</p>
        <p class="text-subtext mt-1">Add or edit a guest and set a pledge amount.</p>
      </div>

      <template v-else>
        <!-- Everything below is one card: search+filters on top, list+detail
             below, so the page reads as a single unit instead of loose
             floating pieces. Search on the left (primary action), filter
             tabs pinned to the far right. -->
        <div class="surface-card overflow-hidden">
          <div class="flex flex-col sm:flex-row gap-2 sm:items-center justify-between p-3 border-b border-surface-mist dark:border-surface-fog">
            <div class="relative flex-1 sm:max-w-xs">
              <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-slate" />
              <input v-model="search" type="search" placeholder="Search name, phone, code…"
                     class="field-input !pl-9 w-full !py-2" />
            </div>
            <div class="flex gap-1 p-1 rounded-xl bg-surface-mist/60 dark:bg-surface-fog/40 overflow-x-auto sm:ml-auto">
              <button v-for="f in FILTERS" :key="f.value"
                      class="px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors"
                      :class="filter === f.value
                        ? 'bg-white dark:bg-surface-night text-brand-primary-deep dark:text-brand-primary-soft shadow-sm'
                        : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'"
                      @click="filter = f.value">
                {{ f.label }}
                <span class="ml-1 text-2xs opacity-70">{{ segmentCount(f.value) }}</span>
              </button>
            </div>
          </div>

          <div v-if="!filtered.length" class="p-10 text-center text-subtext">
            No pledges match this filter.
          </div>

          <!-- List (left) + detail (right) — desktop split pane, matching
               the pattern used everywhere else: a scannable list on the
               left, tap a row to see everything about it on the right,
               instead of every card carrying its own full receipts/
               reminders block whether you asked for it or not. -->
          <div v-else class="grid grid-cols-1 lg:grid-cols-[440px_1fr]">
            <div class="divide-y divide-surface-mist dark:divide-surface-fog lg:border-r border-surface-mist dark:border-surface-fog lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto">
              <button v-for="(p, pi) in filtered" :key="p._id"
                      class="w-full text-left p-4 flex items-start gap-3 transition-colors"
                      :class="selectedId === p._id ? 'bg-brand-primary-glow' : 'hover:bg-surface-mist/30 dark:hover:bg-surface-fog/30'"
                      @click="selectedId = p._id">
                <span class="text-subtext tabular-nums w-5 text-right shrink-0 pt-0.5">{{ pi + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-surface-charcoal dark:text-surface-bone truncate">{{ p.firstName }} {{ p.lastName }}</p>
                    <span :class="isFulfilled(p) ? 'chip-success' : (isOverdue(p) ? 'chip-danger' : 'chip-warn')" class="!text-2xs shrink-0">
                      {{ isFulfilled(p) ? 'Received' : (isOverdue(p) ? 'Overdue' : 'Pending') }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1.5 text-subtext tabular-nums">
                    <span>{{ formatTZS(p.pledge?.amount || 0) }}</span>
                    <span v-if="p.pledge?.receivedTZS > 0" class="text-emerald-600 dark:text-emerald-400">paid {{ formatTZS(p.pledge.receivedTZS) }}</span>
                  </div>
                </div>
              </button>
            </div>

            <div v-if="selected" class="p-4 sm:p-5 space-y-4 animate-fade-in">
              <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-lg text-surface-charcoal dark:text-surface-bone truncate">{{ selected.firstName }} {{ selected.lastName }}</p>
                <p class="text-subtext truncate">
                  <span v-if="isPlaceholderPhone(selected.phone)" class="text-amber-600 dark:text-amber-400">No phone yet</span>
                  <span v-else>{{ selected.phone }}</span>
                  · {{ selected.memberId }}<span v-if="selected.pledge?.item"> · {{ selected.pledge.item }}</span>
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="font-black text-xl text-brand-primary-deep dark:text-brand-primary-soft tabular-nums">{{ formatTZS(selected.pledge?.amount || 0) }}</p>
                <p v-if="event?.pledgeDueAt" class="text-2xs tabular-nums" :class="isOverdue(selected) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-surface-slate dark:text-surface-ash'">
                  due {{ formatDate(event.pledgeDueAt) }}
                </p>
              </div>
            </div>

            <div>
              <div class="h-1.5 rounded-full bg-surface-mist dark:bg-surface-fog overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     :class="pct(selected) >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'"
                     :style="{ width: Math.min(100, pct(selected)) + '%' }" />
              </div>
              <div class="flex justify-between mt-1 text-2xs tabular-nums text-surface-slate dark:text-surface-ash">
                <span>Received {{ formatTZS(selected.pledge?.receivedTZS || 0) }}</span>
                <span v-if="outstanding(selected) > 0">Left {{ formatTZS(outstanding(selected)) }}</span>
                <span v-else class="text-emerald-600 dark:text-emerald-400 font-bold">Fully paid</span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <button class="btn-secondary !text-xs !py-1.5" @click="openReceipt(selected)">
                <PlusIcon class="w-3.5 h-3.5" /> Receipt
              </button>
              <button v-if="!isFulfilled(selected)" class="btn-ghost !text-xs !py-1.5" @click="openSendPreview(selected, 'outstanding')">
                <PaperAirplaneIcon class="w-3.5 h-3.5" /> Send reminder
              </button>
              <button v-else-if="selected.pledge?.thankedAt" class="btn-ghost !text-xs !py-1.5 !text-emerald-600 dark:!text-emerald-400" @click="openSendPreview(selected, 'fulfilled')">
                <CheckIcon class="w-3.5 h-3.5" /> Thanked · Resend
              </button>
              <button v-else class="btn-ghost !text-xs !py-1.5" @click="openSendPreview(selected, 'fulfilled')">
                <PaperAirplaneIcon class="w-3.5 h-3.5" /> Thank completed
              </button>
              <button class="btn-ghost !text-xs !py-1.5" @click="openHistory(selected)">
                <ClockIcon class="w-3.5 h-3.5" /> Full delivery timeline
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-surface-mist dark:border-surface-fog">
              <div>
                <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-2">
                  Receipts ({{ (selected.pledge?.receipts || []).length }})
                </p>
                <div v-if="!(selected.pledge?.receipts || []).length" class="text-subtext">
                  No receipts yet. Tap <strong>Receipt</strong> to log a payment.
                </div>
                <ol v-else class="space-y-1.5">
                  <li v-for="r in [...(selected.pledge?.receipts || [])].reverse()" :key="r._id"
                      class="flex items-center gap-2 text-sm group"
                      :class="r.voidedAt ? 'opacity-60' : ''">
                    <!-- Voided receipts stay on the ledger (append-only for
                         the guest's audit trail) — shade + strike them
                         instead of pretending they never happened. -->
                    <span :class="[r.voidedAt ? 'chip-neutral line-through' : 'chip-success', '!text-2xs shrink-0']">
                      {{ formatTZS(r.amountTZS) }}
                    </span>
                    <span class="uppercase text-2xs font-bold text-surface-slate dark:text-surface-ash">{{ r.method }}</span>
                    <span v-if="r.reference" class="text-2xs text-surface-slate dark:text-surface-ash truncate">{{ r.reference }}</span>
                    <span v-if="r.voidedAt" class="text-2xs uppercase font-bold text-red-500 shrink-0">Voided</span>
                    <span class="text-2xs text-surface-slate dark:text-surface-ash ml-auto shrink-0">{{ formatDate(r.recordedAt) }}</span>
                    <button v-if="!r.voidedAt" class="text-surface-slate dark:text-surface-ash hover:text-brand-primary-deep dark:hover:text-brand-primary-soft shrink-0" @click="openReceipt(selected, r)" title="Edit receipt">
                      <PencilSquareIcon class="w-3.5 h-3.5" />
                    </button>
                    <button v-if="!r.voidedAt" class="text-surface-slate dark:text-surface-ash hover:text-red-500 shrink-0" @click="removeReceipt(selected, r)" title="Void receipt (kept on the ledger)">
                      <TrashIcon class="w-3.5 h-3.5" />
                    </button>
                  </li>
                </ol>
              </div>
              <div>
                <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-2">
                  Reminders
                </p>
                <p v-if="!selected.pledge?.reminderCount" class="text-subtext">
                  No reminders sent yet.
                </p>
                <div v-else class="text-sm text-surface-charcoal dark:text-surface-bone">
                  <p>{{ selected.pledge.reminderCount }} reminder(s) sent</p>
                  <p class="text-2xs text-surface-slate dark:text-surface-ash">Last: {{ relative(selected.pledge.lastReminderAt) }}</p>
                </div>
              </div>
            </div>
            </div>
            <div v-else class="p-10 text-center text-subtext">
              Select a guest on the left to see their pledge details.
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Pledge tiers — was a permanently-visible card at the top of the
         page; now a modal opened from the header so the page opens
         straight to what you actually came here for (the pledge list). -->
    <AppModal v-model="tiersOpen" title="Pledge tiers" :maxWidth="640">
      <div class="space-y-3">
        <p class="text-subtext flex items-center gap-1.5">
          Set a minimum amount → seats earned.
          <InfoHint text="Someone who pays at least that amount gets that many seats at the event. Example: 100,000 TZS and up = 1 seat, 500,000 and up = 2 seats. Applied automatically on import and whenever you hit Recompute." />
        </p>

        <div v-if="!tierList.length" class="surface-inset p-4 rounded-xl text-center">
          <p class="text-subtext mb-2">
            No tiers yet — guests won't get automatic seats from pledges until you add at least one.
          </p>
          <button class="btn-secondary !text-sm" @click="tierList.push(
            { minTZS: 100000, seats: 1, label: 'Single' },
            { minTZS: 500000, seats: 2, label: 'Double' },
          )">
            <PlusIcon class="w-3.5 h-3.5" /> Add example tiers to start
          </button>
        </div>

        <div v-else class="space-y-2">
          <div class="grid grid-cols-12 gap-2 px-1">
            <span class="col-span-5 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Paid at least (TZS)</span>
            <span class="col-span-3 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Seats earned</span>
            <span class="col-span-3 text-2xs font-bold uppercase tracking-wide text-surface-slate dark:text-surface-ash">Label (optional)</span>
          </div>
          <div v-for="(t, i) in tierList" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-5"><AppInput v-model.number="t.minTZS" placeholder="e.g. 180,000" thousands /></div>
            <div class="col-span-3"><AppInput v-model.number="t.seats" type="number" placeholder="e.g. 1" /></div>
            <div class="col-span-3"><AppInput v-model="t.label" placeholder="e.g. Double" /></div>
            <button class="col-span-1 text-red-500 hover:text-red-700" @click="tierList.splice(i, 1)">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
          <button class="btn-ghost !text-sm" @click="tierList.push({ minTZS: 0, seats: 1, label: '' })">
            <PlusIcon class="w-3.5 h-3.5" /> Add tier
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-3">
          <AppInput v-model.number="maxSeats" label="Max seats per guest (0 = uncapped)" type="number" />
          <AppInput v-model="pledgeDueAt" label="Pledge due date" type="date" />
        </div>
        <p class="text-subtext -mt-1 flex items-center gap-1.5">
          One deadline for everyone — used by the due / due_date tokens in pledge messages.
        </p>

        <div class="flex justify-end gap-2 pt-2 border-t border-surface-mist dark:border-surface-fog">
          <AppButton :loading="recomputing" :disabled="!tierList.length" class="!bg-transparent" @click="recompute">
            Recompute from paid
          </AppButton>
          <button class="btn-ghost !text-sm" @click="saveTiers" :disabled="savingTiers">
            {{ savingTiers ? 'Saving…' : 'Save tiers' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Add/edit receipt modal — same form for both, editingReceiptId
         decides whether submit adds a new one or PATCHes the existing. -->
    <AppModal v-model="receiptOpen" :title="`${editingReceiptId ? 'Edit' : 'Add'} receipt for ${receiptTarget?.firstName || ''}`" :maxWidth="440">
      <form class="space-y-3" @submit.prevent="submitReceipt">
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="receipt.amountTZS" label="Amount (TZS) *" thousands required />
          <AppSelect v-model="receipt.method" label="Method" :options="METHODS" />
        </div>
        <AppInput v-model="receipt.reference" label="Reference / txn ID" />
        <AppInput v-model="receipt.note" label="Note" type="textarea" :rows="2" />
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-ghost" @click="receiptOpen = false">Cancel</button>
          <AppButton :loading="receiptSaving" type="submit">Save</AppButton>
        </div>
      </form>
    </AppModal>

    <!-- Per-guest send preview — the actual rendered SMS/WhatsApp text for
         THIS guest, editable, before anything goes out. Same default
         templates the old bulk sender used (Asante.../Habari... in
         Swahili), just scoped to one person with a real preview instead
         of firing blind. -->
    <AppModal v-model="sendPreviewOpen" :title="sendPreviewSegment === 'fulfilled' ? `Thank ${sendPreviewTarget?.firstName || ''}` : `Remind ${sendPreviewTarget?.firstName || ''}`" :maxWidth="480">
      <div class="space-y-3">
        <AppSelect v-model="sendPreviewChannel" label="Channel" :options="[
          {value:'auto',label:'Auto (WhatsApp → SMS fallback)'},
          {value:'whatsapp',label:'WhatsApp only'},
          {value:'sms',label:'SMS only'},
        ]" />
        <div>
          <label class="field-label">Message preview — edit if needed</label>
          <textarea v-model="sendPreviewText" class="field-input font-medium resize-y min-h-[120px]" />
          <p class="field-help">
            <code v-for="p in PLACEHOLDERS" :key="p" class="chip !text-2xs !py-0 !px-1 mr-1">{{ p }}</code>
          </p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="sendPreviewOpen = false">Cancel</button>
          <AppButton :loading="sendPreviewSending" @click="confirmSendPreview">Send</AppButton>
        </div>
      </div>
    </AppModal>

    <MessageDeliveryDrawer
      v-model:open="historyOpen"
      mode="guest"
      :event-id="route.params.id"
      :guest-id="historyGuest?._id"
      :title="`Delivery — ${historyGuest?.firstName || ''} ${historyGuest?.lastName || ''}`"
    />
  </PageShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { askConfirm } from '@/composables/useConfirm';
import { BanknotesIcon, PaperAirplaneIcon, ClockIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';
import MessageDeliveryDrawer from '@/components/messaging/MessageDeliveryDrawer.vue';
import { listPledges, guestStats, updateGuest, sendPledgeReminders, addPledgeReceipt, updatePledgeReceipt, deletePledgeReceipt, recomputePledgeCards } from '@/services/guests.service';
import { getEvent, updateEvent } from '@/services/events.service';
import AppInput from '@/components/common/AppInput.vue';
import InfoHint from '@/components/common/InfoHint.vue';
import { formatTZS, formatDate, relative } from '@/utils/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import { Button } from '@/components/ui';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import BigStat from '@/components/events/EventBigStat.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';

const route = useRoute();
const toast = useToast();
const items = ref([]);
const stats = ref({ pledgeCount: 0, pledgeTotalTZS: 0, pledgeFulfilledTZS: 0, pledgePendingTZS: 0 });
const loading = ref(true);
const event = ref(null);
const tierList = ref([]); // [{ minTZS, seats, label }]
const maxSeats = ref(0);
const pledgeDueAt = ref('');
const savingTiers = ref(false);
const recomputing = ref(false);

async function saveTiers() {
  savingTiers.value = true;
  try {
    // Sort by minTZS asc so the ladder is deterministic + drop empty rows.
    const cleaned = [...tierList.value]
      .filter((t) => Number(t.minTZS) > 0 && Number(t.seats) > 0)
      .map((t) => ({ minTZS: Number(t.minTZS), seats: Number(t.seats), label: t.label || '' }))
      .sort((a, b) => a.minTZS - b.minTZS);
    const { event: e } = await updateEvent(route.params.id, {
      pledgeTiers: { tiers: cleaned, maxSeats: Number(maxSeats.value || 0) },
      pledgeDueAt: pledgeDueAt.value || null,
    });
    event.value = e;
    tierList.value = cleaned;
    toast.success('Tiers saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingTiers.value = false; }
}

async function recompute() {
  recomputing.value = true;
  try {
    const r = await recomputePledgeCards(route.params.id);
    toast.success(`Updated ${r.updated} guest${r.updated === 1 ? '' : 's'}`);
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { recomputing.value = false; }
}

function isPlaceholderPhone(phone) {
  return String(phone || '').startsWith('no-phone:');
}

// List+detail split pane — selectedId drives the right-hand panel.
const selectedId = ref(null);
const selected = computed(() => items.value.find((p) => p._id === selectedId.value) || null);
const tiersOpen = ref(false);

// Filtering + search
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'fulfilled', label: 'Received' },
];
const filter = ref('all');
const search = ref('');

// The stored pledge.status field only gets flipped to 'fulfilled' by the
// receipt-add flow's server-side recompute — guests whose amount/received
// were set another way (import, Recompute button touching type/familySize
// but not status, a direct edit) can end up mathematically fully paid
// while status is still stuck on 'pending'. Compute fulfilled from the
// actual numbers instead of trusting a field that can silently desync —
// this is what was showing "Pending" for guests who'd clearly paid in full.
function isFulfilled(p) {
  const amt = p.pledge?.amount || 0;
  return amt > 0 && (p.pledge?.receivedTZS || 0) >= amt;
}

function matchesFilter(p, f) {
  const fulfilled = isFulfilled(p);
  if (f === 'fulfilled') return fulfilled;
  if (f === 'pending') return !fulfilled;
  if (f === 'overdue') return isOverdue(p);
  return true;
}
function segmentCount(f) { return items.value.filter((p) => matchesFilter(p, f)).length; }

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return items.value.filter((p) => {
    if (!matchesFilter(p, filter.value)) return false;
    if (!q) return true;
    return [p.firstName, p.lastName, p.phone, p.memberId, p.pledge?.item]
      .filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  });
});
// Keep the right-hand panel non-empty when possible: select the first
// visible row whenever the current selection scrolls out of the active
// filter/search (or nothing was selected yet).
watch(filtered, (list) => {
  if (!list.some((p) => p._id === selectedId.value)) selectedId.value = list[0]?._id || null;
}, { immediate: true });

function outstanding(p) {
  return Math.max(0, (p.pledge?.amount || 0) - (p.pledge?.receivedTZS || 0));
}
function pct(p) {
  const amt = p.pledge?.amount || 0;
  if (!amt) return isFulfilled(p) ? 100 : 0;
  return Math.round(((p.pledge?.receivedTZS || 0) / amt) * 100);
}

const historyOpen = ref(false);
const historyGuest = ref(null);
function openHistory(p) { historyGuest.value = p; historyOpen.value = true; }

async function refresh() {
  loading.value = true;
  try {
    const [list, s, ev] = await Promise.all([
      listPledges(route.params.id),
      guestStats(route.params.id),
      getEvent(route.params.id),
    ]);
    items.value = list;
    stats.value = s;
    event.value = ev.event;
    const pt = ev.event?.pledgeTiers || {};
    tierList.value = (pt.tiers && pt.tiers.length)
      ? pt.tiers.map((t) => ({ ...t }))
      : (pt.singleTZS || pt.doubleTZS
          ? [
              pt.singleTZS ? { minTZS: pt.singleTZS, seats: 1, label: 'Single' } : null,
              pt.doubleTZS ? { minTZS: pt.doubleTZS, seats: 2, label: 'Double' } : null,
            ].filter(Boolean)
          : []);
    maxSeats.value = pt.maxSeats || 0;
    pledgeDueAt.value = ev.event?.pledgeDueAt ? new Date(ev.event.pledgeDueAt).toISOString().slice(0, 10) : '';
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

const PLACEHOLDERS = ['{{first_name}}', '{{event_name}}', '{{amount}}', '{{received}}', '{{outstanding}}', '{{item}}', '{{due_date}}', '{{code}}'];
const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'tigopesa', label: 'Tigo Pesa' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'halopesa', label: 'Halopesa' },
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];
const receiptOpen = ref(false);
const receiptTarget = ref(null);
const receiptSaving = ref(false);
const editingReceiptId = ref(null);
const receipt = reactive({ amountTZS: null, method: 'mpesa', reference: '', note: '' });

// r omitted → "Add" mode; passed → "Edit" mode, pre-filled from that receipt.
function openReceipt(p, r) {
  receiptTarget.value = p;
  editingReceiptId.value = r?._id || null;
  Object.assign(receipt, r
    ? { amountTZS: r.amountTZS, method: r.method || 'mpesa', reference: r.reference || '', note: r.note || '' }
    : { amountTZS: null, method: 'mpesa', reference: '', note: '' });
  receiptOpen.value = true;
}
async function removeReceipt(p, r) {
  if (!(await askConfirm(`Void this ${formatTZS(r.amountTZS)} receipt? It stays on the guest's ledger as a "voided" row for the audit trail — you're just rolling it back from the totals.`))) return;
  try {
    await deletePledgeReceipt(route.params.id, p._id, r._id);
    toast.success('Receipt voided');
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
async function submitReceipt() {
  if (!receipt.amountTZS || receipt.amountTZS < 100) { toast.error('Amount required'); return; }
  receiptSaving.value = true;
  try {
    if (editingReceiptId.value) {
      await updatePledgeReceipt(route.params.id, receiptTarget.value._id, editingReceiptId.value, { ...receipt });
      toast.success('Receipt updated');
    } else {
      await addPledgeReceipt(route.params.id, receiptTarget.value._id, { ...receipt });
      toast.success('Receipt recorded');
    }
    receiptOpen.value = false;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { receiptSaving.value = false; }
}

function isOverdue(p) {
  if (!event.value?.pledgeDueAt) return false;
  return new Date(event.value.pledgeDueAt) < new Date() && !isFulfilled(p);
}

// Mirrors send.service's renderMessage()/defaultBody exactly so the
// preview shown here is what actually gets sent, not an approximation.
function renderPledgeMessage(guest, segment, customTpl) {
  const ev = event.value || {};
  const pledged = guest.pledge?.amount || 0;
  const received = guest.pledge?.receivedTZS || 0;
  const out = Math.max(0, pledged - received);
  const item = guest.pledge?.item ? ` (${guest.pledge.item})` : '';
  const dueDate = ev.pledgeDueAt;
  const shortCode = ev.code && guest.pubCode ? `${ev.code}-${guest.pubCode}` : (guest.memberId || '');
  const defaultBody = segment === 'fulfilled'
    ? 'Asante sana ndugu, {{guest_name}} kwa kukamilisha ahadi yako kwaajili ya harusi ya {{event_name}}. Code yako ya utambulisho ni: {{code}}.'
    : 'Habari ndugu {{guest_name}}, tunapenda kukumbusha kupunguza au kumaliza ahadi yako kwa ajili ya harusi ya {{event_name}}, hadi sasa umeweza kupunguza kiasi cha {{received}}. Tafadhali kamilisha michango kabla ya tarehe {{due_date}} ili tuweze kukamilisha jambo hili la baraka. Asante.';
  const base = (customTpl && customTpl.trim()) ? customTpl : defaultBody;
  return base
    .replaceAll('{{first_name}}', guest.firstName || '')
    .replaceAll('{{guest_name}}', `${guest.firstName} ${guest.lastName || ''}`.trim())
    .replaceAll('{{event_name}}', ev.name || '')
    .replaceAll('{{amount}}', formatTZS(pledged))
    .replaceAll('{{received}}', formatTZS(received))
    .replaceAll('{{outstanding}}', formatTZS(out))
    .replaceAll('{{item}}', item)
    .replaceAll('{{due_date}}', dueDate ? formatDate(dueDate) : '')
    .replaceAll('{{code}}', shortCode);
}

const sendPreviewOpen = ref(false);
const sendPreviewTarget = ref(null);
const sendPreviewSegment = ref('outstanding'); // 'outstanding' | 'fulfilled'
const sendPreviewChannel = ref('auto');
const sendPreviewText = ref('');
const sendPreviewSending = ref(false);

function openSendPreview(p, segment) {
  sendPreviewTarget.value = p;
  sendPreviewSegment.value = segment;
  sendPreviewChannel.value = 'auto';
  sendPreviewText.value = renderPledgeMessage(p, segment);
  sendPreviewOpen.value = true;
}

async function confirmSendPreview() {
  sendPreviewSending.value = true;
  try {
    const r = await sendPledgeReminders(route.params.id, {
      guestIds: [sendPreviewTarget.value._id],
      channel: sendPreviewChannel.value,
      template: sendPreviewText.value,
      segment: sendPreviewSegment.value,
    });
    toast.success(`Sent ${r.sent}, failed ${r.failed}`);
    sendPreviewOpen.value = false;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { sendPreviewSending.value = false; }
}

async function toggleStatus(p) {
  const newStatus = p.pledge?.status === 'fulfilled' ? 'pending' : 'fulfilled';
  try {
    await updateGuest(route.params.id, p._id, { pledge: { ...p.pledge, status: newStatus } });
    p.pledge = { ...p.pledge, status: newStatus };
    // Refresh totals
    stats.value = await guestStats(route.params.id);
    toast.success('Updated');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(refresh);
</script>
