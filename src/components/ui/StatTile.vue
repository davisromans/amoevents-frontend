<template>
  <component :is="tag" :to="to" :class="rootClasses">
    <div class="flex items-start justify-between gap-2">
      <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">{{ label }}</p>
      <span v-if="trend != null" :class="trendClass">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path v-if="trend > 0" d="M6 15l6-6 6 6" />
          <path v-else-if="trend < 0" d="M6 9l6 6 6-6" />
          <path v-else d="M5 12h14" />
        </svg>
        {{ Math.abs(trend) }}%
      </span>
    </div>
    <p class="mt-2 text-3xl sm:text-4xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums leading-none">{{ value }}</p>
    <p v-if="meta" class="mt-2 text-xs text-surface-slate dark:text-surface-ash">{{ meta }}</p>

    <!-- Sparkline — decorative but real: expects an array of numbers. -->
    <svg v-if="spark && spark.length" viewBox="0 0 100 24" class="mt-3 w-full h-6" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        :points="sparkPoints"
        fill="none"
        stroke="url(#stat-tile-grad)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <defs>
        <linearGradient id="stat-tile-grad" x1="0" x2="1">
          <stop offset="0%" stop-color="#D084FF" />
          <stop offset="100%" stop-color="#9B59B6" />
        </linearGradient>
      </defs>
    </svg>
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  meta:  { type: String, default: '' },
  /** Percentage as a number. +ve up, -ve down, 0 flat. Null = hide. */
  trend: { type: Number, default: null },
  /** Array of numbers for the sparkline. */
  spark: { type: Array, default: null },
  /** Optional router-link target — makes the whole tile clickable. */
  to:    { type: [String, Object], default: null },
  /** default | filled (purple gradient background, for the hero KPI on a dashboard) */
  variant: { type: String, default: 'default' },
});

const tag = computed(() => props.to ? 'router-link' : 'div');

const rootClasses = computed(() => {
  const base = 'block p-5 transition-all duration-fast';
  const interactive = props.to ? 'hover:shadow-elev-3 hover:border-brand-primary/40 cursor-pointer' : '';
  const variant = props.variant === 'filled'
    ? 'rounded-2xl bg-gradient-primary text-white shadow-primary-soft border border-transparent'
    : 'surface-card';
  return [base, interactive, variant].filter(Boolean).join(' ');
});

// Trend chip color — green up, red down, neutral flat.
const trendClass = computed(() => {
  const base = 'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded-md';
  if (props.trend === 0 || props.trend == null) return `${base} bg-surface-mist/60 dark:bg-surface-fog/60 text-surface-slate dark:text-surface-ash`;
  return props.trend > 0
    ? `${base} bg-state-success-bg text-state-success`
    : `${base} bg-state-danger-bg text-state-danger`;
});

// Sparkline: map values to a 100×24 viewBox, normalizing so the peak
// touches the top edge and the trough sits on the bottom.
const sparkPoints = computed(() => {
  const arr = props.spark || [];
  if (arr.length < 2) return '';
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  const stepX = 100 / (arr.length - 1);
  return arr.map((v, i) => `${(i * stepX).toFixed(1)},${(24 - ((v - min) / range) * 22 - 1).toFixed(1)}`).join(' ');
});
</script>

<style scoped>
/* Give the filled variant's chip a translucent-white treatment so it
   reads on the purple ground. Scoped so this doesn't leak. */
:deep(.bg-gradient-primary) p { color: white; }
</style>
