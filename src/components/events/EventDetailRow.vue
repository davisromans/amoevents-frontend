<template>
  <div>
    <dt class="text-2xs uppercase font-extrabold tracking-widest text-surface-slate dark:text-surface-ash">{{ label }}</dt>
    <dd class="text-md text-surface-charcoal dark:text-surface-bone mt-0.5">
      <slot name="value">{{ value }}</slot>
    </dd>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [String, Number] });
</script>
