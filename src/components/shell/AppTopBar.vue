<template>
  <header class="sticky top-0 z-30 border-b border-surface-mist dark:border-surface-fog bg-surface-cream/85 dark:bg-surface-night/85 backdrop-blur-xl">
    <div class="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-14">
      <!-- Search-open button (also has ⌘K shortcut globally) -->
      <button type="button" class="flex-1 min-w-0 max-w-md flex items-center gap-2 rounded-xl border border-surface-mist dark:border-surface-fog bg-surface-ivory dark:bg-surface-coal px-3 py-1.5 text-sm text-surface-slate dark:text-surface-ash hover:border-brand-primary/40 transition-colors" @click="openPalette">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <span class="flex-1 text-left truncate">Search or jump to…</span>
        <span class="hidden sm:inline-flex items-center gap-1 shrink-0">
          <kbd class="kbd">{{ modKey }}</kbd><kbd class="kbd">K</kbd>
        </span>
      </button>

      <div class="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher />

        <!-- Pending invites indicator (owner/collaborator) — see PendingInvitesBanner.
             Keeps the banner but also surfaces a top-bar affordance. -->
        <router-link v-if="auth.isAuthed" to="/app/my-invitations"
                     class="btn-ghost !h-9 !w-9 !p-0 relative" title="My invitations" aria-label="My invitations">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </router-link>

        <!-- Profile menu -->
        <Menu align="end" :items="menuItems">
          <template #trigger>
            <button type="button" class="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1.5 hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60 transition-colors">
              <Avatar :name="auth.user?.name || '?'" size="sm" />
              <span class="hidden sm:inline text-sm font-semibold text-surface-charcoal dark:text-surface-bone max-w-[10rem] truncate">{{ auth.user?.name || 'Guest' }}</span>
              <svg class="hidden sm:inline w-3.5 h-3.5 text-surface-slate dark:text-surface-ash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </template>
        </Menu>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Menu from '@/components/ui/Menu.vue';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const router = useRouter();

const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

// Provided by AppShell — a ref to the command palette so we can trigger show().
const paletteRef = inject('paletteRef', null);
function openPalette() { paletteRef?.value?.show?.(); }

const menuItems = computed(() => [
  { label: 'Profile',   icon: UserIcon,        to: '/app/settings' },
  { label: 'Security',  icon: Cog6ToothIcon,   to: '/app/settings?section=security' },
  { divider: true },
  { label: 'Sign out',  icon: ArrowRightOnRectangleIcon, danger: true, onSelect: () => { auth.logout(); router.push('/login'); } },
]);
</script>
