<template>
  <div class="inline-flex items-center gap-1 p-1 rounded-2xl surface-inset">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="px-4 py-2 rounded-xl text-md font-bold transition-all duration-200"
      :class="modelValue === opt.value
        ? 'bg-gradient-gold text-surface-charcoal shadow-gold-soft'
        : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'"
      @click="$emit('update:modelValue', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
});
defineEmits(['update:modelValue']);
</script>
