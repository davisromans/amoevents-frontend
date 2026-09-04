<template>
  <div class="min-h-full flex flex-col">
    <!-- Progress rail — matches the register flow's visual language. -->
    <div class="max-w-2xl w-full mx-auto px-6 pt-10 sm:pt-14">
      <div class="flex items-center gap-2">
        <div v-for="(_, i) in STEPS" :key="i"
             :class="['h-1.5 flex-1 rounded-full transition-all duration-slow',
                      i < step ? 'bg-gradient-primary' : 'bg-surface-mist dark:bg-surface-fog']" />
      </div>
      <p class="mt-3 text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft">
        Getting started · Step {{ step }} of {{ STEPS.length }}
      </p>
    </div>

    <div class="flex-1 flex items-start justify-center px-6 py-10 sm:py-14">
      <div class="w-full max-w-2xl">
        <!-- ── STEP 1 — welcome ─────────────────────────────────────── -->
        <template v-if="step === 1">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft mb-6">
              <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/></svg>
            </div>
            <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone">Welcome, {{ firstName }}.</h1>
            <p class="mt-3 text-md sm:text-lg text-surface-slate dark:text-surface-ash max-w-lg mx-auto leading-relaxed">
              Two minutes and you'll have your first event ready to accept guests. Let's set it up.
            </p>
          </div>

          <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div v-for="h in HIGHLIGHTS" :key="h.title" class="surface-card p-5">
              <div class="w-9 h-9 rounded-xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center mb-3">
                <component :is="h.icon" class="w-5 h-5" />
              </div>
              <h3 class="text-md font-black text-surface-charcoal dark:text-surface-bone">{{ h.title }}</h3>
              <p class="mt-1 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">{{ h.description }}</p>
            </div>
          </div>

          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="primary" size="lg" @click="step = 2">
              Let's set up the first event
              <template #trailing>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </template>
            </Button>
            <button type="button" class="btn-ghost !text-sm" @click="skip">Skip for now</button>
          </div>
        </template>

        <!-- ── STEP 2 — create event ────────────────────────────────── -->
        <template v-else-if="step === 2">
          <h1 class="text-3xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone">What's the event?</h1>
          <p class="mt-2 text-md text-surface-slate dark:text-surface-ash">The basics — you can polish everything else later.</p>

          <form class="mt-8 space-y-4" @submit.prevent="createEvent">
            <Field label="Event name" :error="errors.name" required>
              <template #default="{ id, invalid, ariaDescribedby }">
                <TextInput v-model="form.name" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                           placeholder="Amara & Kito's Wedding" required />
              </template>
            </Field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" :error="errors.date" required>
                <template #default="{ id, invalid, ariaDescribedby }">
                  <TextInput v-model="form.date" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                             type="date" required />
                </template>
              </Field>
              <Field label="Type" required>
                <template #default="{ id }">
                  <Select v-model="form.eventType" :id="id" :options="EVENT_TYPES" />
                </template>
              </Field>
            </div>

            <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>

            <div class="flex items-center gap-2 pt-2">
              <Button variant="secondary" size="lg" type="button" @click="step = 1">
                <template #leading>
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
                </template>
                Back
              </Button>
              <Button variant="primary" size="lg" :loading="loading" type="submit" class="ml-auto">
                Create event
                <template #trailing>
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </template>
              </Button>
            </div>
          </form>
        </template>

        <!-- ── STEP 3 — done, offer guest import ─────────────────────── -->
        <template v-else-if="step === 3">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-state-success-bg text-state-success mb-6">
              <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone">"{{ createdEvent?.name }}" is live.</h1>
            <p class="mt-3 text-md sm:text-lg text-surface-slate dark:text-surface-ash max-w-lg mx-auto leading-relaxed">
              Add guests next — either by importing an Excel sheet or entering them one by one.
            </p>
          </div>

          <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <router-link :to="`/app/events/${createdEvent?._id}/guests`" class="surface-card p-6 hover:shadow-elev-3 hover:border-brand-primary/40 transition-all group">
              <div class="w-10 h-10 rounded-xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ArrowUpTrayIcon class="w-5 h-5" />
              </div>
              <h3 class="text-md font-black text-surface-charcoal dark:text-surface-bone">Import from Excel</h3>
              <p class="mt-1 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">Drop your spreadsheet — we'll dedupe phones and match columns automatically.</p>
            </router-link>
            <router-link :to="`/app/events/${createdEvent?._id}/guests`" class="surface-card p-6 hover:shadow-elev-3 hover:border-brand-primary/40 transition-all group">
              <div class="w-10 h-10 rounded-xl bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <PlusIcon class="w-5 h-5" />
              </div>
              <h3 class="text-md font-black text-surface-charcoal dark:text-surface-bone">Add manually</h3>
              <p class="mt-1 text-sm text-surface-slate dark:text-surface-ash leading-relaxed">Name and phone, one at a time. Best when you already know exactly who's coming.</p>
            </router-link>
          </div>

          <div class="mt-8 flex items-center justify-center">
            <Button variant="ghost" @click="finish">I'll do this later — take me to the dashboard</Button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useShellStore } from '@/stores/shell';
import { createEvent as createEventApi } from '@/services/events.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { Button, Field, TextInput, Select } from '@/components/ui';
import {
  UsersIcon, ChatBubbleLeftRightIcon, PhotoIcon,
  ArrowUpTrayIcon, PlusIcon,
} from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const shell = useShellStore();
const router = useRouter();
const toast = useToast();

const STEPS = [1, 2, 3];
const step = ref(1);
const firstName = computed(() => (auth.user?.name || 'friend').split(' ')[0]);

const HIGHLIGHTS = [
  { title: 'Guests in seconds', description: 'Excel import handles the dedupe. Manual add is one line.', icon: UsersIcon },
  { title: 'Send anywhere',     description: 'WhatsApp first, SMS falls back. Every guest reached.',       icon: ChatBubbleLeftRightIcon },
  { title: 'Every memory kept', description: 'Photos and video stay for years, ready to share.',            icon: PhotoIcon },
];

const EVENT_TYPES = [
  { value: 'wedding',      label: 'Wedding' },
  { value: 'send_off',     label: 'Send-off' },
  { value: 'kitchen_party',label: 'Kitchen party' },
  { value: 'birthday',     label: 'Birthday' },
  { value: 'graduation',   label: 'Graduation' },
  { value: 'church',       label: 'Church service' },
  { value: 'concert',      label: 'Concert' },
  { value: 'conference',   label: 'Conference' },
  { value: 'other',        label: 'Other' },
];

const form = reactive({ name: '', date: '', eventType: 'wedding' });
const errors = reactive({ name: '', date: '' });
const loading = ref(false);
const serverError = ref('');
const createdEvent = ref(null);

function markOnboarded() {
  try { localStorage.setItem('ae.onboarded', '1'); } catch { /* private mode */ }
}

function skip() {
  markOnboarded();
  router.replace('/app/events');
}

function finish() {
  markOnboarded();
  shell.invalidateEvents();
  router.replace(createdEvent.value ? `/app/events/${createdEvent.value._id}` : '/app');
}

async function createEvent() {
  errors.name = ''; errors.date = ''; serverError.value = '';
  if (!form.name.trim())   errors.name = 'Required';
  if (!form.date)          errors.date = 'Pick a date';
  if (errors.name || errors.date) return;
  loading.value = true;
  try {
    // Convert `YYYY-MM-DD` to a full ISO date at noon local so timezone
    // rounding doesn't flip the event's day.
    const iso = new Date(`${form.date}T12:00:00`).toISOString();
    const res = await createEventApi({ name: form.name.trim(), date: iso, eventType: form.eventType });
    createdEvent.value = res.data || res;
    shell.invalidateEvents();
    step.value = 3;
    toast.success('Event created');
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}

// If they somehow land here with the onboarded flag already set, bounce
// them to the app — no infinite reintroduction loop.
onMounted(() => {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('ae.onboarded') === '1') {
    router.replace('/app/events');
  }
});
</script>
