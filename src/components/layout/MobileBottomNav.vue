<template>
  <nav class="mobile-bottom-nav md:hidden" aria-label="Primary">
    <div class="mobile-bottom-nav__bar">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        v-slot="{ isExactActive, isActive, navigate }"
        custom
      >
        <button
          class="mobile-bottom-nav__item"
          :class="isThisActive(item) && 'mobile-bottom-nav__item--active'"
          @click="navigate"
        >
          <span class="mobile-bottom-nav__pill">
            <component :is="item.icon" class="w-5 h-5" :class="isThisActive(item) ? 'text-surface-charcoal' : ''" />
          </span>
          <span class="mobile-bottom-nav__label">{{ item.label }}</span>
        </button>
      </router-link>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { CalendarDaysIcon, QrCodeIcon, HomeIcon, ChartBarSquareIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';

const { t } = useI18n();
const route = useRoute();

const items = computed(() => [
  { to: '/app', label: t('nav.home'), icon: HomeIcon, exact: true },
  { to: '/app/events', label: t('nav.events'), icon: CalendarDaysIcon },
  { to: '/scanner', label: t('nav.scanner'), icon: QrCodeIcon },
  { to: '/app/reports', label: t('nav.reports'), icon: ChartBarSquareIcon },
  { to: '/app/settings', label: 'Settings', icon: Cog6ToothIcon },
]);

// Exact-match for '/app' (Home) — otherwise it lights up on every /app/* route.
// Prefix-match for the rest, so /app/events/123 still highlights Events.
function isThisActive(item) {
  const p = route.path;
  if (item.exact) return p === item.to || p === `${item.to}/`;
  return p === item.to || p.startsWith(`${item.to}/`);
}
</script>
