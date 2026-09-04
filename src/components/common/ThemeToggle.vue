<template>
  <button
    class="btn-ghost !p-2 !rounded-full"
    :title="theme === 'dark' ? 'Switch to light' : 'Switch to dark'"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <SunIcon v-if="theme === 'dark'" class="w-4 h-4" />
    <MoonIcon v-else class="w-4 h-4" />
  </button>
</template>

<script setup>
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline';
import { useTheme } from '@/composables/useTheme';
const { theme, toggleTheme } = useTheme();
</script>
