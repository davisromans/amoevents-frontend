<template>
  <div
    :class="orientation === 'vertical'
      ? 'inline-block w-px self-stretch bg-surface-mist dark:bg-surface-fog'
      : ($slots.default ? 'flex items-center gap-3 my-4' : 'h-px bg-surface-mist dark:bg-surface-fog my-4')"
  >
    <template v-if="$slots.default && orientation !== 'vertical'">
      <span class="flex-1 h-px bg-surface-mist dark:bg-surface-fog" />
      <span class="text-xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash"><slot /></span>
      <span class="flex-1 h-px bg-surface-mist dark:bg-surface-fog" />
    </template>
  </div>
</template>

<script setup>
defineProps({
  /** horizontal (default) | vertical */
  orientation: { type: String, default: 'horizontal' },
});
</script>
