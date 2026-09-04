<template>
  <div class="py-3.5 flex items-start justify-between gap-4">
    <div class="min-w-0">
      <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">{{ label }}</p>
      <p v-if="hint" class="text-sm text-surface-slate dark:text-surface-ash mt-0.5">{{ hint }}</p>
    </div>
    <Switch v-model="proxy" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Switch } from '@/components/ui';

const props = defineProps({
  label: { type: String, required: true },
  hint:  { type: String, default: '' },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
const proxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});
</script>
