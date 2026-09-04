<template>
  <component
    :is="tag"
    :type="tag === 'button' ? type : undefined"
    :to="to"
    :href="href"
    :target="href && external ? '_blank' : undefined"
    :rel="href && external ? 'noopener' : undefined"
    :disabled="tag === 'button' ? (disabled || loading) : undefined"
    :aria-busy="loading || undefined"
    :class="classes"
  >
    <span v-if="loading" class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
    <slot name="leading" />
    <slot />
    <slot name="trailing" />
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** primary | secondary | ghost | danger | link */
  variant: { type: String, default: 'primary' },
  /** sm | md | lg */
  size:    { type: String, default: 'md' },
  type:    { type: String, default: 'button' },
  to:      { type: [String, Object], default: null }, // router-link href
  href:    { type: String, default: null },           // anchor href
  external:{ type: Boolean, default: false },         // open in new tab
  disabled:{ type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block:   { type: Boolean, default: false },
});

// Component tag flips based on props: prefers router-link if `to`, then
// <a> if `href`, otherwise a real <button>. Consumer never has to think.
const tag = computed(() => (props.to ? 'router-link' : props.href ? 'a' : 'button'));

const classes = computed(() => {
  const size = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : 'btn-md';
  const base = ({
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
    link:      'btn-link',
  })[props.variant] || 'btn-primary';
  return [
    base,
    // ghost/link don't take the size utility (they set their own height)
    props.variant === 'ghost' || props.variant === 'link' ? '' : size,
    props.block ? 'w-full' : '',
  ].filter(Boolean).join(' ');
});
</script>
