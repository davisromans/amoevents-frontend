<template>
  <RouteProgressBar />
  <router-view />
  <ToastStack />
  <ConfirmDialog />
  <CompleteProfileGate />
  <InstallPromptBanner />
  <UpdateBanner />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { setUnauthorizedHandler } from '@/services/http';
import { useTheme } from '@/composables/useTheme';
import ToastStack from '@/components/common/ToastStack.vue';
import InstallPromptBanner from '@/components/common/InstallPromptBanner.vue';
import UpdateBanner from '@/components/common/UpdateBanner.vue';
import RouteProgressBar from '@/components/common/RouteProgressBar.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import CompleteProfileGate from '@/components/common/CompleteProfileGate.vue';
import { currentBrand } from '@/composables/useBrand';
// Retitle the tab from the resolved brand (single-brand today; the map is
// kept so future white-labels can drop in without touching this code).
if (typeof document !== 'undefined') {
  const b = currentBrand();
  document.title = `${b.name} — ${b.tagline}`;
}

useTheme();
const auth = useAuthStore();

setUnauthorizedHandler(() => {
  auth.logout();
  if (!location.pathname.startsWith('/login')) location.assign('/login');
});

// Auth bootstrapping (OAuth-hash extraction + initial fetchMe) now runs
// synchronously in main.js before the router mounts, so the first guard
// evaluation sees the correct signed-in state.

// Force a fresh /auth/me call every 5 minutes so profile edits + role changes
// propagate without waiting for a full re-login.
onMounted(() => {
  setInterval(() => {
    if (localStorage.getItem('gc.accessToken')) auth.fetchMe();
  }, 5 * 60 * 1000);
});
</script>
