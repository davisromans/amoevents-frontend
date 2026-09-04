<template>
  <AppModal v-model="open" title="Add your phone number" :maxWidth="440">
    <div class="space-y-3">
      <p class="text-sm text-surface-slate dark:text-surface-ash">
        We match guest lists by phone number — add yours and every event you've
        been invited to will appear here automatically. Verified via SMS.
      </p>

      <!-- Step 1: enter phone, request OTP -->
      <div v-if="step === 'enter'" class="space-y-3">
        <PhoneInput v-model="phone" label="Phone" />
        <p v-if="err" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ err }}</p>
        <AppButton block :loading="busy" :disabled="!phone" @click="requestOtp">
          Send code
        </AppButton>
        <button class="w-full text-2xs text-surface-slate dark:text-surface-ash hover:underline"
                @click="dismiss">Skip for now — I'll add it later</button>
      </div>

      <!-- Step 2: enter 6-digit code -->
      <div v-else-if="step === 'verify'" class="space-y-3">
        <p class="text-sm text-surface-charcoal dark:text-surface-bone">
          Code sent to <strong class="font-mono">{{ phone }}</strong>. It expires in 10 min.
        </p>
        <input v-model="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
               placeholder="123456"
               class="field-input text-center text-2xl font-black tracking-widest" />
        <p v-if="err" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ err }}</p>
        <AppButton block :loading="busy" :disabled="code.length !== 6" @click="verifyOtp">
          Verify
        </AppButton>
        <div class="flex items-center justify-between text-xs">
          <button class="text-brand-gold-deep dark:text-brand-gold-soft font-bold hover:underline"
                  @click="step = 'enter'; err = ''">← Change number</button>
          <button class="text-surface-slate dark:text-surface-ash hover:underline"
                  :disabled="cooldown > 0" @click="requestOtp">
            {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code' }}
          </button>
        </div>
      </div>

      <!-- Step 3: SMS provider not configured — operator hint -->
      <div v-else-if="step === 'no-sms'" class="space-y-2">
        <p class="text-sm text-surface-charcoal dark:text-surface-bone">
          SMS provider isn't configured on this server yet, so we can't send
          verification codes. Your phone is saved unverified — you can retry
          verification later from Account.
        </p>
        <p v-if="hint" class="text-2xs text-surface-slate dark:text-surface-ash italic">{{ hint }}</p>
        <AppButton block @click="dismiss">Close</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import PhoneInput from '@/components/common/PhoneInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import http, { apiErrorMessage } from '@/services/http';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const step = ref('enter'); // enter | verify | no-sms
const phone = ref('');
const code = ref('');
const busy = ref(false);
const err = ref('');
const hint = ref('');
const cooldown = ref(0);
let cooldownTimer = null;

const SKIP_KEY = 'gc.phonePromptSkippedAt';
const isPlaceholderPhone = (p) => !p || p.startsWith('google:') || p.startsWith('taiview:');

// Only auto-open for users whose stored phone is a placeholder AND who haven't
// dismissed the prompt in the last 6 hours. Explicit "Skip for now" writes
// the dismissal timestamp so we don't annoy them on every navigation.
const open = ref(false);
function evalShouldOpen() {
  if (!auth.user) return open.value = false;
  if (!isPlaceholderPhone(auth.user.phone)) return open.value = false;
  const skipped = Number(localStorage.getItem(SKIP_KEY) || 0);
  if (skipped && (Date.now() - skipped) < 6 * 3600 * 1000) return open.value = false;
  open.value = true;
}
watch(() => auth.user?.phone, evalShouldOpen, { immediate: true });
onMounted(() => {
  evalShouldOpen();
  window.addEventListener('app:reopen-phone-gate', evalShouldOpen);
});
onBeforeUnmount(() => window.removeEventListener('app:reopen-phone-gate', evalShouldOpen));

function dismiss() {
  localStorage.setItem(SKIP_KEY, String(Date.now()));
  open.value = false;
}

function startCooldown(s) {
  cooldown.value = s;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1);
    if (cooldown.value === 0) clearInterval(cooldownTimer);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(cooldownTimer));

async function requestOtp() {
  err.value = ''; busy.value = true;
  try {
    const { data } = await http.post('/auth/me/phone/request-otp', { phone: phone.value });
    const d = data?.data || data;
    if (d.sent === false) {
      hint.value = d.hint || '';
      step.value = 'no-sms';
      return;
    }
    step.value = 'verify';
    startCooldown(60);
  } catch (e) { err.value = apiErrorMessage(e); }
  finally { busy.value = false; }
}

async function verifyOtp() {
  err.value = ''; busy.value = true;
  try {
    const { data } = await http.post('/auth/me/phone/verify', { phone: phone.value, code: code.value });
    const d = data?.data || data;
    if (d?.user) {
      auth.user = { ...auth.user, ...d.user };
      localStorage.setItem('gc.user', JSON.stringify(auth.user));
    }
    localStorage.removeItem(SKIP_KEY);
    open.value = false;
  } catch (e) { err.value = apiErrorMessage(e); }
  finally { busy.value = false; }
}
</script>
