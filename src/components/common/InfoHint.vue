<template>
  <span class="info-hint relative inline-flex align-middle" tabindex="0" :aria-label="text">
    <InformationCircleIcon class="w-3.5 h-3.5 text-surface-slate dark:text-surface-ash opacity-70 hover:opacity-100" />
    <span class="info-hint-bubble" :class="align === 'right' ? 'align-right' : ''">{{ text }}</span>
  </span>
</template>

<script setup>
import { InformationCircleIcon } from '@heroicons/vue/24/outline';
defineProps({
  text: { type: String, required: true },
  align: { type: String, default: 'center' },
});
</script>

<style scoped>
.info-hint-bubble {
  visibility: hidden; opacity: 0;
  position: absolute; z-index: 30;
  bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%);
  background: #1B1526; color: white;
  padding: 8px 10px; border-radius: 8px;
  font-size: 11px; font-weight: 500;
  letter-spacing: 0; text-transform: none;
  width: 240px; text-align: left; line-height: 1.4;
  transition: opacity 100ms; pointer-events: none;
  white-space: normal;
}
.info-hint-bubble.align-right { left: auto; right: 0; transform: none; }
.info-hint:hover .info-hint-bubble,
.info-hint:focus .info-hint-bubble { visibility: visible; opacity: 1; }
</style>
