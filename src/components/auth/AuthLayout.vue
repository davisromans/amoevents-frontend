<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-surface-cream dark:bg-surface-night">
    <!-- Top-right controls float over both panels; on mobile they sit
         over the form area with a small dark scrim beneath. -->
    <div class="fixed top-3 right-3 z-30 flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <!-- LEFT: form panel. Full width on mobile, 5/12 on lg+, capped at
         a comfortable single-column reading width regardless. -->
    <section class="flex-1 lg:flex-none lg:w-[45%] xl:w-[42%] flex flex-col">
      <div v-if="$slots.headerAction" class="flex items-center justify-end px-6 sm:px-10 pt-6 sm:pt-8 text-sm">
        <slot name="headerAction" />
      </div>

      <div class="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 sm:py-14">
        <div class="w-full max-w-md">
          <div v-if="eyebrow" class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-3">{{ eyebrow }}</div>
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone leading-tight">{{ title }}</h1>
          <p v-if="description" class="mt-3 text-md text-surface-slate dark:text-surface-ash leading-relaxed">{{ description }}</p>

          <div class="mt-8">
            <slot />
          </div>

          <div v-if="$slots.footer" class="mt-8 pt-6 border-t border-surface-mist dark:border-surface-fog">
            <slot name="footer" />
          </div>
        </div>
      </div>

      <p class="text-2xs text-surface-slate/70 dark:text-surface-ash/70 text-center pb-6 px-6">
        By continuing you accept our
        <router-link to="/terms" class="underline hover:text-surface-charcoal dark:hover:text-surface-bone">Terms</router-link>
        &amp;
        <router-link to="/privacy" class="underline hover:text-surface-charcoal dark:hover:text-surface-bone">Privacy Policy</router-link>.
      </p>
    </section>

    <!-- RIGHT: brand panel. Hidden below lg, becomes a slim strip on md. -->
    <aside class="hidden lg:block lg:w-[55%] xl:w-[58%] relative">
      <AuthBrandPanel />
    </aside>
  </div>
</template>

<script setup>
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import AuthBrandPanel from './AuthBrandPanel.vue';

defineProps({
  eyebrow:     { type: String, default: '' },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
});
</script>
