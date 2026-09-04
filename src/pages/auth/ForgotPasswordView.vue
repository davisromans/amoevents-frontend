<template>
  <AuthLayout
    :eyebrow="stage === 'request' ? 'Password reset' : 'Almost there'"
    :title="stage === 'request' ? 'Reset your password.' : 'Enter the code we sent you.'"
    :description="stage === 'request'
      ? 'Enter the phone on your account. We\'ll SMS a 6-digit code.'
      : `Code sent to ${form.phone}. Didn\'t get it?`"
  >
    <template #headerAction>
      <span class="text-sm text-surface-slate dark:text-surface-ash">
        <router-link to="/login" class="font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline">← Back to sign in</router-link>
      </span>
    </template>

    <form v-if="stage === 'request'" class="space-y-4" @submit.prevent="requestOtp">
      <Field label="Phone" :error="errors.phone" required>
        <template #default="{ id }">
          <PhoneInput v-model="form.phone" :id="id" />
        </template>
      </Field>
      <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>
      <Button variant="primary" size="lg" block :loading="loading" type="submit">Send 6-digit code</Button>
    </form>

    <form v-else class="space-y-5" @submit.prevent="submitReset">
      <div>
        <label class="field-label mb-2">Verification code</label>
        <OtpInput v-model="form.code" @complete="onComplete" />
        <p v-if="errors.code" class="field-error mt-2">{{ errors.code }}</p>
      </div>

      <Field label="New password" help="At least 8 characters." :error="errors.newPassword" required>
        <template #default="{ id, invalid, ariaDescribedby }">
          <TextInput v-model="form.newPassword" :id="id" :invalid="invalid" :aria-describedby="ariaDescribedby"
                     type="password" autocomplete="new-password" required />
        </template>
      </Field>

      <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>

      <div class="flex items-center gap-2">
        <Button variant="secondary" size="lg" type="button" @click="stage = 'request'">Use different phone</Button>
        <Button variant="primary" size="lg" :loading="loading" type="submit" class="ml-auto">Update password</Button>
      </div>

      <p class="text-sm text-center text-surface-slate dark:text-surface-ash">
        <button type="button" class="font-bold text-brand-primary-deep dark:text-brand-primary-soft hover:underline disabled:opacity-50 disabled:no-underline"
                :disabled="resendCooldown > 0 || loading"
                @click="requestOtp">
          {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code' }}
        </button>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import http, { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import { Button, Field, TextInput, OtpInput } from '@/components/ui';
import PhoneInput from '@/components/common/PhoneInput.vue';

const router = useRouter();
const toast = useToast();

const stage = ref('request'); // request | verify
const loading = ref(false);
const serverError = ref('');
const form = reactive({ phone: '', code: '', newPassword: '' });
const errors = reactive({ phone: '', code: '', newPassword: '' });

// Cooldown so people don't spam "Resend code" — 30s, ticks down every second.
const resendCooldown = ref(0);
let cooldownTimer = null;
function startCooldown() {
  resendCooldown.value = 30;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1;
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(cooldownTimer));

async function requestOtp() {
  Object.keys(errors).forEach((k) => (errors[k] = ''));
  serverError.value = '';
  if (!/^\+?\d{9,15}$/.test(form.phone)) { errors.phone = 'Valid phone required'; return; }
  loading.value = true;
  try {
    await http.post('/auth/forgot', { phone: form.phone });
    toast.success('Code sent by SMS');
    stage.value = 'verify';
    startCooldown();
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}

function onComplete() {
  // If the password is already filled in, auto-submit on OTP completion.
  if (form.newPassword.length >= 8) submitReset();
}

async function submitReset() {
  Object.keys(errors).forEach((k) => (errors[k] = ''));
  serverError.value = '';
  if (!/^\d{6}$/.test(form.code)) { errors.code = '6 digits'; return; }
  if (form.newPassword.length < 8) { errors.newPassword = 'At least 8 characters'; return; }
  loading.value = true;
  try {
    await http.post('/auth/reset', { phone: form.phone, code: form.code, newPassword: form.newPassword });
    toast.success('Password updated — please sign in');
    router.replace('/login');
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { loading.value = false; }
}
</script>
