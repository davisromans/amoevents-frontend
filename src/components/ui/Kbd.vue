<template>
  <span class="inline-flex items-center gap-1">
    <kbd v-for="(k, i) in keys" :key="i" class="kbd">{{ k }}</kbd>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** Either a keys array (['⌘','K']) or a shortcut string ('⌘+K'). */
  keys:     { type: Array, default: null },
  shortcut: { type: String, default: '' },
});

// Split "⌘+K" into ["⌘", "K"]; single-key form gets a one-item array.
const keys_ = computed(() => {
  if (Array.isArray(props.keys)) return props.keys;
  return props.shortcut ? props.shortcut.split('+').map((s) => s.trim()) : [];
});

// Local `keys` for the template (kept the prop name public for clarity).
// eslint-disable-next-line no-unused-vars
const keys = keys_;
</script>
