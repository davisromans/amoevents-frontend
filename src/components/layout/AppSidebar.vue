<template>
  <aside class="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-surface-mist dark:border-surface-fog bg-surface-ivory/60 dark:bg-surface-coal/60 backdrop-blur-xl">
    <nav class="flex-1 px-2 py-3 overflow-y-auto">
      <template v-for="(section, i) in sections" :key="i">
        <div v-if="i > 0" class="my-3 mx-3 h-px bg-surface-mist dark:bg-surface-fog" />
        <p class="text-2xs uppercase font-black tracking-[0.14em] text-surface-slate/70 dark:text-surface-ash/70 px-3 mb-1.5">
          {{ section.label }}
        </p>
        <div class="space-y-0.5">
          <router-link v-for="l in section.items" :key="l.to" :to="l.to" v-slot="{ navigate }" custom>
            <button
              class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150"
              :class="isActiveLink(l)
                ? 'bg-brand-gold text-surface-charcoal font-bold'
                : 'text-surface-slate dark:text-surface-ash hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50 hover:text-surface-charcoal dark:hover:text-surface-bone'"
              @click="navigate"
            >
              <component :is="l.icon" class="w-[18px] h-[18px] shrink-0" />
              <span class="truncate flex-1">{{ l.label }}</span>
              <span v-if="l.badge" class="chip-gold !text-2xs !py-0 !px-1.5">{{ l.badge }}</span>
            </button>
          </router-link>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
// Root paths (`/app`, `/scanner`) match only exactly — otherwise Overview
// would light up on every dashboard subroute. Child paths match by prefix.
const EXACT = new Set(['/app', '/scanner']);
function isActiveLink(l) {
  if (EXACT.has(l.to)) return route.path === l.to;
  return route.path === l.to || route.path.startsWith(l.to + '/');
}
import {
  Squares2X2Icon, CalendarDaysIcon, QrCodeIcon, ChartBarSquareIcon,
  UserCircleIcon, BuildingOfficeIcon, BanknotesIcon, PhotoIcon,
  UsersIcon, ShieldCheckIcon, TicketIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const sections = computed(() => {
  const workspace = [
    { to: '/app', label: 'Overview', icon: Squares2X2Icon },
    { to: '/app/events', label: 'Events', icon: CalendarDaysIcon },
    // Invited-side view — visible to everyone; empty state guides the user
    // to the short-code search if their phone didn't match anything.
    { to: '/app/my-invitations', label: 'My invitations', icon: TicketIcon },
    { to: '/scanner', label: 'Scanner', icon: QrCodeIcon },
    { to: '/app/templates', label: 'Templates', icon: ChatBubbleLeftRightIcon },
    // Unified store — bundles OR any-amount top-up.
    { to: '/app/bundles', label: 'Store', icon: BanknotesIcon },
    { to: '/app/reports', label: 'Reports', icon: ChartBarSquareIcon },
  ];
  const account = [
    { to: '/app/settings', label: 'Profile', icon: UserCircleIcon },
  ];
  const admin = auth.isSuperAdmin ? [
    { to: '/app/admin/tenants', label: 'Tenants', icon: BuildingOfficeIcon },
    { to: '/app/admin/users', label: 'Users', icon: UsersIcon },
    { to: '/app/admin/payments', label: 'Payments', icon: BanknotesIcon },
    { to: '/app/admin/templates', label: 'Card templates', icon: PhotoIcon },
    { to: '/app/admin/pricing', label: 'Pricing', icon: BanknotesIcon },
    { to: '/app/admin/messaging-pricing', label: 'Message rates', icon: ChatBubbleLeftRightIcon },
    { to: '/app/admin/bundles', label: 'Bundles', icon: BanknotesIcon },
    { to: '/app/admin/audit', label: 'Audit log', icon: ShieldCheckIcon },
  ] : [];

  const out = [{ label: 'Workspace', items: workspace }, { label: 'Settings', items: account }];
  if (admin.length) out.push({ label: 'Super admin', items: admin });
  return out;
});
</script>
