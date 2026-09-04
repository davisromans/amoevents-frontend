<template>
  <div class="relative" @focusout="onBlur">
    <button
      class="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog hover:border-brand-gold transition"
      @click="open = !open"
    >
      <span class="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-surface-charcoal text-2xs font-black">
        {{ initials }}
      </span>
      <span class="hidden sm:inline text-sm font-bold text-surface-charcoal dark:text-surface-bone truncate max-w-[120px]">{{ auth.user?.name }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 text-surface-slate dark:text-surface-ash" />
    </button>

    <Transition
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0"
    >
      <div v-if="open"
           class="absolute right-0 mt-2 w-56 z-50 surface-card p-1 shadow-card"
           role="menu">
        <div class="px-3 py-2 border-b border-surface-mist dark:border-surface-fog">
          <p class="text-sm font-extrabold text-surface-charcoal dark:text-surface-bone truncate">{{ auth.user?.name }}</p>
          <p class="text-xs text-surface-slate dark:text-surface-ash truncate">{{ auth.user?.phone }}</p>
          <RoleBadge :role="auth.role" class="mt-1" />
        </div>
        <router-link to="/app/settings" class="menu-item" @click="open = false">
          <UserCircleIcon class="w-4 h-4" /> Profile
        </router-link>
        <router-link to="/app/settings?section=security" class="menu-item" @click="open = false">
          <Cog6ToothIcon class="w-4 h-4" /> Security
        </router-link>
        <button v-if="canInstall" class="menu-item w-full" @click="doInstall">
          <ArrowDownTrayIcon class="w-4 h-4" /> Install app
        </button>
        <div class="border-t border-surface-mist dark:border-surface-fog my-1" />
        <div class="flex items-center justify-between px-3 py-1.5">
          <span class="text-sm font-bold text-surface-charcoal dark:text-surface-bone">Theme</span>
          <ThemeToggle />
        </div>
        <div class="flex items-center justify-between px-3 py-1.5">
          <span class="text-sm font-bold text-surface-charcoal dark:text-surface-bone">Language</span>
          <LanguageSwitcher />
        </div>
        <div class="border-t border-surface-mist dark:border-surface-fog my-1" />
        <button class="menu-item w-full text-red-600 dark:text-red-400" @click="logout">
          <ArrowLeftOnRectangleIcon class="w-4 h-4" /> Log out
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';
import { ChevronDownIcon, UserCircleIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import ThemeToggle from './ThemeToggle.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';
import RoleBadge from './RoleBadge.vue';

const { canPromptNative, isIOS, isStandalone, install } = useInstallPrompt();
const canInstall = computed(() => !isStandalone.value && (canPromptNative.value || isIOS.value));
async function doInstall() { open.value = false; await install(); }

const auth = useAuthStore();
const router = useRouter();
const open = ref(false);
const initials = computed(() =>
  (auth.user?.name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
);
function logout() {
  auth.logout();
  open.value = false;
  router.replace('/login');
}
function onBlur(e) { if (!e.currentTarget.contains(e.relatedTarget)) setTimeout(() => (open.value = false), 120); }
</script>

<style scoped>
.menu-item {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-semibold text-surface-charcoal dark:text-surface-bone rounded-lg
         hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 transition text-left;
}
</style>
