<template>
  <div class="min-h-screen flex items-center justify-center text-sm text-gray-500">Signing you in…</div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  history.replaceState(null, '', window.location.pathname);
  const next = params.get('next') || '';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/app/events';
  const expected = sessionStorage.getItem('gc.sso.state');
  sessionStorage.removeItem('gc.sso.state');
  const code = params.get('code');
  if (code && expected && params.get('state') === expected) {
    try {
      await auth.loginWithAmoviewSession(code);
      return router.replace(safeNext);
    } catch (_) { /* normal login below */ }
  }
  router.replace({ path: '/login', query: { redirect: safeNext } });
});
</script>
