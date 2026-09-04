<template>
  <div class="max-w-md mx-auto px-4 sm:px-6 py-10">
    <PageHeader title="Link by short code" back="/app/my-invitations" />

    <div class="surface-card p-5 mt-4 space-y-3">
      <p class="text-subtext">
        If the phone you're logged in with is on the guest list, your invitations
        appear automatically. Otherwise paste the short code the organiser sent
        you (e.g. <span class="font-mono">HR8-P31</span>) and we'll attach it if
        the number matches.
      </p>
      <AppInput v-model="code" label="Short code" placeholder="HR8-P31" />
      <p v-if="msg" class="text-sm" :class="ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ msg }}</p>
      <AppButton block :loading="busy" :disabled="!code" @click="submit">Link</AppButton>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import { linkByCode } from '@/services/guestPortal.service';
import { apiErrorMessage } from '@/services/http';

const router = useRouter();
const code = ref('');
const busy = ref(false);
const msg = ref('');
const ok = ref(false);

async function submit() {
  busy.value = true; msg.value = ''; ok.value = false;
  try {
    const r = await linkByCode(code.value.trim());
    ok.value = true;
    msg.value = `Linked to ${r.event.name}`;
    setTimeout(() => router.replace(`/app/my-invitations/${r.event._id}`), 800);
  } catch (err) {
    msg.value = apiErrorMessage(err);
  } finally { busy.value = false; }
}
</script>
