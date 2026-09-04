<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-black uppercase tracking-widest"
    :class="cls"
  >{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { roleLabel, roleClass } from '@/utils/roles';
const props = defineProps({ role: String });
const label = computed(() => roleLabel(props.role));
const cls = computed(() => roleClass(props.role));
</script>
