<template>
  <div class="min-h-screen bg-surface-cream dark:bg-surface-night text-surface-charcoal dark:text-surface-bone overflow-x-hidden">
    <PublicNav />

    <!-- Hero — same shape every marketing page uses. Eyebrow, headline,
         subtitle, optional CTA row. Purple glow blob behind at the top. -->
    <section class="relative">
      <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-brand-primary-glow blur-3xl opacity-60" />
      </div>
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14 sm:pt-28 sm:pb-16 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-sm mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-primary" />
          <span class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">{{ eyebrow }}</span>
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
          <slot name="headline">{{ headline }}</slot>
        </h1>
        <p v-if="subtitle" class="mt-5 text-lg sm:text-xl text-surface-slate dark:text-surface-ash max-w-2xl mx-auto leading-relaxed">{{ subtitle }}</p>
        <div v-if="$slots.actions || primaryCta" class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <slot name="actions">
            <router-link :to="primaryCta.to">
              <button class="btn-primary !py-3 !px-6 !text-md">
                {{ primaryCta.label }}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </router-link>
          </slot>
        </div>
      </div>
    </section>

    <slot />

    <PublicFooter />
  </div>
</template>

<script setup>
import PublicNav from '@/components/layout/PublicNav.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';

defineProps({
  eyebrow:    { type: String, required: true },
  headline:   { type: String, default: '' },
  subtitle:   { type: String, default: '' },
  primaryCta: { type: Object, default: null }, // { label, to }
});
</script>
