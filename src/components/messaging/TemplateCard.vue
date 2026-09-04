<template>
  <button type="button"
          :class="['group relative w-full text-left surface-card !p-0 overflow-hidden transition-all',
                   'hover:shadow-elev-3 hover:border-brand-primary/40',
                   selected ? 'ring-2 ring-brand-primary border-brand-primary' : '']"
          @click="$emit('select')">
    <!-- Header — status + category. -->
    <div class="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-black text-surface-charcoal dark:text-surface-bone truncate">{{ template.name }}</p>
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mt-0.5">
          {{ categoryLabel }} · {{ template.language }}
        </p>
      </div>
      <Badge :tone="statusTone" size="sm">{{ template.status }}</Badge>
    </div>

    <!-- WhatsApp-style bubble preview — always visible so the gallery
         reads as "what will guests see" not "what's in the database". -->
    <div class="mx-3 mb-3 p-2.5 rounded-lg" style="background: #E5DDD5;">
      <div class="rounded-lg bg-white shadow-sm p-2 max-w-full">
        <div v-if="template.hasImageHeader"
             class="mb-1.5 rounded overflow-hidden bg-surface-mist flex items-center justify-center"
             style="aspect-ratio: 4/3;">
          <svg class="w-6 h-6 opacity-40 text-surface-slate" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5 13.5l2.5 3 3.5-4.5L19 18H5l3.5-4.5zM3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
        </div>
        <pre class="whitespace-pre-wrap font-sans text-[11px] text-surface-charcoal leading-snug line-clamp-4">{{ previewBody }}</pre>
        <p class="text-right text-[9px] text-surface-slate mt-0.5">now ✓✓</p>
      </div>
      <div v-if="template.buttonLabels?.length" class="mt-1 space-y-0.5">
        <div v-for="(b, i) in template.buttonLabels.slice(0, 2)" :key="i"
             class="bg-white text-emerald-600 text-[10px] font-bold py-1 rounded shadow-sm text-center truncate">
          {{ b }}
        </div>
        <p v-if="template.buttonLabels.length > 2" class="text-[9px] text-surface-slate text-center">+{{ template.buttonLabels.length - 2 }} more</p>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Badge } from '@/components/ui';

const props = defineProps({
  template: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});
defineEmits(['select']);

const categoryLabel = computed(() => ({
  UTILITY: 'Utility',
  MARKETING: 'Invitation',
  AUTHENTICATION: 'One-time code',
})[props.template.category] || 'Utility');

const statusTone = computed(() => ({
  APPROVED: 'success',
  PENDING:  'warning',
  REJECTED: 'danger',
  DISABLED: 'neutral',
})[props.template.status] || 'neutral');

// Realistic preview — same sample data as the detail preview so a card
// and its expanded view read the same.
const SAMPLE = ['Davis', 'Harusi ya Alice na Bob', '15/08/2026', 'Serena Hotel', 'HR8-P31', '100,000', '25,000', '75,000', '02/09/2026'];
const previewBody = computed(() => {
  const raw = props.template.bodyText || '(No body — sync from WhatsApp to see the message)';
  return raw.replace(/\{\{(\d+)\}\}/g, (_, n) => SAMPLE[Number(n) - 1] || `[${n}]`);
});
</script>
