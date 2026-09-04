<template>
  <div class="surface-card p-6 space-y-5 animate-slide-up">
    <div>
      <p class="section-eyebrow mb-1">Excel reconciliation</p>
      <h3 class="text-xl font-extrabold text-surface-charcoal dark:text-surface-bone">Preview changes before applying</h3>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryTile label="New" :value="preview.summary.toCreate" tone="success" />
      <SummaryTile label="Updated" :value="preview.summary.toUpdate" tone="gold" />
      <SummaryTile label="Missing from file" :value="preview.summary.removedFromFile" tone="warn" />
      <SummaryTile label="Duplicates in file" :value="preview.summary.duplicatesInFile" tone="danger" />
    </div>

    <div v-if="preview.toCreate.length" class="space-y-2">
      <p class="text-2xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">Will be added ({{ preview.toCreate.length }})</p>
      <ul class="surface-inset p-3 max-h-40 overflow-y-auto text-md text-surface-charcoal dark:text-surface-bone space-y-1">
        <li v-for="row in preview.toCreate.slice(0, 50)" :key="row.phone" class="flex justify-between gap-3">
          <span class="truncate">{{ row.firstName }} {{ row.lastName }}</span>
          <span class="tabular-nums text-xs text-surface-slate dark:text-surface-ash">{{ row.phone }}</span>
        </li>
        <li v-if="preview.toCreate.length > 50" class="text-xs text-surface-slate dark:text-surface-ash">+ {{ preview.toCreate.length - 50 }} more…</li>
      </ul>
    </div>

    <div v-if="preview.toUpdate.length" class="space-y-2">
      <p class="text-2xs uppercase font-extrabold tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">Will be updated ({{ preview.toUpdate.length }})</p>
      <ul class="surface-inset p-3 max-h-52 overflow-y-auto text-md space-y-2">
        <li v-for="u in preview.toUpdate.slice(0, 30)" :key="u.before._id" class="border-b border-surface-mist dark:border-surface-fog pb-2 last:border-0 last:pb-0">
          <p class="font-bold text-surface-charcoal dark:text-surface-bone">{{ u.row.firstName }} {{ u.row.lastName }} <span class="text-xs font-normal text-surface-slate dark:text-surface-ash">{{ u.row.phone }}</span></p>
          <ul class="text-xs mt-1 space-y-0.5">
            <li v-for="(v, k) in u.diff" :key="k" class="text-surface-slate dark:text-surface-ash">
              <span class="font-bold uppercase tracking-wider text-2xs">{{ k }}:</span>
              <span class="line-through opacity-60">{{ v.before || '—' }}</span>
              → <span class="text-brand-gold-deep dark:text-brand-gold-soft font-bold">{{ v.after || '—' }}</span>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div v-if="preview.removed.length" class="space-y-2">
      <label class="flex items-start gap-2 text-md text-surface-charcoal dark:text-surface-bone">
        <input type="checkbox" v-model="removeMissing" class="accent-red-500 w-4 h-4 mt-0.5" />
        <span>
          <span class="font-bold">Delete {{ preview.removed.length }} guests</span> not present in this file
          <span class="block text-xs text-surface-slate dark:text-surface-ash">Otherwise they stay — recommended if this file is only additions/updates.</span>
        </span>
      </label>
    </div>

    <div v-if="preview.duplicates.length" class="surface-inset p-3 border-l-4 border-l-red-500">
      <p class="text-2xs uppercase font-extrabold tracking-widest text-red-600 dark:text-red-400 mb-1">Duplicates in file ({{ preview.duplicates.length }})</p>
      <p class="text-xs text-surface-slate dark:text-surface-ash">These rows share a phone number with an earlier row — only the first is used.</p>
    </div>

    <div class="flex justify-end gap-2 pt-2 border-t border-surface-mist dark:border-surface-fog">
      <button class="btn-ghost" :disabled="applying" @click="$emit('discard')">Cancel</button>
      <AppButton :loading="applying" @click="$emit('apply', { removeMissing })">Apply changes</AppButton>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import SummaryTile from '@/components/events/EventStat.vue';
defineProps({ preview: { type: Object, required: true }, applying: Boolean });
defineEmits(['apply', 'discard']);
const removeMissing = ref(false);
</script>
