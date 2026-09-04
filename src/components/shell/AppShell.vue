<template>
  <div class="min-h-screen flex bg-surface-cream dark:bg-surface-night text-surface-charcoal dark:text-surface-bone">
    <AppSidebar />
    <div class="flex-1 min-w-0 flex flex-col">
      <AppTopBar />
      <PendingInvitesBanner />
      <main class="flex-1 min-w-0 pb-20 md:pb-6">
        <slot />
      </main>
    </div>
    <MobileBottomNav />
    <CommandPalette ref="paletteRef" :items="paletteItems" />
  </div>
</template>

<script setup>
import { computed, onMounted, provide, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useShellStore } from '@/stores/shell';
import AppSidebar from './AppSidebar.vue';
import AppTopBar from './AppTopBar.vue';
import PendingInvitesBanner from '@/components/layout/PendingInvitesBanner.vue';
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue';
import CommandPalette from '@/components/ui/CommandPalette.vue';
import {
  HomeIcon, CalendarDaysIcon, UsersIcon, ChatBubbleLeftRightIcon,
  PhotoIcon, CreditCardIcon, Cog6ToothIcon, DocumentTextIcon,
  BanknotesIcon, ShieldCheckIcon, PlusIcon,
} from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const shell = useShellStore();
const paletteRef = ref(null);
// Provide it so any child can trigger the palette (e.g. TopBar's search
// button, a future "jump to event" affordance).
provide('paletteRef', paletteRef);

onMounted(() => shell.ensureEvents());

// Palette items — navigation targets + every event by name. Grouped so
// the palette can render section headings above each cluster.
const paletteItems = computed(() => {
  const nav = [
    { _id: 'nav-home',     label: 'Home',           icon: HomeIcon,          to: '/app',                group: 'Jump to' },
    { _id: 'nav-events',   label: 'All events',     icon: CalendarDaysIcon,  to: '/app/events',         group: 'Jump to' },
    { _id: 'nav-templates',label: 'Templates',      icon: DocumentTextIcon,  to: '/app/templates',      group: 'Jump to' },
    { _id: 'nav-bundles',  label: 'Wallet',         icon: CreditCardIcon,    to: '/app/bundles',        group: 'Jump to' },
    { _id: 'nav-account',  label: 'Settings',        icon: Cog6ToothIcon,     to: '/app/settings',        group: 'Jump to' },
    { _id: 'act-new-event',label: 'Create event',   icon: PlusIcon,          to: '/app/events/new',     group: 'Actions', shortcut: 'C' },
  ];
  const admin = auth.isSuperAdmin ? [
    { _id: 'adm-pricing',  label: 'Admin — Pricing', icon: BanknotesIcon,   to: '/app/admin/pricing',   group: 'Admin' },
    { _id: 'adm-users',    label: 'Admin — Users',   icon: UsersIcon,       to: '/app/admin/users',     group: 'Admin' },
    { _id: 'adm-tenants',  label: 'Admin — Tenants', icon: ShieldCheckIcon, to: '/app/admin/tenants',   group: 'Admin' },
    { _id: 'adm-audit',    label: 'Admin — Audit',   icon: ShieldCheckIcon, to: '/app/admin/audit',     group: 'Admin' },
  ] : [];
  const events = shell.events.map((e) => ({
    _id: `event-${e._id}`,
    label: e.name,
    description: e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    icon: PhotoIcon,
    to: `/app/events/${e._id}`,
    group: 'Events',
  }));
  return [...nav, ...admin, ...events];
});
</script>
