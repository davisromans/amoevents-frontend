<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[900] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-surface-charcoal/50 backdrop-blur-sm" @click="closeIfBackdrop" />
        <div class="relative w-full animate-scale-in surface-card p-6 max-h-[90vh] overflow-y-auto" :style="{ maxWidth: `${maxWidth}px` }">
          <div v-if="title || $slots.header" class="flex items-start justify-between mb-4 gap-4">
            <h3 class="section-title">{{ title }}<slot name="header" /></h3>
            <button class="btn-ghost !p-1.5" @click="$emit('update:modelValue', false)" aria-label="Close">
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <slot />
          <div v-if="$slots.footer" class="mt-6 flex items-center justify-end gap-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline';
const props = defineProps({
  modelValue: Boolean,
  title: String,
  maxWidth: { type: Number, default: 520 },
  dismissOnBackdrop: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);
function closeIfBackdrop() { if (props.dismissOnBackdrop) emit('update:modelValue', false); }
</script>
