<template>
  <header class="sticky top-0 z-30 bg-surface-cream/85 dark:bg-surface-night/85 backdrop-blur-xl border-b border-surface-mist dark:border-surface-fog">
    <div class="flex items-center gap-3 h-14 px-4 sm:px-6">
      <router-link to="/app" class="shrink-0"><AppLogo :size="30" /></router-link>
      <div class="flex-1" />
      <UserMenu />
    </div>
  </header>
</template>

<script setup>
import AppLogo from '@/components/common/AppLogo.vue';
import UserMenu from '@/components/common/UserMenu.vue';
</script>
