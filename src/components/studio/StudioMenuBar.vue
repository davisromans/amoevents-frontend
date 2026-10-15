<template>
  <nav ref="rootRef" class="flex items-center h-8 px-2 gap-0.5 select-none text-xs border-b border-surface-mist dark:border-surface-fog surface-card !rounded-none shrink-0"
       role="menubar" @keydown.esc="close">
    <div v-for="(menu, mi) in menus" :key="menu.label" class="relative">
      <button type="button" role="menuitem"
              class="px-2.5 py-1 rounded-md font-semibold text-surface-charcoal dark:text-surface-bone hover:bg-surface-mist/60 dark:hover:bg-surface-fog/60"
              :class="{ 'bg-surface-mist dark:bg-surface-fog': openIndex === mi }"
              :aria-expanded="openIndex === mi"
              @click="toggle(mi)" @mouseenter="hoverMenu(mi)">
        {{ menu.label }}
      </button>
      <MenuPanel v-if="openIndex === mi" :items="menu.items" class="top-full left-0 mt-0.5" @run="run" />
    </div>
  </nav>
</template>

<script setup>
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';

// Photoshop-style menu bar. `menus` is plain config so the Studio owns every
// action: [{ label, items: [{ label, shortcut, action, disabled, checked,
// items (submenu), separator: true }] }]. `disabled` and
// `checked` may be booleans or functions, evaluated each time a menu opens.
defineProps({ menus: { type: Array, required: true } });

const rootRef = ref(null);
const openIndex = ref(-1);

const resolve = (v) => (typeof v === 'function' ? v() : v);

function toggle(i) { openIndex.value = openIndex.value === i ? -1 : i; }
// Like Photoshop/macOS: once one menu is open, hovering another switches to it.
function hoverMenu(i) { if (openIndex.value !== -1) openIndex.value = i; }
function close() { openIndex.value = -1; }
function run(item) {
  close();
  if (resolve(item.disabled) || !item.action) return;
  item.action();
}

function onDocMouseDown(e) {
  if (openIndex.value !== -1 && rootRef.value && !rootRef.value.contains(e.target)) close();
}
onMounted(() => window.addEventListener('mousedown', onDocMouseDown, true));
onBeforeUnmount(() => window.removeEventListener('mousedown', onDocMouseDown, true));

// Recursive dropdown panel (render function so it can nest submenus).
const MenuPanel = defineComponent({
  name: 'MenuPanel',
  props: { items: { type: Array, required: true } },
  emits: ['run'],
  setup(props, { emit }) {
    const openSub = ref(-1);
    return () => h('div', {
      class: 'absolute z-50 min-w-[15rem] py-1 rounded-lg shadow-card surface-card border border-surface-mist dark:border-surface-fog',
      role: 'menu',
    }, props.items.filter((it) => !resolve(it.hidden)).map((item, i) => {
      if (item.separator) return h('div', { key: `sep${i}`, class: 'my-1 border-t border-surface-mist dark:border-surface-fog' });
      if (item.heading) return h('div', { key: `hd${i}`, class: 'px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide font-bold text-surface-slate dark:text-surface-ash' }, item.heading);
      const disabled = !!resolve(item.disabled);
      const checked = resolve(item.checked);
      const subItems = resolve(item.items) || [];
      const hasSub = Array.isArray(subItems) && subItems.length;
      return h('div', {
        key: item.label,
        class: 'relative',
        onMouseenter: () => { openSub.value = hasSub ? i : -1; },
      }, [
        h('button', {
          type: 'button',
          role: 'menuitem',
          disabled: disabled && !hasSub,
          title: item.hint || undefined,
          class: [
            'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs',
            disabled && !hasSub ? 'text-surface-slate/60 dark:text-surface-ash/50 cursor-default' : 'text-surface-charcoal dark:text-surface-bone hover:bg-brand-primary-glow',
          ],
          onClick: (e) => { e.stopPropagation(); if (!hasSub) emit('run', item); },
        }, [
          h('span', { class: 'w-3 shrink-0 text-center' }, checked ? '✓' : ''),
          h('span', { class: 'flex-1 truncate' }, item.label),
          item.shortcut ? h('span', { class: 'text-[10px] text-surface-slate dark:text-surface-ash pl-4' }, item.shortcut) : null,
          hasSub ? h('span', { class: 'text-surface-slate pl-2' }, '›') : null,
        ]),
        hasSub && openSub.value === i
          ? h(MenuPanel, { items: subItems, class: 'left-full top-0 -mt-1 ml-0.5', onRun: (it) => emit('run', it) })
          : null,
      ]);
    }));
  },
});
</script>
