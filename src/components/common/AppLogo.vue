<template>
  <div class="inline-flex items-center gap-1.5">
    <img
      :src="brand.logoUrl"
      :alt="brand.name"
      :width="size"
      :height="size"
      :style="{ width: `${size}px`, height: `${size}px` }"
      class="shrink-0 select-none rounded-lg"
      draggable="false"
    />
    <span
      v-if="showWord"
      class="font-black tracking-tight text-surface-charcoal dark:text-surface-bone leading-none"
      :style="{ fontSize: `${wordSize}px` }"
    >
      <!-- Two-tone treatment: everything except the last word in gold. -->
      <template v-for="(part, i) in nameParts" :key="i">
        <span v-if="i === nameParts.length - 1" class="text-brand-gold">{{ part }}</span>
        <span v-else>{{ part }}&nbsp;</span>
      </template>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBrand } from '@/composables/useBrand';
const props = defineProps({
  size: { type: Number, default: 28 },
  showWord: { type: Boolean, default: true },
});
const { brand } = useBrand();
const wordSize = computed(() => Math.round(props.size * 0.75));
const nameParts = computed(() => brand.value.name.split(/\s+/));
</script>
