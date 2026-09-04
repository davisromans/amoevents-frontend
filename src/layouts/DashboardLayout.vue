<template>
  <!-- Batch 2: the dashboard layout is now a thin wrapper around the
       shell. Everything shell-related (sidebar, topbar, command palette,
       pending-invites banner, mobile nav) lives in AppShell so the same
       shell can be reused wherever we need it (e.g. a future scanner
       admin view). -->
  <AppShell>
    <!-- Soft cross-fade between routes. `key` on the child forces the
         transition to fire on every path change, not just when the
         component itself changes. Reduced-motion viewers get instant
         swaps via the global @media rule. -->
    <router-view v-slot="{ Component, route }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
  </AppShell>
</template>

<script setup>
import AppShell from '@/components/shell/AppShell.vue';
</script>
