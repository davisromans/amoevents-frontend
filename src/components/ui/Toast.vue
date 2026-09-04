<template>
  <Teleport to="body">
    <div class="fixed z-[200] top-4 right-4 sm:top-5 sm:right-5 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none">
      <transition-group
        enter-active-class="transition duration-base ease-out"
        leave-active-class="transition duration-fast ease-out"
        enter-from-class="opacity-0 translate-x-4"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div v-for="t in toasts" :key="t.id"
             role="status"
             :class="[
               'pointer-events-auto surface-glass shadow-elev-3 p-3.5 flex items-start gap-3',
               'border-l-4',
               toneBorder(t.kind),
             ]">
          <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                :class="toneBg(t.kind)">
            <svg v-if="t.kind === 'success'" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            <svg v-else-if="t.kind === 'error'" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
            <svg v-else-if="t.kind === 'warning'" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/></svg>
            <svg v-else class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/></svg>
          </span>
          <div class="min-w-0 flex-1">
            <p v-if="t.title" class="text-sm font-bold text-surface-charcoal dark:text-surface-bone">{{ t.title }}</p>
            <p class="text-sm text-surface-charcoal dark:text-surface-bone leading-snug" :class="t.title ? 'mt-0.5 text-surface-slate dark:text-surface-ash' : ''">{{ t.message }}</p>
          </div>
          <button type="button" aria-label="Dismiss" class="btn-ghost !h-6 !w-6 !p-0 shrink-0" @click="dismiss(t.id)">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast';
const { toasts, dismiss } = useToast();
// Border color per kind — one line to keep template terse.
function toneBorder(k) {
  return ({ success: 'border-state-success', error: 'border-state-danger', warning: 'border-state-warning', info: 'border-state-info' })[k] || 'border-state-info';
}
function toneBg(k) {
  return ({ success: 'bg-state-success', error: 'bg-state-danger', warning: 'bg-state-warning', info: 'bg-state-info' })[k] || 'bg-state-info';
}
</script>
