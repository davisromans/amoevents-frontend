<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center" :class="flip ? 'lg:[&>*:first-child]:order-2' : ''">
    <div>
      <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">{{ band.eyebrow }}</p>
      <h2 class="mt-3 text-3xl sm:text-4xl font-black text-surface-charcoal dark:text-surface-bone tracking-tight leading-tight">{{ band.title }}</h2>
      <p class="mt-4 text-lg text-surface-slate dark:text-surface-ash leading-relaxed">{{ band.description }}</p>
      <ul class="mt-6 space-y-2.5">
        <li v-for="b in band.bullets" :key="b" class="flex items-start gap-3">
          <span class="w-5 h-5 rounded-full bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span class="text-md text-surface-charcoal dark:text-surface-bone">{{ b }}</span>
        </li>
      </ul>
    </div>

    <div class="relative">
      <div class="absolute -inset-10 bg-brand-gold-glow blur-3xl opacity-50 pointer-events-none" aria-hidden="true" />
      <div class="relative">
        <GuestsMockup v-if="band.mockup === 'guests'" />
        <ScannerMockup v-else-if="band.mockup === 'scanner'" />
        <GalleryMockup v-else-if="band.mockup === 'gallery'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import GuestsMockup from './mockups/GuestsMockup.vue';
import ScannerMockup from './mockups/ScannerMockup.vue';
import GalleryMockup from './mockups/GalleryMockup.vue';

defineProps({
  band: { type: Object, required: true },
  flip: { type: Boolean, default: false },
});
</script>
