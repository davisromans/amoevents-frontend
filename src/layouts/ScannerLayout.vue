<template>
  <div class="min-h-screen bg-surface-charcoal dark:bg-surface-night text-white flex flex-col">
    <!-- Slim, high-contrast top bar. Deliberately compact — the scanner
         page below wants every pixel for the camera viewport. -->
    <header class="border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div class="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
        <router-link to="/app" class="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors">
          <ChevronLeftIcon class="w-4 h-4" />
          Dashboard
        </router-link>
        <div class="inline-flex items-center gap-2">
          <img src="/logo.png" alt="" class="w-5 h-5 rounded" />
          <span class="text-sm font-black tracking-tight">Gate scanner</span>
        </div>
        <div class="w-16" />
      </div>
    </header>
    <main class="flex-1 min-h-0"><router-view /></main>
  </div>
</template>

<script setup>
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
</script>
