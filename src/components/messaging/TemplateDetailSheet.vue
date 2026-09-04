<template>
  <Sheet :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" side="right" :size="520">
    <template #header>
      <div class="min-w-0">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">{{ categoryLabel }} · {{ template?.language }}</p>
        <h2 class="mt-1 text-lg font-black text-surface-charcoal dark:text-surface-bone truncate">{{ template?.name }}</h2>
      </div>
    </template>

    <div v-if="template" class="space-y-6">
      <div class="flex items-center gap-1.5">
        <Badge :tone="statusTone" size="sm">{{ template.status }}</Badge>
        <Badge v-if="template.hasImageHeader" tone="neutral" size="sm">Image header</Badge>
      </div>

      <p v-if="template.rejectedReason && template.rejectedReason !== 'NONE'"
         class="text-sm text-state-danger font-medium bg-state-danger-bg border border-state-danger/20 rounded-xl p-3">
        Rejected reason — {{ template.rejectedReason }}
      </p>

      <!-- WhatsApp-style preview at full width -->
      <section>
        <SectionHeader title="Preview" level="subsection" />
        <div class="p-4 rounded-2xl" style="background: #E5DDD5; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%2220%22 cy=%2220%22 r=%221%22 fill=%22%23d4c9c0%22/></svg>');">
          <div class="rounded-lg bg-white shadow-sm p-3 max-w-[320px]">
            <div v-if="template.hasImageHeader" class="mb-2 rounded overflow-hidden bg-surface-mist flex items-center justify-center" style="aspect-ratio: 4/3;">
              <svg class="w-10 h-10 opacity-40 text-surface-slate" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5 13.5l2.5 3 3.5-4.5L19 18H5l3.5-4.5zM3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
            </div>
            <pre class="whitespace-pre-wrap font-sans text-[13px] text-surface-charcoal leading-snug">{{ previewBody }}</pre>
            <p class="text-right text-[10px] text-surface-slate mt-1">now ✓✓</p>
          </div>
          <div v-if="template.buttonLabels?.length" class="mt-1.5 space-y-1 max-w-[320px]">
            <button v-for="(b, i) in template.buttonLabels" :key="i"
                    type="button"
                    class="w-full bg-white text-emerald-600 text-xs font-bold py-1.5 rounded shadow-sm">
              {{ b }}
            </button>
          </div>
        </div>
      </section>

      <!-- Approval checks -->
      <section v-if="lintIssues.length">
        <SectionHeader title="Approval checks" level="subsection" />
        <div class="space-y-1.5">
          <div v-for="(msg, i) in lintIssues" :key="i"
               :class="['flex items-start gap-2 text-sm p-2.5 rounded-lg border',
                        msg.level === 'error' ? 'bg-state-danger-bg border-state-danger/20 text-state-danger'
                        : msg.level === 'ok' ? 'bg-state-success-bg border-state-success/20 text-state-success'
                        : 'bg-state-warning-bg border-state-warning/20 text-state-warning']">
            <span class="font-mono font-black shrink-0">{{ msg.level === 'error' ? '×' : msg.level === 'ok' ? '✓' : '!' }}</span>
            <span>{{ msg.text }}</span>
          </div>
        </div>
      </section>

      <!-- Variables — helpful when composing a message. -->
      <section v-if="varCount > 0">
        <SectionHeader title="Variables" level="subsection" />
        <p class="text-sm text-surface-slate dark:text-surface-ash">
          This template has <strong class="text-surface-charcoal dark:text-surface-bone">{{ varCount }}</strong> variable{{ varCount === 1 ? '' : 's' }} to fill when sending.
          Body length: <span class="tabular-nums">{{ template.bodyText?.length || 0 }} / 1024</span>.
        </p>
      </section>
    </div>

    <template #footer>
      <Button v-if="isSuper" variant="ghost" @click="$emit('toggle-hide', template)">
        {{ template?.hidden ? 'Unhide' : 'Hide from tenants' }}
      </Button>
      <Button variant="primary" :disabled="template?.status !== 'APPROVED'" @click="$emit('use', template)">
        Use this template
      </Button>
    </template>
  </Sheet>
</template>

<script setup>
import { computed } from 'vue';
import { Badge, Button, SectionHeader, Sheet } from '@/components/ui';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  template:   { type: Object, default: null },
  isSuper:    { type: Boolean, default: false },
});
defineEmits(['update:modelValue', 'use', 'toggle-hide']);

const categoryLabel = computed(() => ({
  UTILITY: 'Utility',
  MARKETING: 'Invitation',
  AUTHENTICATION: 'One-time code',
})[props.template?.category] || 'Utility');

const statusTone = computed(() => ({
  APPROVED: 'success',
  PENDING:  'warning',
  REJECTED: 'danger',
  DISABLED: 'neutral',
})[props.template?.status] || 'neutral');

const SAMPLE = ['Davis', 'Harusi ya Alice na Bob', '15/08/2026', 'Serena Hotel', 'HR8-P31', '100,000', '25,000', '75,000', '02/09/2026'];
const previewBody = computed(() => {
  const raw = props.template?.bodyText || '(No body available — sync from WhatsApp)';
  return raw.replace(/\{\{(\d+)\}\}/g, (_, n) => SAMPLE[Number(n) - 1] || `[${n}]`);
});

const varCount = computed(() => props.template?.bodyVarCount || 0);

// Same lint rules as before — kept for parity with the old page.
const lintIssues = computed(() => {
  const t = props.template;
  if (!t?.bodyText) return [];
  const out = [];
  const varN = t.bodyVarCount || 0;
  const body = t.bodyText;
  const nonVarChars = body.replace(/\{\{\d+\}\}/g, '').length;
  if (varN > 0 && nonVarChars / varN < 20) {
    out.push({ level: 'error', text: `Only ${Math.round(nonVarChars / varN)} static chars per variable — Meta wants at least 20.` });
  }
  if (/(malipo|deposit|ahadi|pledge|TZS|mchango|contribution)/i.test(body) && t.category === 'UTILITY') {
    out.push({ level: 'warn', text: 'Money words present — Meta usually files this as Marketing.' });
  }
  if (/(karibu|welcome|invited|invitation|mwaliko)/i.test(body) && t.category === 'UTILITY') {
    out.push({ level: 'warn', text: 'Invitation wording — Marketing category approves faster.' });
  }
  if (t.buttonsKind === 'other' && t.buttonLabels?.length) {
    out.push({ level: 'error', text: 'Mixed button types — Meta only accepts all-URL or all-quick-reply.' });
  }
  if (body.length > 1024) out.push({ level: 'error', text: `Body is ${body.length} chars — Meta caps at 1024.` });
  if (!out.length && t.status !== 'REJECTED') out.push({ level: 'ok', text: 'Passes basic checks.' });
  return out;
});
</script>
