<template>
  <div :class="['flex flex-col min-h-full', bleed ? '' : 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8']">
    <!-- Breadcrumbs — one row, small, muted. Skip when only 1 crumb. -->
    <nav v-if="crumbs.length > 1" class="flex items-center gap-1.5 text-xs text-surface-slate dark:text-surface-ash mb-4" aria-label="Breadcrumb">
      <template v-for="(c, i) in crumbs" :key="i">
        <router-link v-if="c.to && i < crumbs.length - 1" :to="c.to" class="hover:text-surface-charcoal dark:hover:text-surface-bone transition-colors truncate">{{ c.label }}</router-link>
        <span v-else class="text-surface-charcoal dark:text-surface-bone font-semibold truncate">{{ c.label }}</span>
        <svg v-if="i < crumbs.length - 1" class="w-3 h-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
      </template>
    </nav>

    <!-- Title row — one h1, one action cluster, one optional description. -->
    <header v-if="title || $slots.actions" class="flex items-start justify-between gap-4 mb-6 sm:mb-8">
      <div class="min-w-0">
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-surface-charcoal dark:text-surface-bone">{{ title }}</h1>
        <p v-if="description" class="mt-1.5 text-md text-surface-slate dark:text-surface-ash max-w-2xl">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </header>

    <!-- Tab strip — optional. Sits below the title, above content. -->
    <div v-if="$slots.tabs" class="mb-6">
      <slot name="tabs" />
    </div>

    <!-- Content. -->
    <div class="flex-1 min-h-0"><slot /></div>
  </div>
</template>

<script setup>
defineProps({
  /** Crumb list: [{ label, to? }]. Last one is the current page, no link. */
  crumbs:      { type: Array, default: () => [] },
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  /** Skip default padding — for pages that render full-bleed hero content. */
  bleed:       { type: Boolean, default: false },
});
</script>
