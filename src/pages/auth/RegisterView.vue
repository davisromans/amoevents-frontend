<template>
  <AuthLayout
    :eyebrow="`Step ${step} of ${STEPS.length}`"
    :title="STEPS[step - 1].title"
    :description="STEPS[step - 1].description"
  >
    <template #headerAction>
      <span class="text-sm text-surface-slate dark:text-surface-ash">
        Have an account?
        <router-link to="/login" class="font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline ml-1">Sign in</router-link>
      </span>
    </template>

    <!-- Progress rail — 2 dashes, active one filled. Visual "where am I" cue. -->
    <div class="flex items-center gap-2 mb-8">
      <div v-for="(_, i) in STEPS" :key="i"
           :class="['h-1.5 flex-1 rounded-full transition-all duration-slow',
                    i < step ? 'bg-gradient-primary' : 'bg-surface-mist dark:bg-surface-fog']" />
    </div>

    <!-- Existing-user callout — one line, top of form -->
    <div v-if="step === 1" class="mb-5 rounded-xl bg-brand-primary-glow border border-brand-primary/20 px-3.5 py-2.5 text-xs text-brand-primary-deep dark:text-brand-primary-soft flex items-start gap-2">
      <svg class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4M12 16h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
      <span>Have an Amoview account already? Don't create a second one — <router-link to="/login" class="underline font-bold">sign in with it</router-link>.</span>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <!-- Step 1 — identity + workspace name -->
      <template v-if="step === 1">
        <Field label="Your name" :error="errors.name" required>
          <template #default="{ id, invalid, ariaDescribedby }">
            <TextInput v-model="form.name" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                       placeholder="Grace Mushi" autocomplete="name" required />
          </template>
        </Field>
        <Field label="Workspace name" help="Usually a family name, a company, or your event's brand." :error="errors.tenantName" required>
          <template #default="{ id, invalid, ariaDescribedby }">
            <TextInput v-model="form.tenantName" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                       placeholder="Mushi Weddings" required />
          </template>
        </Field>
      </template>

      <!-- Step 2 — contact + password -->
      <template v-if="step === 2">
        <Field label="Phone" help="Used for guest recognition and password reset." :error="errors.phone" required>
          <template #default="{ id }">
            <PhoneInput v-model="form.phone" :id="id" />
          </template>
        </Field>
        <Field label="Email" optional :error="errors.email">
          <template #default="{ id, invalid, ariaDescribedby }">
            <TextInput v-model="form.email" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                       type="email" placeholder="you@example.com" autocomplete="email" />
          </template>
        </Field>
        <Field label="Password" help="At least 8 characters." :error="errors.password" required>
          <template #default="{ id, invalid, ariaDescribedby }">
            <TextInput v-model="form.password" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                       type="password" autocomplete="new-password" required />
          </template>
        </Field>
        <Field label="Referral code" optional :error="errors.referralCode">
          <template #default="{ id }">
            <TextInput v-model="form.referralCode" :id="id" placeholder="ABC12345" />
          </template>
        </Field>
      </template>

      <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>

      <div class="flex items-center gap-2 pt-2">
        <Button v-if="step > 1" variant="secondary" size="lg" @click="step -= 1" type="button">
          <template #leading>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          </template>
          Back
        </Button>
        <Button variant="primary" size="lg" :loading="loading" type="submit" :block="step === 1">
          {{ step < STEPS.length ? 'Continue' : 'Create workspace' }}
          <template v-if="step < STEPS.length" #trailing>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </template>
        </Button>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/services/http';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import { Button, Field, TextInput } from '@/components/ui';
import PhoneInput from '@/components/common/PhoneInput.vue';

const STEPS = [
  { title: 'Set up your workspace.', description: "Two quick steps. First, who's setting this up." },
  { title: 'How we reach you.',      description: 'Phone is required for guest recognition. Email is optional but recommended.' },
];

const step = ref(1);
const auth = useAuthStore();
const router = useRouter();

const form = reactive({ name: '', tenantName: '', phone: '', email: '', password: '', referralCode: '' });
const errors = reactive({ name: '', tenantName: '', phone: '', email: '', password: '', referralCode: '' });
const loading = ref(false);
const serverError = ref('');

function validateStep(n) {
  Object.keys(errors).forEach((k) => (errors[k] = ''));
  serverError.value = '';
  let ok = true;
  if (n === 1) {
    if (!form.name.trim())       { errors.name = 'Required'; ok = false; }
    if (!form.tenantName.trim()) { errors.tenantName = 'Required'; ok = false; }
  }
  if (n === 2) {
    if (!/^\+?\d{9,15}$/.test(form.phone)) { errors.phone = 'Valid phone required'; ok = false; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'Invalid email'; ok = false; }
    if (!form.password || form.password.length < 8) { errors.password = 'At least 8 characters'; ok = false; }
  }
  return ok;
}

async function onSubmit() {
  if (!validateStep(step.value)) return;
  if (step.value < STEPS.length) { step.value += 1; return; }
  loading.value = true;
  try {
    await auth.register({
      name: form.name.trim(),
      tenantName: form.tenantName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      password: form.password,
      referralCode: form.referralCode.trim() || undefined,
    });
    router.replace('/app');
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}
</script>
