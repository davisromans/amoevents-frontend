<template>
  <transition
    enter-active-class="transition-all duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="needRefresh"
      class="fixed left-1/2 -translate-x-1/2 z-[80] w-[min(92vw,420px)]"
      :style="{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }"
    >
      <div class="surface-card border border-brand-gold-soft/60 shadow-lg p-3 flex items-center gap-3">
        <span class="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
          <ArrowPathIcon class="w-4 h-4 text-surface-charcoal" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-md font-black text-surface-charcoal dark:text-surface-bone leading-tight">
            New version ready
          </p>
          <p class="text-xs text-surface-slate dark:text-surface-ash leading-tight">
            Tap update to get the latest.
          </p>
        </div>
        <button
          class="btn-primary !text-sm !px-3 !py-2 shrink-0"
          @click="onUpdate"
        >
          Update
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import { useAppUpdate, applyUpdate } from '@/composables/useAppUpdate';

const { needRefresh } = useAppUpdate();

function onUpdate() {
  applyUpdate();
}
</script>
