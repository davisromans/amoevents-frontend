<template>
  <footer class="border-t border-surface-mist dark:border-surface-fog bg-surface-ivory dark:bg-surface-coal">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
        <div class="col-span-2 lg:col-span-2">
          <div class="flex items-center gap-2">
            <AppLogo :size="24" />
          </div>
          <p class="mt-4 text-sm text-surface-slate dark:text-surface-ash max-w-xs leading-relaxed">
            The event platform East Africa runs on. Invitations, RSVPs, gate scanning, gallery — one dashboard.
          </p>
          <a :href="`mailto:${brand.supportEmail}`" class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-gold-deep dark:text-brand-gold-soft hover:underline">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            {{ brand.supportEmail }}
          </a>
        </div>

        <div v-for="col in COLUMNS" :key="col.heading">
          <p class="text-2xs uppercase font-black tracking-widest text-surface-charcoal dark:text-surface-bone">{{ col.heading }}</p>
          <ul class="mt-4 space-y-2.5">
            <li v-for="l in col.links" :key="l.label">
              <router-link v-if="l.to" :to="l.to" class="text-sm text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft transition-colors">
                {{ l.label }}
              </router-link>
              <a v-else :href="l.href" target="_blank" rel="noopener" class="text-sm text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft transition-colors">
                {{ l.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-12 pt-6 border-t border-surface-mist dark:border-surface-fog flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-xs text-surface-slate dark:text-surface-ash text-center sm:text-left">
          &copy; {{ year }} · Operated by {{ brand.legalEntity }} · Dar es Salaam, Tanzania
        </p>
        <div class="flex items-center gap-4 text-xs">
          <router-link to="/privacy" class="text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft">Privacy</router-link>
          <router-link to="/terms" class="text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft">Terms</router-link>
          <a href="https://amoview.com" target="_blank" rel="noopener" class="text-surface-slate dark:text-surface-ash hover:text-brand-gold-deep dark:hover:text-brand-gold-soft">Amoview →</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import AppLogo from '@/components/common/AppLogo.vue';
import { useBrand } from '@/composables/useBrand';
const year = new Date().getFullYear();
const { brand } = useBrand();

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',    to: '/features' },
      { label: 'Use cases',   to: '/use-cases' },
      { label: 'Pricing',     to: '/pricing' },
      { label: 'Get started', to: '/register' },
      { label: 'Sign in',     to: '/login' },
    ],
  },
  {
    heading: 'For guests',
    links: [
      { label: 'Find my invitation', to: '/login' },
      { label: 'RSVP help',          to: '/#faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   to: '/about' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms',   to: '/terms' },
    ],
  },
];
</script>
