<template>
  <header class="mobile-appbar md:hidden">
    <div class="mobile-appbar__inner">
      <button v-if="showBack" class="btn-ghost !p-2" @click="$router.back()" aria-label="Back">
        <ChevronLeftIcon class="w-4 h-4" />
      </button>
      <div v-else class="mobile-appbar__icon" />

      <router-link v-if="!title" to="/app" class="mobile-appbar__brand mobile-appbar__title text-center">
        G-<span>Cards</span>
      </router-link>
      <p v-else class="mobile-appbar__title text-center truncate px-2">{{ title }}</p>

      <div class="flex items-center justify-end">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
defineProps({ title: String, showBack: Boolean });
</script>
