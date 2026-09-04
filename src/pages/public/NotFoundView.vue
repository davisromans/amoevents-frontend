<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night flex flex-col">
    <PublicNav />
    <main class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="section-eyebrow mb-2">404</p>
      <h1 class="text-4xl font-black text-surface-charcoal dark:text-surface-bone mb-2">Page not found</h1>
      <p class="text-md text-surface-slate dark:text-surface-ash mb-6">The page you're looking for doesn't exist.</p>
      <router-link to="/"><button class="btn-primary">Return home</button></router-link>
    </main>
    <PublicFooter />
  </div>
</template>

<script setup>
import PublicNav from '@/components/layout/PublicNav.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';
</script>
