<template>
  <component
    :is="tag"
    :type="tag === 'button' ? type : undefined"
    :to="to"
    :href="href"
    :disabled="tag === 'button' ? disabled || loading : undefined"
    :class="classes"
  >
    <span v-if="loading" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md | lg
  to: { type: [String, Object], default: undefined },
  href: { type: String, default: undefined },
});

const tag = computed(() => (props.to ? 'router-link' : props.href ? 'a' : 'button'));

const sizeClass = computed(() => ({
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: '',
  lg: 'text-lg px-6 py-3 rounded-xl',
}[props.size] || ''));

const base = computed(() => ({
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}[props.variant] || 'btn-primary'));

const classes = computed(() => [
  base.value,
  sizeClass.value,
  props.block && 'w-full',
  (props.disabled || props.loading) && 'opacity-60 pointer-events-none',
]);
</script>
