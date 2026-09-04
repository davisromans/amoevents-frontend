<template>
  <Popover :align="align" :side="side">
    <template #trigger="triggerCtx">
      <slot name="trigger" v-bind="triggerCtx" />
    </template>
    <template #default="{ close }">
      <div class="min-w-[12rem] py-1.5" role="menu">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.divider" class="my-1.5 h-px bg-surface-mist dark:bg-surface-fog" />
          <p v-else-if="item.heading" class="px-3 py-1.5 text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">{{ item.heading }}</p>
          <component
            v-else
            :is="item.to ? 'router-link' : item.href ? 'a' : 'button'"
            :to="item.to"
            :href="item.href"
            :target="item.href && item.external ? '_blank' : undefined"
            :rel="item.href && item.external ? 'noopener' : undefined"
            :type="item.to || item.href ? undefined : 'button'"
            :disabled="item.disabled"
            role="menuitem"
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors duration-fast',
              item.danger
                ? 'text-state-danger hover:bg-state-danger-bg'
                : 'text-surface-charcoal dark:text-surface-bone hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60',
              item.disabled ? 'opacity-50 cursor-not-allowed' : '',
            ]"
            @click="onSelect(item, close, $event)"
          >
            <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0 opacity-70" />
            <span class="flex-1 min-w-0 truncate">{{ item.label }}</span>
            <span v-if="item.shortcut" class="text-2xs text-surface-slate dark:text-surface-ash font-mono shrink-0">{{ item.shortcut }}</span>
            <span v-if="item.trailing" class="text-2xs text-surface-slate dark:text-surface-ash shrink-0">{{ item.trailing }}</span>
          </component>
        </template>
        <slot :close="close" />
      </div>
    </template>
  </Popover>
</template>

<script setup>
import Popover from './Popover.vue';

defineProps({
  /**
   * items: [{ label, icon?, to?, href?, external?, onSelect?(), shortcut?,
   *           trailing?, danger?, disabled?, divider?, heading? }]
   */
  items: { type: Array, default: () => [] },
  align: { type: String, default: 'end' },
  side:  { type: String, default: 'bottom' },
});

function onSelect(item, close, event) {
  if (item.disabled) return;
  if (typeof item.onSelect === 'function') {
    // Let the handler decide whether to keep the menu open (return true to keep).
    const keepOpen = item.onSelect(event);
    if (!keepOpen) close();
  } else if (!item.to && !item.href) {
    close();
  }
  // router-link / <a> navigate on their own and unmount, so no explicit close.
}
</script>
