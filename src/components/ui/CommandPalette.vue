<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-fast"
      leave-active-class="transition-opacity duration-fast"
      enter-from-class="opacity-0" leave-to-class="opacity-0"
    >
      <div v-if="open"
           class="fixed inset-0 z-[150] bg-surface-charcoal/70 dark:bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[10vh]"
           @click.self="close">
        <transition
          enter-active-class="transition duration-base ease-out"
          leave-active-class="transition duration-fast ease-out"
          enter-from-class="opacity-0 translate-y-4 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="open"
               role="dialog" aria-modal="true"
               class="w-full max-w-lg surface-glass shadow-elev-4 overflow-hidden flex flex-col max-h-[70vh]">
            <div class="flex items-center gap-3 px-4 py-3 border-b border-surface-mist dark:border-surface-fog">
              <svg class="w-5 h-5 text-surface-slate dark:text-surface-ash shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                placeholder="Search or jump to…"
                class="flex-1 bg-transparent outline-none text-md font-medium text-surface-charcoal dark:text-surface-bone placeholder:text-surface-slate/70"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.enter.prevent="select(active)"
                @keydown.esc="close"
              />
              <span class="kbd shrink-0">ESC</span>
            </div>

            <div ref="listRef" class="flex-1 overflow-y-auto py-1.5">
              <div v-if="!results.length" class="px-4 py-10 text-center text-sm text-surface-slate dark:text-surface-ash">
                Nothing matches "{{ query }}".
              </div>
              <template v-for="(group, gi) in groupedResults" :key="group.heading">
                <p class="px-4 pt-3 pb-1 text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash">{{ group.heading }}</p>
                <button
                  v-for="item in group.items" :key="item._id"
                  type="button"
                  :class="[
                    'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-fast',
                    item._id === active?._id
                      ? 'bg-brand-primary-glow'
                      : 'hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50',
                  ]"
                  @mouseenter="active = item"
                  @click="select(item)"
                >
                  <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0 text-surface-slate dark:text-surface-ash" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-surface-charcoal dark:text-surface-bone truncate">{{ item.label }}</p>
                    <p v-if="item.description" class="text-2xs text-surface-slate dark:text-surface-ash truncate">{{ item.description }}</p>
                  </div>
                  <span v-if="item.shortcut" class="text-2xs text-surface-slate dark:text-surface-ash font-mono shrink-0">{{ item.shortcut }}</span>
                </button>
              </template>
            </div>

            <div class="px-4 py-2 border-t border-surface-mist dark:border-surface-fog flex items-center justify-between text-2xs text-surface-slate dark:text-surface-ash">
              <span class="flex items-center gap-1.5">
                <span class="kbd">↑</span><span class="kbd">↓</span> navigate
                <span class="kbd ml-2">↵</span> select
              </span>
              <span>{{ results.length }} results</span>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  /**
   * items: [{ _id, label, description?, icon?, group?, shortcut?,
   *           to? | onSelect?(router) }]
   * Grouping is by `group` string; ungrouped items fall under 'Jump to'.
   */
  items: { type: Array, default: () => [] },
});

const open = ref(false);
const query = ref('');
const active = ref(null);
const inputRef = ref(null);
const listRef = ref(null);
const router = useRouter();

function show() { open.value = true; }
function close() { open.value = false; query.value = ''; }
function toggle() { open.value ? close() : show(); }

// Simple fuzzy — match label OR description, case-insensitive, ordered
// subsequence match. Good enough for a few hundred items.
function matches(item, q) {
  if (!q) return true;
  const hay = (item.label + ' ' + (item.description || '')).toLowerCase();
  const n = q.toLowerCase();
  let i = 0;
  for (const ch of hay) {
    if (ch === n[i]) i += 1;
    if (i === n.length) return true;
  }
  return false;
}

const results = computed(() => props.items.filter((it) => matches(it, query.value)));
const groupedResults = computed(() => {
  const groups = new Map();
  for (const it of results.value) {
    const g = it.group || 'Jump to';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  return [...groups].map(([heading, items]) => ({ heading, items }));
});

watch(results, (r) => { active.value = r[0] || null; });

function move(delta) {
  const r = results.value;
  if (!r.length) return;
  const idx = r.findIndex((i) => i._id === active.value?._id);
  const next = ((idx < 0 ? 0 : idx + delta) + r.length) % r.length;
  active.value = r[next];
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-cmd-id="${next}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function select(item) {
  if (!item) return;
  close();
  if (typeof item.onSelect === 'function') item.onSelect(router);
  else if (item.to) router.push(item.to);
}

function onKey(e) {
  const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
  if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggle();
    if (open.value) nextTick(() => inputRef.value?.focus());
  }
}

onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));

defineExpose({ show, close, toggle });
</script>
