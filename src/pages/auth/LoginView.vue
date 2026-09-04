<template>
  <AuthLayout
    eyebrow="Welcome back"
    title="Sign in to your workspace."
    description="Every event you've ever run, right where you left it."
  >
    <!-- Account-source tabs — AmoEvents (native) vs Amoview (bridged
         single-sign-on). Same visual weight so neither reads as "primary". -->
    <Tabs
      v-model="mode"
      variant="pill"
      :tabs="[
        { value: 'amoevents', label: 'AmoEvents account' },
        { value: 'amoview',   label: 'Amoview account' },
      ]"
      class="mb-6"
    />

    <!-- AmoEvents form -->
    <form v-if="mode === 'amoevents'" class="space-y-4" @submit.prevent="submit">
      <Field label="Email or phone" :error="errors.identifier">
        <template #default="{ id, invalid, ariaDescribedby }">
          <TextInput
            v-model="form.identifier" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
            placeholder="you@example.com or +255…" autocomplete="username" required
          />
        </template>
      </Field>

      <Field label="Password" :error="errors.password">
        <template #default="{ id, invalid, ariaDescribedby }">
          <TextInput
            v-model="form.password" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
            type="password" autocomplete="current-password" required
          />
        </template>
      </Field>

      <div class="flex justify-end -mt-1">
        <router-link to="/forgot" class="text-xs font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline">Forgot password?</router-link>
      </div>

      <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>

      <Button variant="primary" size="lg" block :loading="loading" type="submit">Sign in</Button>

      <!-- Google — full-flow lives in the backend at /api/auth/google. -->
      <Divider>or</Divider>
      <a href="/api/auth/google"
         class="w-full inline-flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-md font-bold bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog text-surface-charcoal dark:text-surface-bone hover:border-brand-primary/40 hover:shadow-elev-2 transition-all duration-fast">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="shrink-0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.32v2.76h3.54c2.07-1.91 3.29-4.72 3.29-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.76c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.55H2.18v2.85A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.05H2.18a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.65 2.86C6.7 7.31 9.13 5.38 12 5.38z"/></svg>
        Continue with Google
      </a>
    </form>

    <!-- Amoview form (bridged SSO) -->
    <form v-else class="space-y-4" @submit.prevent="submitAmoview">
      <div class="rounded-xl bg-brand-primary-glow border border-brand-primary/20 p-3 text-sm text-brand-primary-deep dark:text-brand-primary-soft">
        Same phone &amp; password you use in the Amoview app — one account for videos, streaming, and events.
      </div>

      <Field label="Amoview phone" :error="amoviewErrors.phone">
        <template #default="{ id, invalid, ariaDescribedby }">
          <TextInput
            v-model="amoviewForm.phone" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
            placeholder="+2557XXXXXXXX" autocomplete="username" required
          />
        </template>
      </Field>

      <Field label="Amoview password" :error="amoviewErrors.password">
        <template #default="{ id, invalid, ariaDescribedby }">
          <TextInput
            v-model="amoviewForm.password" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
            type="password" autocomplete="current-password" required
          />
        </template>
      </Field>

      <p v-if="amoviewServerError" class="text-sm text-state-danger font-medium">
        {{ amoviewServerError }}
        <a href="https://app.amoview.com" target="_blank" rel="noopener" class="underline">Create an Amoview account →</a>
      </p>

      <Button variant="primary" size="lg" block :loading="amoviewLoading" type="submit">Continue with Amoview</Button>
    </form>

    <template #footer>
      <p class="text-sm text-center text-surface-slate dark:text-surface-ash">
        New here?
        <router-link to="/register" class="font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline ml-1">Create a workspace →</router-link>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import { Button, Field, TextInput, Tabs, Divider } from '@/components/ui';

const mode = ref('amoevents');
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const form = reactive({ identifier: '', password: '' });
const errors = reactive({ identifier: '', password: '' });
const loading = ref(false);
const serverError = ref('');

async function submit() {
  errors.identifier = ''; errors.password = ''; serverError.value = '';
  if (!form.identifier) errors.identifier = 'Required';
  if (!form.password)   errors.password   = 'Required';
  if (errors.identifier || errors.password) return;
  loading.value = true;
  try {
    await auth.login(form.identifier.trim(), form.password);
    toast.success('Welcome back');
    router.replace(route.query.redirect || '/app');
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}

const amoviewForm = reactive({ phone: '', password: '' });
const amoviewErrors = reactive({ phone: '', password: '' });
const amoviewLoading = ref(false);
const amoviewServerError = ref('');

async function submitAmoview() {
  amoviewErrors.phone = ''; amoviewErrors.password = ''; amoviewServerError.value = '';
  if (!amoviewForm.phone)    amoviewErrors.phone    = 'Required';
  if (!amoviewForm.password) amoviewErrors.password = 'Required';
  if (amoviewErrors.phone || amoviewErrors.password) return;
  amoviewLoading.value = true;
  try {
    await auth.loginWithAmoview(amoviewForm.phone.trim(), amoviewForm.password);
    toast.success('Signed in with your Amoview account');
    router.replace(route.query.redirect || '/app');
  } catch (err) { amoviewServerError.value = apiErrorMessage(err); }
  finally { amoviewLoading.value = false; }
}
</script>
