<template>
  <PageShell
    title="Reminders"
    :crumbs="[{ label: 'Events', to: '/app/events' }, { label: 'Event', to: `/app/events/${route.params.id}` }, { label: 'Reminders' }]"
  >
    <template #actions>
      <Button v-if="!cascade?.steps?.length" variant="secondary" size="md" :loading="busy" @click="loadDefaults">
        <template #leading><ArrowPathIcon class="w-4 h-4" /></template>
        Load defaults
      </Button>
      <Button v-if="cascade" variant="secondary" size="md" :loading="busy" @click="togglePause">
        <template #leading>
          <PauseIcon v-if="cascade.active" class="w-4 h-4" />
          <PlayIcon v-else class="w-4 h-4" />
        </template>
        {{ cascade.active ? 'Pause cascade' : 'Resume cascade' }}
      </Button>
      <Button variant="primary" size="md" @click="startNew">
        <template #leading><PlusIcon class="w-4 h-4" /></template>
        Add step
      </Button>
    </template>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <template v-else>
      <!-- Reminders can't fire on an unpaid event — surface it here too
           so the organiser doesn't build a cascade that quietly does nothing. -->
      <WatermarkBanner :event="event" audience="owner" />
      <!-- Cascade status card -->
      <div v-if="cascade" class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-4 mb-6 flex items-center gap-4 flex-wrap">
        <span class="relative flex h-3 w-3 shrink-0">
          <span v-if="cascade.active" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-success opacity-75" />
          <span :class="['relative inline-flex rounded-full h-3 w-3', cascade.active ? 'bg-state-success' : 'bg-state-warning']" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">
            Cascade is <span :class="cascade.active ? 'text-state-success' : 'text-state-warning'">{{ cascade.active ? 'active' : 'paused' }}</span>
          </p>
          <p class="text-sm text-surface-slate dark:text-surface-ash">
            {{ (cascade.steps || []).filter((s) => !s.fired).length }} pending · {{ (cascade.steps || []).filter((s) => s.fired).length }} fired
          </p>
        </div>
      </div>

      <EmptyState v-if="!cascade || !cascade.steps?.length"
                  title="No reminders scheduled"
                  description="Load the defaults for a proven wedding cascade (save-the-date, T-7 reminder, event day, thank-you) or design your own from scratch.">
        <template #icon><ClockIcon class="w-7 h-7" /></template>
        <template #actions>
          <Button variant="primary" @click="loadDefaults" :loading="busy">Load defaults</Button>
          <Button variant="secondary" @click="startNew">Add first step</Button>
        </template>
      </EmptyState>

      <!-- Horizontal timeline visualization — steps laid out along an
           axis with the event day as anchor. Steps to the left of the
           anchor are "before"; to the right, "after". -->
      <div v-else class="mb-6">
        <SectionHeader title="Timeline" level="subsection" description="Every step relative to your event date." />
        <div class="relative overflow-x-auto pb-4 hide-scrollbar">
          <div class="relative min-w-[720px] py-6">
            <!-- Axis -->
            <div class="absolute left-0 right-0 top-1/2 h-0.5 bg-surface-mist dark:bg-surface-fog" />
            <!-- Event-day anchor -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
              <div class="w-4 h-4 rounded-full bg-gradient-primary shadow-primary-glow" />
              <span class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft absolute top-6 whitespace-nowrap">Event day</span>
            </div>
            <!-- Step markers -->
            <div class="relative grid grid-flow-col auto-cols-fr gap-2 items-center min-h-[80px]">
              <div v-for="s in sortedSteps" :key="s._id"
                   class="relative flex flex-col items-center pt-2">
                <button type="button" @click="edit(s)"
                        :class="['w-3 h-3 rounded-full border-2 transition-all duration-fast z-10',
                                 s.fired
                                   ? 'bg-state-success border-state-success'
                                   : s.offsetMinutes < 0
                                     ? 'bg-surface-ivory dark:bg-surface-coal border-brand-primary hover:scale-125'
                                     : 'bg-surface-ivory dark:bg-surface-coal border-state-success hover:scale-125']"
                        :title="`${s.name} · ${offsetLabel(s.offsetMinutes)}`" />
                <span class="text-2xs font-black tabular-nums text-surface-charcoal dark:text-surface-bone mt-3 whitespace-nowrap">{{ offsetLabelShort(s.offsetMinutes) }}</span>
                <span class="text-2xs text-surface-slate dark:text-surface-ash mt-0.5 max-w-[80px] text-center truncate">{{ s.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed step list — richer info, action buttons -->
      <div v-if="cascade?.steps?.length" class="space-y-3">
        <SectionHeader title="Steps" level="subsection" />
        <div v-for="s in sortedSteps" :key="s._id"
             :class="['rounded-2xl bg-surface-ivory dark:bg-surface-coal border p-4 flex items-start gap-4 transition-opacity',
                      s.fired ? 'border-surface-mist/50 dark:border-surface-fog/50 opacity-70' : 'border-surface-mist dark:border-surface-fog']">
          <!-- Offset column — the "when" -->
          <div class="flex flex-col items-center w-20 shrink-0">
            <Badge :tone="s.fired ? 'success' : s.offsetMinutes < 0 ? 'primary' : 'success'" size="sm">
              {{ s.offsetMinutes < 0 ? 'BEFORE' : s.offsetMinutes === 0 ? 'AT' : 'AFTER' }}
            </Badge>
            <p class="text-md font-black text-surface-charcoal dark:text-surface-bone tabular-nums mt-1.5 whitespace-nowrap">{{ offsetLabel(s.offsetMinutes) }}</p>
            <p v-if="fireAt(s)" class="text-2xs text-surface-slate dark:text-surface-ash text-center leading-tight mt-0.5">{{ fireAt(s) }}</p>
          </div>

          <!-- Step content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-md font-black text-surface-charcoal dark:text-surface-bone truncate">{{ s.name }}</p>
              <Badge size="sm" tone="neutral">{{ s.channel }}</Badge>
              <Badge v-if="s.template?.waTemplate" size="sm" tone="neutral">WA: {{ s.template.waTemplate }}</Badge>
              <Badge v-if="s.audience?.rsvpStatus" size="sm" tone="neutral">rsvp: {{ s.audience.rsvpStatus }}</Badge>
              <Badge v-if="s.audience?.arrivalStatus" size="sm" tone="neutral">{{ s.audience.arrivalStatus }}</Badge>
              <Badge v-if="s.audience?.vipOnly" size="sm" tone="warning">VIP</Badge>
              <Badge v-if="s.fired" size="sm" tone="success">
                <CheckCircleIcon class="w-3 h-3" /> fired {{ relative(s.firedAt) }}
              </Badge>
            </div>
            <p class="text-sm text-surface-slate dark:text-surface-ash mt-1.5 line-clamp-2">
              {{ s.template?.body || (s.template?.waTemplate ? '(WhatsApp template — no SMS body)' : '') }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button class="btn-ghost !p-1.5" :disabled="s.fired" @click="edit(s)" title="Edit">
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button class="btn-ghost !p-1.5 !text-state-danger" @click="remove(s)" title="Delete">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Editor — mirrors the Messaging composer: WA template picker + variable
         mapping + per-send overrides + SMS body with placeholder chips + audience
         + one or more fire times (each becomes a separate step so scheduling
         stays clean per-fire). -->
    <AppModal v-model="editorOpen" :title="editing._id ? 'Edit reminder' : 'New reminder'" :maxWidth="820">
      <div class="space-y-4">
        <AppInput v-model="editing.name" label="Reminder name" placeholder="Kesho tunakutana" />

        <!-- FIRE TIMES: one or more entries. Absolute datetime OR event-relative. -->
        <div class="surface-inset p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-heading">Fire time{{ fireTimes.length > 1 ? 's' : '' }}</p>
            <button v-if="!editing._id" class="btn-ghost !text-xs" @click="fireTimes.push(newFireTime())">
              <PlusIcon class="w-3.5 h-3.5" /> Add another time
            </button>
          </div>
          <div v-for="(ft, i) in fireTimes" :key="i" class="grid grid-cols-12 gap-2 items-center">
            <select v-model="ft.mode" class="col-span-3 field-input !py-1.5 !text-sm">
              <option value="offset">Relative to event</option>
              <option value="absolute">Exact date & time</option>
            </select>
            <template v-if="ft.mode === 'offset'">
              <input type="number" v-model.number="ft.value" class="col-span-2 field-input !py-1.5 !text-sm" placeholder="1" />
              <select v-model="ft.unit" class="col-span-2 field-input !py-1.5 !text-sm">
                <option value="minutes">min</option>
                <option value="hours">hrs</option>
                <option value="days">days</option>
              </select>
              <select v-model="ft.dir" class="col-span-3 field-input !py-1.5 !text-sm">
                <option value="before">before event</option>
                <option value="after">after event</option>
                <option value="at">at event start</option>
              </select>
            </template>
            <template v-else>
              <input type="datetime-local" v-model="ft.at" class="col-span-7 field-input !py-1.5 !text-sm" />
            </template>
            <button v-if="fireTimes.length > 1 && !editing._id"
                    class="col-span-2 text-red-500 hover:text-red-700 text-xs" @click="fireTimes.splice(i, 1)">
              <TrashIcon class="w-3.5 h-3.5 inline" /> remove
            </button>
            <p v-if="event?.date" class="col-span-12 -mt-1 text-2xs text-surface-slate dark:text-surface-ash">
              → fires around <strong>{{ previewFireTime(ft) }}</strong>
            </p>
          </div>
        </div>

        <AppSelect v-model="editing.channel" label="Channel" :options="[
          {value:'auto',label:'Auto (WhatsApp → SMS)'},
          {value:'whatsapp',label:'WhatsApp only'},
          {value:'sms',label:'SMS only'},
          {value:'both',label:'Both'},
        ]" />

        <!-- WA template picker + mapping + overrides (only relevant if channel uses WA) -->
        <div v-if="usesWhatsApp"
             class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-heading">💬 WhatsApp template</p>
            <button class="btn-ghost !text-xs" :disabled="syncingWa" @click="syncWaTemplates">
              <ArrowPathIcon class="w-3.5 h-3.5" :class="syncingWa ? 'animate-spin' : ''" />
              {{ syncingWa ? 'Syncing…' : 'Sync from Meta' }}
            </button>
          </div>
          <select v-model="editing.template.waTemplate" class="field-input !text-sm">
            <option value="">— no WA template (SMS only) —</option>
            <option v-for="t in waTemplates" :key="t.name + t.language" :value="t.name">
              {{ t.name }} [{{ t.language }}]
              {{ t.hasImageHeader ? '· 🖼' : '' }}
              {{ t.buttonsKind === 'url' ? '· 🔗' : t.buttonsKind === 'quickreply' ? '· 💬' : '' }}
            </option>
          </select>
          <div v-if="selectedWaMeta?.bodyVarCount" class="space-y-1.5">
            <p class="text-2xs uppercase font-bold text-surface-slate dark:text-surface-ash">Body variables</p>
            <div v-for="n in selectedWaMeta.bodyVarCount" :key="'b'+n"
                 class="grid grid-cols-12 gap-2 items-center">
              <span class="col-span-2 font-mono text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-center">
                {{ placeholderLabel(n) }}
              </span>
              <select v-model="selectedWaMeta.varMap[String(n)]" class="col-span-5 field-input !py-1.5 !text-sm">
                <option value="">— auto: unset —</option>
                <option v-for="tok in bodyTokens" :key="tok" :value="tok">{{ tok }}</option>
              </select>
              <input v-model="editing.template.waOverrides[String(n)]"
                     class="col-span-5 field-input !py-1.5 !text-sm"
                     placeholder="or type override text…" />
            </div>
          </div>
        </div>

        <!-- SMS body + placeholder chips (used for the SMS channel, and by
             MessageLog record). -->
        <div v-if="usesSms" class="surface-inset p-3 space-y-2">
          <p class="text-heading">💬 SMS body</p>
          <textarea v-model="editing.template.body" :rows="4"
                    class="field-input font-medium resize-y w-full" ref="bodyRef"
                    placeholder="Habari {{first_name}}, tunakusubiri kesho..." />
          <div class="flex flex-wrap gap-1.5">
            <button v-for="p in PLACEHOLDERS" :key="p.token" type="button"
                    class="chip-gold !text-2xs hover:!scale-105 transition"
                    @click="insertPlaceholder(p.token)">
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Audience filters -->
        <div class="surface-inset p-3 space-y-2">
          <p class="text-heading">Audience</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppSelect v-model="editing.audience.rsvpStatus" label="RSVP" :options="[
              {value:'',label:'Any'},{value:'pending',label:'Pending'},{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'maybe',label:'Maybe'},
            ]" />
            <AppSelect v-model="editing.audience.arrivalStatus" label="Arrival" :options="[
              {value:'',label:'Any'},{value:'not_arrived',label:'Not arrived'},{value:'arrived',label:'Arrived'},
            ]" />
          </div>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="editing.audience.vipOnly" class="accent-brand-gold w-4 h-4" />
            <span class="text-heading">VIP only</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label">Reached pledge tier</label>
              <select v-model.number="editing.audience.pledgePaidAtLeastTZS" class="field-input !text-sm">
                <option :value="0">Any pledge (or none)</option>
                <option v-for="t in eventPledgeTiers" :key="t.minTZS" :value="t.minTZS">
                  {{ t.label || `${t.seats} seat${t.seats === 1 ? '' : 's'}` }}
                  (≥ {{ Number(t.minTZS).toLocaleString() }} TZS)
                </option>
              </select>
            </div>
            <label class="flex items-end gap-2 pb-3">
              <input type="checkbox" v-model="editing.audience.pledgeCompleted" class="accent-brand-gold w-4 h-4" />
              <span class="text-heading">Only pledge fully paid</span>
            </label>
          </div>
        </div>

        <div class="flex items-center gap-2 text-sm font-semibold text-surface-charcoal dark:text-surface-bone">
          <UsersIcon class="w-4 h-4 text-surface-slate dark:text-surface-ash" />
          <span v-if="audienceCountLoading" class="text-subtext">Counting…</span>
          <span v-else-if="audienceCount === null" class="text-subtext">— guests</span>
          <span v-else>{{ audienceCount }} guest{{ audienceCount === 1 ? '' : 's' }} match this audience right now</span>
        </div>

        <p v-if="editorError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ editorError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="editorOpen = false">Cancel</button>
          <AppButton :loading="saving" @click="save">
            Save {{ fireTimes.length > 1 && !editing._id ? `${fireTimes.length} steps` : 'step' }}
          </AppButton>
        </div>
      </div>
    </AppModal>
  </PageShell>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowPathIcon, PauseIcon, PlayIcon, PlusIcon, PencilSquareIcon, TrashIcon,
  ClockIcon, CheckCircleIcon, UsersIcon,
} from '@heroicons/vue/24/outline';
import { getEvent } from '@/services/events.service';
import {
  getCascade, getDefaultSteps, upsertCascade, addStep, patchStep, deleteStep, pauseCascade,
} from '@/services/reminders.service';
import { previewMessageCost } from '@/services/messaging.service';
import { listWhatsAppTemplates, syncWhatsAppTemplates } from '@/services/whatsappTemplates.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { askConfirm } from '@/composables/useConfirm';
import { relative } from '@/utils/format';
import PageShell from '@/components/shell/PageShell.vue';
import WatermarkBanner from '@/components/events/WatermarkBanner.vue';
import { Badge, Button, EmptyState, SectionHeader } from '@/components/ui';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';

const route = useRoute();
const toast = useToast();
const loading = ref(true);
const busy = ref(false);
const event = ref(null);
const cascade = ref(null);

const PLACEHOLDERS = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{event_name}}', label: 'Event' },
  { token: '{{date}}', label: 'Date' },
  { token: '{{venue}}', label: 'Venue' },
  { token: '{{code}}', label: 'Short code' },
  { token: '{{countdown_days}}', label: 'Days to event' },
  { token: '{{gallery_url}}', label: 'Gallery link' },
];

const sortedSteps = computed(() =>
  [...(cascade.value?.steps || [])].sort((a, b) => a.offsetMinutes - b.offsetMinutes),
);
const eventPledgeTiers = computed(() => {
  const t = event.value?.pledgeTiers?.tiers;
  return Array.isArray(t) ? [...t].sort((a, b) => a.minTZS - b.minTZS) : [];
});

function offsetLabel(m) {
  if (m === 0) return 'at start';
  const abs = Math.abs(m);
  if (abs >= 60 * 24) return `${Math.round(abs / (60 * 24))}d`;
  if (abs >= 60) return `${Math.round(abs / 60)}h`;
  return `${abs}m`;
}
// Compact form for the horizontal timeline markers — "T-7d" / "T+1d" /
// "T-0" style so the axis reads at a glance without the mental math of
// which side of the anchor a marker sits on.
function offsetLabelShort(m) {
  if (m === 0) return 'T·0';
  const abs = Math.abs(m);
  const sign = m < 0 ? '−' : '+';
  if (abs >= 60 * 24) return `T${sign}${Math.round(abs / (60 * 24))}d`;
  if (abs >= 60) return `T${sign}${Math.round(abs / 60)}h`;
  return `T${sign}${abs}m`;
}
function fireAt(step) {
  if (!event.value?.date) return '';
  const d = new Date(new Date(event.value.date).getTime() + step.offsetMinutes * 60_000);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function placeholderLabel(n) { return '{' + '{' + n + '}' + '}'; }

// ── WhatsApp template cache
const waTemplates = ref([]);
const bodyTokens = ref([]);
const syncingWa = ref(false);
async function refreshWa() {
  try {
    const resp = await listWhatsAppTemplates();
    const items = (resp.items || resp || []).map((t) => ({
      ...t,
      varMap: t.varMap && typeof t.varMap === 'object' ? t.varMap : {},
      buttonLabels: t.buttonLabels || [],
    }));
    waTemplates.value = items;
    bodyTokens.value = resp.bodyTokens || [];
  } catch (_) {}
}
async function syncWaTemplates() {
  syncingWa.value = true;
  try { await syncWhatsAppTemplates(); await refreshWa(); toast.success('Synced'); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { syncingWa.value = false; }
}
const selectedWaMeta = computed(() =>
  waTemplates.value.find((t) => t.name === editing.template.waTemplate) || null,
);
const usesWhatsApp = computed(() => ['auto', 'whatsapp', 'both'].includes(editing.channel));
const usesSms = computed(() => ['auto', 'sms', 'both'].includes(editing.channel));

async function refresh() {
  loading.value = true;
  try {
    const [ev, c] = await Promise.all([getEvent(route.params.id), getCascade(route.params.id)]);
    event.value = ev.event;
    cascade.value = c;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function loadDefaults() {
  busy.value = true;
  try {
    const defaults = await getDefaultSteps(route.params.id);
    await upsertCascade(route.params.id, { steps: defaults, active: true });
    toast.success('Defaults loaded');
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { busy.value = false; }
}

async function togglePause() {
  busy.value = true;
  try {
    if (cascade.value.active) { await pauseCascade(route.params.id); toast.success('Paused'); }
    else { await upsertCascade(route.params.id, { active: true }); toast.success('Resumed'); }
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { busy.value = false; }
}

// ── editor
const editorOpen = ref(false);
const saving = ref(false);
const editorError = ref('');
const bodyRef = ref(null);

const editing = reactive({
  _id: null, name: '', channel: 'auto',
  audience: { rsvpStatus: '', arrivalStatus: '', vipOnly: false, pledgePaidAtLeastTZS: 0, pledgeCompleted: false },
  template: { body: '', language: 'sw', waTemplate: '', waOverrides: {} },
});
// Multiple fire moments per invocation — each becomes its own step doc so the
// backend scheduler treats them independently.
function newFireTime() { return { mode: 'offset', value: 1, unit: 'days', dir: 'before', at: '' }; }
const fireTimes = ref([newFireTime()]);

// Live "N guests match" count in the step editor — same preview-cost
// endpoint the Messaging composer uses, so the number reflects exactly who
// buildAudienceFilter() would select if this step fired right now.
const audienceCount = ref(null);
const audienceCountLoading = ref(false);
let audienceCountTimer = null;
let audienceCountSeq = 0;
async function refreshAudienceCount() {
  if (!editorOpen.value) return;
  const seq = ++audienceCountSeq;
  audienceCountLoading.value = true;
  try {
    const audience = Object.fromEntries(
      Object.entries(editing.audience).filter(([, v]) => v !== '' && v !== false && v !== 0)
    );
    const res = await previewMessageCost(route.params.id, {
      channel: editing.channel,
      template: { body: editing.template.body || ' ', language: editing.template.language || 'sw' },
      audience,
    });
    if (seq === audienceCountSeq) audienceCount.value = res.guestCount ?? 0;
  } catch (err) {
    if (seq === audienceCountSeq) audienceCount.value = null;
  } finally {
    if (seq === audienceCountSeq) audienceCountLoading.value = false;
  }
}
function scheduleAudienceCount() {
  clearTimeout(audienceCountTimer);
  audienceCountTimer = setTimeout(refreshAudienceCount, 400);
}
watch(() => editorOpen.value, (open) => { if (open) scheduleAudienceCount(); else audienceCount.value = null; });
watch(editing, () => { if (editorOpen.value) scheduleAudienceCount(); }, { deep: true });

function toOffsetMinutes(ft) {
  if (ft.mode === 'absolute') {
    if (!ft.at || !event.value?.date) return 0;
    return Math.round((new Date(ft.at).getTime() - new Date(event.value.date).getTime()) / 60_000);
  }
  if (ft.dir === 'at') return 0;
  const mult = { minutes: 1, hours: 60, days: 60 * 24 }[ft.unit] || 1;
  const sign = ft.dir === 'before' ? -1 : 1;
  return sign * Math.abs(Number(ft.value || 0)) * mult;
}
function previewFireTime(ft) {
  const m = toOffsetMinutes(ft);
  const base = event.value?.date ? new Date(event.value.date).getTime() : Date.now();
  return new Date(base + m * 60_000).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function insertPlaceholder(token) {
  const el = bodyRef.value;
  if (!el || typeof el.selectionStart !== 'number') {
    editing.template.body = (editing.template.body || '') + token;
    return;
  }
  const s = el.selectionStart, e = el.selectionEnd, val = editing.template.body || '';
  editing.template.body = val.slice(0, s) + token + val.slice(e);
  nextTick(() => { el.focus(); el.selectionEnd = s + token.length; });
}

function startNew() {
  Object.assign(editing, {
    _id: null, name: '', channel: 'auto',
    audience: { rsvpStatus: '', arrivalStatus: '', vipOnly: false, pledgePaidAtLeastTZS: 0, pledgeCompleted: false },
    template: { body: '', language: 'sw', waTemplate: '', waOverrides: {} },
  });
  fireTimes.value = [newFireTime()];
  editorError.value = '';
  editorOpen.value = true;
}

function edit(s) {
  const cloned = JSON.parse(JSON.stringify(s));
  Object.assign(editing, {
    _id: cloned._id,
    name: cloned.name,
    channel: cloned.channel || 'auto',
    audience: {
      rsvpStatus: cloned.audience?.rsvpStatus || '',
      arrivalStatus: cloned.audience?.arrivalStatus || '',
      vipOnly: !!cloned.audience?.vipOnly,
      pledgePaidAtLeastTZS: cloned.audience?.pledgePaidAtLeastTZS || 0,
      pledgeCompleted: !!cloned.audience?.pledgeCompleted,
    },
    template: {
      body: cloned.template?.body || '',
      language: cloned.template?.language || 'sw',
      waTemplate: cloned.template?.waTemplate || '',
      waOverrides: cloned.template?.waOverrides || {},
    },
  });
  // Reverse-derive a single offset into the human form.
  const ft = newFireTime();
  const m = cloned.offsetMinutes;
  if (m === 0) { ft.dir = 'at'; ft.value = 0; ft.unit = 'minutes'; }
  else {
    ft.dir = m < 0 ? 'before' : 'after';
    const abs = Math.abs(m);
    if (abs % (60 * 24) === 0) { ft.unit = 'days'; ft.value = abs / (60 * 24); }
    else if (abs % 60 === 0)   { ft.unit = 'hours'; ft.value = abs / 60; }
    else                        { ft.unit = 'minutes'; ft.value = abs; }
  }
  fireTimes.value = [ft];
  editorError.value = '';
  editorOpen.value = true;
}

async function save() {
  editorError.value = '';
  if (!editing.name.trim()) { editorError.value = 'Name required'; return; }
  const hasSms = usesSms.value && editing.template.body?.trim();
  const hasWa = usesWhatsApp.value && editing.template.waTemplate;
  if (!hasSms && !hasWa) { editorError.value = 'Add either an SMS body or a WhatsApp template'; return; }

  saving.value = true;
  try {
    const audience = Object.fromEntries(
      Object.entries(editing.audience).filter(([, v]) => v !== '' && v !== false && v !== 0)
    );
    const template = {
      body: editing.template.body || '',
      language: editing.template.language || 'sw',
      ...(editing.template.waTemplate ? { waTemplate: editing.template.waTemplate } : {}),
      ...(Object.keys(editing.template.waOverrides || {}).length
        ? { waOverrides: editing.template.waOverrides } : {}),
    };

    if (editing._id) {
      // Edit path — one step, first fire time only.
      await patchStep(route.params.id, editing._id, {
        name: editing.name,
        offsetMinutes: toOffsetMinutes(fireTimes.value[0]),
        channel: editing.channel,
        audience, template,
      });
    } else {
      // New — one addStep call per fire time. Cascade auto-created if needed.
      if (!cascade.value) await upsertCascade(route.params.id, { steps: [] });
      for (let i = 0; i < fireTimes.value.length; i += 1) {
        const label = fireTimes.value.length > 1 ? ` (${i + 1}/${fireTimes.value.length})` : '';
        await addStep(route.params.id, {
          name: editing.name + label,
          offsetMinutes: toOffsetMinutes(fireTimes.value[i]),
          channel: editing.channel,
          audience, template,
        });
      }
    }
    toast.success('Saved');
    editorOpen.value = false;
    await refresh();
  } catch (err) { editorError.value = apiErrorMessage(err); }
  finally { saving.value = false; }
}

async function remove(s) {
  if (!(await askConfirm({ title: 'Delete reminder', message: `Delete step "${s.name}"?`, danger: true }))) return;
  try { await deleteStep(route.params.id, s._id); await refresh(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(async () => { await refresh(); refreshWa(); });
</script>
