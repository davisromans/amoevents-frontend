<template>
  <nav
    class="sticky top-0 z-40 transition-all duration-200"
    :class="scrolled
      ? 'border-b border-surface-mist/70 dark:border-surface-fog/70 bg-surface-cream/90 dark:bg-surface-night/90 backdrop-blur-xl shadow-sm'
      : 'border-b border-transparent bg-surface-cream/70 dark:bg-surface-night/70 backdrop-blur-md'"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
      <router-link to="/" class="shrink-0 flex items-center gap-2">
        <AppLogo :size="28" />
      </router-link>

      <div class="hidden md:flex items-center gap-1">
        <router-link to="/" custom v-slot="{ isActive, navigate }">
          <button :class="navClass(isActive)" @click="navigate">{{ t('nav.home') }}</button>
        </router-link>
        <router-link to="/features" custom v-slot="{ isActive, navigate }">
          <button :class="navClass(isActive)" @click="navigate">Features</button>
        </router-link>
        <router-link to="/use-cases" custom v-slot="{ isActive, navigate }">
          <button :class="navClass(isActive)" @click="navigate">Use cases</button>
        </router-link>
        <router-link to="/pricing" custom v-slot="{ isActive, navigate }">
          <button :class="navClass(isActive)" @click="navigate">{{ t('nav.pricing') }}</button>
        </router-link>
        <router-link to="/about" custom v-slot="{ isActive, navigate }">
          <button :class="navClass(isActive)" @click="navigate">About</button>
        </router-link>
      </div>

      <div class="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <router-link to="/login" class="btn-ghost !text-md hidden sm:inline-flex">{{ t('nav.login') }}</router-link>
        <router-link to="/register" class="btn-primary !py-2 !px-4 !text-md">{{ t('nav.getStarted') }}</router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLogo from '@/components/common/AppLogo.vue';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
const { t } = useI18n();

// Subtle scroll-shadow — the nav goes from transparent-y to solid-y as
// content passes under it. Uses window.scrollY, so nothing fancy is
// happening on route changes; passive listener, cheap to keep on.
const scrolled = ref(false);
function onScroll() { scrolled.value = window.scrollY > 8; }
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); });
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

function navClass(isActive) {
  const base = 'px-3.5 py-2 rounded-lg text-md font-semibold transition-all duration-150';
  if (isActive) {
    return `${base} bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft`;
  }
  return `${base} text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50`;
}
</script>
