<template>
  <PageShell
    title="Settings"
    description="Everything about your account, workspace, and how AmoEvents behaves for you."
  >
    <template #tabs>
      <Tabs v-model="section" :tabs="sectionTabs" variant="underline" />
    </template>

    <!-- Profile -->
    <section v-if="section === 'profile'" class="max-w-3xl space-y-5">
      <div class="surface-card p-6">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-xl font-black shrink-0 shadow-primary-soft">
            {{ initials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-black text-surface-charcoal dark:text-surface-bone truncate">{{ auth.user?.name }}</p>
            <div class="mt-0.5 flex items-center gap-2 text-sm text-surface-slate dark:text-surface-ash">
              <span class="truncate">{{ phoneDisplay }}</span>
              <span v-if="phoneVerified" class="chip-success text-2xs !py-0 !px-2">✓ verified</span>
              <button v-else class="text-xs font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline"
                      @click="openPhoneGate">Add phone</button>
            </div>
            <div class="mt-2"><RoleBadge :role="auth.role" /></div>
          </div>
        </div>
      </div>

      <div class="surface-card p-6 space-y-4">
        <h2 class="text-heading">Your profile</h2>
        <form class="grid grid-cols-1 sm:grid-cols-2 gap-3" @submit.prevent="submitProfile">
          <Field label="Full name">
            <template #default="{ id }">
              <TextInput v-model="profile.name" :id="id" required />
            </template>
          </Field>
          <Field label="Email">
            <template #default="{ id }">
              <TextInput v-model="profile.email" :id="id" type="email" placeholder="you@example.com" />
            </template>
          </Field>
          <div class="sm:col-span-2 flex items-center justify-end">
            <Button variant="primary" :loading="profileLoading" type="submit">Save profile</Button>
          </div>
        </form>
      </div>

      <div v-if="auth.tenant" class="surface-card p-6">
        <h2 class="text-heading mb-4">Workspace</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
          <div>
            <dt class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">Business</dt>
            <dd class="mt-1 text-md font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ auth.tenant.name }}</dd>
          </div>
          <div>
            <dt class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">Plan</dt>
            <dd class="mt-1 text-md font-bold text-surface-charcoal dark:text-surface-bone capitalize">{{ auth.tenant.plan }}</dd>
          </div>
          <div v-if="auth.tenant.referralCode">
            <dt class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">Referral code</dt>
            <dd class="mt-1 text-md font-black tabular-nums text-brand-primary-deep dark:text-brand-primary-soft">{{ auth.tenant.referralCode }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Security -->
    <section v-else-if="section === 'security'" class="max-w-2xl space-y-5">
      <div class="surface-card p-6 space-y-4">
        <div>
          <h2 class="text-heading">Change password</h2>
          <p class="text-subtext">Pick something you don't use anywhere else.</p>
        </div>
        <form class="grid grid-cols-1 sm:grid-cols-2 gap-3" @submit.prevent="submitPassword">
          <Field label="Current password" class="sm:col-span-2">
            <template #default="{ id }">
              <TextInput v-model="pw.oldPassword" :id="id" type="password" autocomplete="current-password" required />
            </template>
          </Field>
          <Field label="New password" class="sm:col-span-2" :error="pwError">
            <template #default="{ id, invalid }">
              <TextInput v-model="pw.newPassword" :id="id" :invalid="invalid" type="password" autocomplete="new-password" required />
            </template>
          </Field>
          <div class="sm:col-span-2 flex items-center justify-end">
            <Button variant="primary" :loading="pwLoading" type="submit">Update password</Button>
          </div>
        </form>
      </div>

      <div class="surface-card p-6 space-y-4">
        <div>
          <h2 class="text-heading">Amoview account</h2>
          <p class="text-subtext">
            Link your Amoview phone number so the mobile app's Events tab shows the same events you manage here — without
            linking, this AmoEvents login and your Amoview mobile login are treated as two separate accounts.
          </p>
        </div>

        <div v-if="bridgeStatus?.linked" class="flex items-center gap-2 rounded-xl surface-inset px-4 py-3">
          <span class="chip-success text-2xs !py-0.5 !px-2">Linked</span>
          <span class="text-sm text-surface-slate dark:text-surface-ash">Your Amoview mobile app already sees your events from here.</span>
        </div>

        <form v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3" @submit.prevent="submitLinkAmoview">
          <Field label="Amoview phone number" class="sm:col-span-2">
            <template #default="{ id }">
              <TextInput v-model="linkAmoview.phone" :id="id" type="tel" placeholder="e.g. 0712345678" required />
            </template>
          </Field>
          <Field label="Amoview password" class="sm:col-span-2" :error="linkAmoviewError">
            <template #default="{ id, invalid }">
              <TextInput v-model="linkAmoview.password" :id="id" :invalid="invalid" type="password" autocomplete="current-password" required />
            </template>
          </Field>
          <div class="sm:col-span-2 flex items-center justify-end">
            <Button variant="primary" :loading="linkAmoviewLoading" type="submit">Link account</Button>
          </div>
        </form>
      </div>

      <div class="surface-card p-6">
        <h2 class="text-heading mb-1">Signed-in device</h2>
        <p class="text-subtext mb-4">This session belongs to the device you're using right now.</p>
        <div class="flex items-center justify-between gap-3 rounded-xl surface-inset px-4 py-3">
          <div class="min-w-0">
            <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ deviceLabel }}</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash">Current session</p>
          </div>
          <span class="chip-success text-2xs !py-0.5 !px-2">Active</span>
        </div>
      </div>
    </section>

    <!-- Appearance -->
    <section v-else-if="section === 'appearance'" class="max-w-2xl space-y-5">
      <div class="surface-card p-6 divide-y divide-surface-mist dark:divide-surface-fog">
        <div class="pb-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-heading">Theme</p>
            <p class="text-subtext">Choose light, dark, or match your device.</p>
          </div>
          <ThemeToggle />
        </div>
        <div class="pt-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-heading">Language</p>
            <p class="text-subtext">English / Kiswahili.</p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </section>

    <!-- Notifications -->
    <section v-else-if="section === 'notifications'" class="max-w-2xl space-y-5">
      <div class="surface-card p-6 space-y-4">
        <div>
          <h2 class="text-heading">What we send you</h2>
          <p class="text-subtext">These preferences apply to email and in-app alerts.</p>
        </div>
        <div class="divide-y divide-surface-mist dark:divide-surface-fog">
          <PrefRow
            v-for="pref in notifPrefs" :key="pref.key"
            :label="pref.label" :hint="pref.hint"
            :model-value="prefs[pref.key]"
            @update:model-value="(v) => savePref(pref.key, v)"
          />
        </div>
      </div>
    </section>

    <!-- Data & Privacy -->
    <section v-else class="max-w-2xl space-y-5">
      <div class="surface-card p-6 space-y-3">
        <div>
          <h2 class="text-heading flex items-center gap-1.5">
            <ArrowPathIcon class="w-4 h-4" /> App data
          </h2>
          <p class="text-subtext">
            Refresh the app to clear the offline cache, saved images, and service worker.
            Useful if the app feels stuck on an old version, or if you're handing the device to someone else.
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <Button variant="secondary" :loading="clearing" @click="clearAppData(false)">
            Refresh app (stay signed in)
          </Button>
          <Button variant="danger" :loading="clearing" @click="clearAppData(true)">
            Clear everything &amp; sign out
          </Button>
        </div>
      </div>

      <div class="surface-card p-6 border-state-danger/30 space-y-3">
        <div>
          <h2 class="text-heading text-state-danger">Sign out</h2>
          <p class="text-subtext">You'll need your password (or Google) to sign back in.</p>
        </div>
        <Button variant="danger" @click="logout">
          <ArrowLeftOnRectangleIcon class="w-4 h-4" /> Log out
        </Button>
      </div>
    </section>
  </PageShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { askConfirm } from '@/composables/useConfirm';
import { ArrowLeftOnRectangleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import http, { apiErrorMessage, unwrap } from '@/services/http';
import PageShell from '@/components/shell/PageShell.vue';
import { Tabs, Button, Field, TextInput } from '@/components/ui';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
import RoleBadge from '@/components/common/RoleBadge.vue';
import PrefRow from '@/components/settings/PrefRow.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const sectionTabs = [
  { value: 'profile',       label: 'Profile' },
  { value: 'security',      label: 'Security' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'appearance',    label: 'Appearance' },
  { value: 'data',          label: 'Data & privacy' },
];
const VALID = new Set(sectionTabs.map((t) => t.value));
const section = ref(VALID.has(route.query.section) ? String(route.query.section) : 'profile');
// Keep the URL in sync with the tab so users can share a link straight into
// a specific settings section, and back/forward flips between them.
watch(section, (v) => {
  if (route.query.section === v) return;
  router.replace({ query: { ...route.query, section: v } });
});
watch(() => route.query.section, (v) => {
  if (VALID.has(v) && v !== section.value) section.value = v;
});

// Profile ------------------------------------------------------------
const initials = computed(() => (auth.user?.name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase());
const phoneDisplay = computed(() => {
  const p = auth.user?.phone || '';
  return (p.startsWith('google:') || p.startsWith('taiview:')) ? 'No phone added yet' : p;
});
const phoneVerified = computed(() => !!auth.user?.phoneVerifiedAt);
function openPhoneGate() {
  localStorage.removeItem('gc.phonePromptSkippedAt');
  window.dispatchEvent(new StorageEvent('storage', { key: 'gc.phonePromptSkippedAt' }));
  window.dispatchEvent(new CustomEvent('app:reopen-phone-gate'));
}

const profile = reactive({ name: auth.user?.name || '', email: auth.user?.email || '' });
const profileLoading = ref(false);
async function submitProfile() {
  profileLoading.value = true;
  try {
    const res = await http.patch('/auth/me', { name: profile.name, email: profile.email || undefined });
    auth.user = { ...auth.user, ...res.data.data };
    localStorage.setItem('gc.user', JSON.stringify(auth.user));
    toast.success('Profile saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { profileLoading.value = false; }
}

// Security -----------------------------------------------------------
const pw = reactive({ oldPassword: '', newPassword: '' });
const pwLoading = ref(false);
const pwError = ref('');
async function submitPassword() {
  pwError.value = '';
  if (pw.newPassword.length < 6) { pwError.value = 'Min 6 characters'; return; }
  pwLoading.value = true;
  try {
    await http.post('/auth/change-password', { oldPassword: pw.oldPassword, newPassword: pw.newPassword });
    toast.success('Password updated');
    pw.oldPassword = ''; pw.newPassword = '';
  } catch (err) { pwError.value = apiErrorMessage(err); }
  finally { pwLoading.value = false; }
}

// Amoview account link — see bridge.routes.js's /taiview/link-by-password.
// Without this, an AmoEvents login created here (native email/password or
// Google) has no way to end up sharing an identity with the Amoview mobile
// app, which only ever authenticates via the phone-token bridge — so
// events created here silently never appear on mobile's "Hosting" tab.
const bridgeStatus = ref(null);
async function fetchBridgeStatus() {
  try {
    const res = await http.get('/bridge/status');
    bridgeStatus.value = unwrap(res);
  } catch (_) { /* non-fatal — form just stays visible */ }
}
fetchBridgeStatus();

const linkAmoview = reactive({ phone: '', password: '' });
const linkAmoviewLoading = ref(false);
const linkAmoviewError = ref('');
async function submitLinkAmoview() {
  linkAmoviewError.value = '';
  linkAmoviewLoading.value = true;
  try {
    await http.post('/bridge/taiview/link-by-password', { phone: linkAmoview.phone, password: linkAmoview.password });
    linkAmoview.phone = ''; linkAmoview.password = '';
    toast.success('Amoview account linked — your events now show on mobile too');
    fetchBridgeStatus();
  } catch (err) { linkAmoviewError.value = apiErrorMessage(err); }
  finally { linkAmoviewLoading.value = false; }
}

const deviceLabel = computed(() => {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad/i.test(ua))    return 'iOS device';
  if (/Android/i.test(ua))        return 'Android device';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua))        return 'Windows PC';
  if (/Linux/i.test(ua))          return 'Linux';
  return 'This device';
});

// Notifications ------------------------------------------------------
// Local-only prefs today — persisted to localStorage. Wire to a
// preferences endpoint later without changing this shape.
const notifPrefs = [
  { key: 'notif.eventReminders',   label: 'Event reminders',       hint: 'Nudges before an event you own or attend.' },
  { key: 'notif.paymentReceipts',  label: 'Payment receipts',      hint: 'Confirmations when a bundle or payout completes.' },
  { key: 'notif.deliveryReports',  label: 'Delivery reports',      hint: 'When a WhatsApp / SMS batch finishes.' },
  { key: 'notif.productUpdates',   label: 'Product updates',       hint: 'Occasional emails about new features.' },
];
const prefs = reactive(Object.fromEntries(notifPrefs.map((p) => [p.key, localStorage.getItem(p.key) !== '0'])));
function savePref(key, value) {
  prefs[key] = value;
  localStorage.setItem(key, value ? '1' : '0');
}

// Data & privacy -----------------------------------------------------
const clearing = ref(false);
async function clearAppData(signOut) {
  if (clearing.value) return;
  if (!(await askConfirm(signOut
    ? 'Sign out and clear all locally saved data? You will need to log in again.'
    : 'Refresh the app and clear all locally saved data?'))) return;
  clearing.value = true;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof window.caches !== 'undefined') {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
    if (typeof indexedDB?.databases === 'function') {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((db) => new Promise((res) => {
        if (!db.name) return res();
        const req = indexedDB.deleteDatabase(db.name);
        req.onblocked = req.onerror = req.onsuccess = () => res();
      })));
    }
    if (signOut) {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    } else {
      const keep = {};
      for (const k of ['access_token', 'refresh_token', 'auth', 'auth_token']) {
        const v = localStorage.getItem(k);
        if (v != null) keep[k] = v;
      }
      try { localStorage.clear(); } catch (_) {}
      for (const [k, v] of Object.entries(keep)) localStorage.setItem(k, v);
    }
  } catch (_) { /* best-effort */ }
  window.location.replace(signOut ? '/login' : window.location.pathname);
}

function logout() { auth.logout(); router.replace('/login'); }
</script>
