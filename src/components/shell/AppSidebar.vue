<template>
  <!-- Phone drawer: same sections and routes as the desktop sidebar. -->
  <Teleport to="body">
    <div v-if="shell.mobileMenuOpen" class="md:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button class="absolute inset-0 bg-black/55" aria-label="Close navigation menu" @click="shell.closeMobileMenu()" />
      <aside class="relative flex h-full w-[min(21rem,88vw)] flex-col bg-surface-ivory dark:bg-surface-coal shadow-2xl">
        <div class="px-4 py-4 border-b border-surface-mist dark:border-surface-fog">
          <div class="flex items-center gap-2">
            <router-link to="/app" class="flex-1" @click="shell.closeMobileMenu()"><AppLogo :size="26" /></router-link>
            <button type="button" class="btn-ghost !h-9 !w-9 !p-0" aria-label="Close navigation menu" @click="shell.closeMobileMenu()">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          <div class="mt-4"><EventSwitcher /></div>
        </div>
        <nav class="flex-1 overflow-y-auto py-4 space-y-6">
          <div v-for="section in sections" :key="`mobile-${section.heading}`">
            <p v-if="section.heading" class="px-5 mb-1.5 text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">{{ section.heading }}</p>
            <div class="px-3 space-y-1">
              <router-link v-for="item in section.items" :key="`mobile-${item.to || item.label}`" :to="item.to"
                class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold"
                :class="isActive(item) ? 'bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft' : 'text-surface-slate dark:text-surface-ash hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60'"
                @click="shell.closeMobileMenu()">
                <component :is="item.icon" class="w-5 h-5 shrink-0" />
                <span class="min-w-0 truncate">{{ item.label }}</span>
                <span v-if="item.badge != null" class="ml-auto text-2xs font-bold px-1.5 py-0.5 rounded bg-surface-mist dark:bg-surface-fog">{{ item.badge }}</span>
              </router-link>
            </div>
          </div>
        </nav>
      </aside>
    </div>
  </Teleport>

  <aside :class="['hidden md:flex md:flex-col shrink-0 border-r border-surface-mist dark:border-surface-fog bg-surface-ivory dark:bg-surface-coal transition-[width] duration-base',
                  shell.sidebarCollapsed ? 'w-16' : 'w-64']">
    <!-- Brand + collapse toggle (always visible at the top). AppLogo
         renders its own two-tone "Amo Events" word when expanded, so we
         never render a second copy next to it. -->
    <div class="px-3 py-3 border-b border-surface-mist dark:border-surface-fog">
      <div class="flex items-center gap-1">
        <router-link to="/app" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 transition-colors flex-1 min-w-0">
          <AppLogo :size="24" :show-word="!shell.sidebarCollapsed" />
        </router-link>
        <button type="button"
                :aria-label="shell.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60 transition-colors"
                @click="shell.toggleSidebar()">
          <svg class="w-4 h-4 transition-transform duration-base" :class="shell.sidebarCollapsed ? '' : 'rotate-180'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
      <div v-if="!shell.sidebarCollapsed" class="mt-3">
        <EventSwitcher />
      </div>
    </div>

    <!-- Nav sections. `overflow-y-auto` used to also clip absolutely-positioned
         tooltips (they hid *inside* the sidebar). Tooltip now teleports to
         body, so overflow is safe. -->
    <nav class="flex-1 overflow-y-auto py-3 space-y-6">
      <div v-for="section in sections" :key="section.heading">
        <p v-if="!shell.sidebarCollapsed && section.heading" class="px-5 mb-1.5 text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">{{ section.heading }}</p>
        <div class="px-2 space-y-0.5">
          <Tooltip v-for="item in section.items" :key="item.to || item.label" :label="shell.sidebarCollapsed ? item.label : ''" side="right">
            <router-link
              :to="item.to"
              :class="[
                'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-fast',
                shell.sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                isActive(item)
                  ? 'bg-brand-primary-glow text-brand-primary-deep dark:text-brand-primary-soft font-bold'
                  : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60',
              ]"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              <span v-if="!shell.sidebarCollapsed" class="flex-1 min-w-0 truncate">{{ item.label }}</span>
              <span v-if="!shell.sidebarCollapsed && item.badge != null" class="shrink-0 text-2xs font-bold px-1.5 py-0.5 rounded bg-surface-mist dark:bg-surface-fog">{{ item.badge }}</span>
            </router-link>
          </Tooltip>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useShellStore } from '@/stores/shell';
import AppLogo from '@/components/common/AppLogo.vue';
import EventSwitcher from './EventSwitcher.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import {
  HomeIcon, CalendarDaysIcon, UsersIcon, ChatBubbleLeftRightIcon,
  PhotoIcon, UserGroupIcon, ChartBarIcon, CreditCardIcon, Cog6ToothIcon,
  BanknotesIcon, DocumentTextIcon, EnvelopeIcon,
  ShieldCheckIcon, BuildingOfficeIcon, ClipboardDocumentListIcon, TagIcon, XMarkIcon,
} from '@heroicons/vue/24/outline';

const route = useRoute();
const auth = useAuthStore();
const shell = useShellStore();

// Route navigation from a link, browser Back, or command palette must never
// leave an opaque mobile drawer covering the destination page.
watch(() => route.fullPath, () => shell.closeMobileMenu());

// Event-scoped nav shows when the current route is under /app/events/:id/*.
// Otherwise the tenant-level nav shows. Route matches drive the active state.
const eventId = computed(() => (route.path.startsWith('/app/events/') && route.params.id) ? route.params.id : null);

const sections = computed(() => {
  if (eventId.value) {
    const eid = eventId.value;
    return [
      { heading: 'Event', items: [
        { label: 'Overview',       to: `/app/events/${eid}`,               icon: HomeIcon, exact: true },
        { label: 'Guests',         to: `/app/events/${eid}/guests`,        icon: UsersIcon },
        { label: 'Pledges',        to: `/app/events/${eid}/pledges`,       icon: BanknotesIcon },
        { label: 'Messaging',      to: `/app/events/${eid}/messaging`,     icon: ChatBubbleLeftRightIcon },
        { label: 'Inbox',           to: `/app/events/${eid}/inbox`,         icon: ChatBubbleLeftRightIcon },
        { label: 'Reminders',      to: `/app/events/${eid}/reminders`,     icon: EnvelopeIcon },
        { label: 'Cards',          to: `/app/events/${eid}/cards`,         icon: DocumentTextIcon },
        { label: 'Tags',           to: `/app/events/${eid}/tags`,          icon: TagIcon },
        { label: 'Gallery',        to: `/app/events/${eid}/gallery`,       icon: PhotoIcon },
        { label: 'Team',           to: `/app/events/${eid}/collaborators`, icon: UserGroupIcon },
        { label: 'Analytics',      to: `/app/events/${eid}/analytics`,     icon: ChartBarIcon },
      ] },
      { heading: 'Money', items: [
        { label: 'Payment',        to: `/app/events/${eid}/payment`,       icon: CreditCardIcon },
      ] },
      { heading: '', items: [
        { label: 'Event settings', to: `/app/events/${eid}/edit`,          icon: Cog6ToothIcon },
        { label: 'Back to events', to: '/app/events',                       icon: CalendarDaysIcon },
      ] },
      ...(auth.isSuperAdmin ? [adminSection.value] : []),
    ];
  }
  return [
    { heading: 'Workspace', items: [
      { label: 'Home',           to: '/app',                icon: HomeIcon,          exact: true },
      { label: 'Events',         to: '/app/events',         icon: CalendarDaysIcon },
      { label: 'My people',      to: '/app/people',         icon: UserGroupIcon },
      { label: 'My invitations', to: '/app/my-invitations', icon: EnvelopeIcon },
      { label: 'Templates',      to: '/app/templates',      icon: DocumentTextIcon },
      { label: 'Wallet',         to: '/app/bundles',        icon: CreditCardIcon },
      { label: 'Reports',        to: '/app/reports',        icon: ChartBarIcon },
    ] },
    ...(auth.isSuperAdmin ? [adminSection.value] : []),
  ];
});

const adminSection = computed(() => ({
  heading: 'Admin',
  items: [
    { label: 'Pricing',         to: '/app/admin/pricing',           icon: BanknotesIcon },
    { label: 'Messaging rates', to: '/app/admin/messaging-pricing', icon: ChatBubbleLeftRightIcon },
    { label: 'Bundles',         to: '/app/admin/bundles',           icon: CreditCardIcon },
    { label: 'Templates',       to: '/app/admin/templates',         icon: DocumentTextIcon },
    { label: 'Template requests', to: '/app/admin/template-requests', icon: DocumentTextIcon },
    { label: 'Users',           to: '/app/admin/users',             icon: UsersIcon },
    { label: 'Tenants',         to: '/app/admin/tenants',           icon: BuildingOfficeIcon },
    { label: 'Payments queue',  to: '/app/admin/payments',          icon: CreditCardIcon },
    { label: 'Audit',           to: '/app/admin/audit',             icon: ShieldCheckIcon },
  ],
}));

function isActive(item) {
  if (item.exact) return route.path === item.to;
  return route.path === item.to || route.path.startsWith(item.to + '/');
}
</script>
