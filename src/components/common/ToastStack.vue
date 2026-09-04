<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition-all duration-300"
        leave-active-class="transition-all duration-300"
        enter-from-class="opacity-0 translate-y-2"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto surface-card px-4 py-3 min-w-[240px] max-w-xs flex items-start gap-3 animate-slide-up"
          :class="borderFor(t.kind)"
        >
          <component :is="iconFor(t.kind)" class="w-4 h-4 mt-0.5" :class="colorFor(t.kind)" />
          <p class="text-sm font-medium leading-snug text-surface-charcoal dark:text-surface-bone flex-1">{{ t.message }}</p>
          <button class="text-surface-slate hover:text-surface-charcoal dark:hover:text-surface-bone" @click="dismiss(t.id)" aria-label="Dismiss">
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useToast } from '@/composables/useToast';
const { toasts, dismiss } = useToast();

const iconFor = (k) => ({ success: CheckCircleIcon, error: XCircleIcon, warn: ExclamationTriangleIcon, info: InformationCircleIcon }[k] || InformationCircleIcon);
const colorFor = (k) => ({ success: 'text-emerald-500', error: 'text-red-500', warn: 'text-amber-500', info: 'text-brand-gold' }[k] || 'text-brand-gold');
const borderFor = (k) => ({ success: 'border-l-4 border-l-emerald-500', error: 'border-l-4 border-l-red-500', warn: 'border-l-4 border-l-amber-500', info: 'border-l-4 border-l-brand-gold' }[k] || '');
</script>
