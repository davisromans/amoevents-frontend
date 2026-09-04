<template>
  <div>
    <label class="field-label">Dress code</label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="field-input"
      placeholder="e.g. Gold & Ivory — pick colors or type freely"
    />

    <!-- Selected color chips (click × to remove) -->
    <div v-if="selectedNames.length" class="flex flex-wrap gap-1.5 mt-2">
      <button v-for="c in selectedNames" :key="c.name"
              type="button"
              class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg text-xs font-bold group"
              :style="{ background: c.hex, color: contrastColor(c.hex) }"
              @click="remove(c.name)">
        <span class="w-3 h-3 rounded-full border border-white/40" :style="{ background: c.hex }" />
        {{ c.name }}
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-black/20 group-hover:bg-black/40 transition text-2xs">×</span>
      </button>
    </div>

    <p class="field-help">Click swatches to add · click a selected chip to remove.</p>

    <!-- Categorised swatches -->
    <div class="mt-3 space-y-3">
      <div v-for="cat in PALETTE" :key="cat.name">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-1">{{ cat.name }}</p>
        <div class="flex flex-wrap gap-1">
          <button v-for="c in cat.colors" :key="c.name"
                  type="button"
                  class="group relative"
                  :title="c.name"
                  @click="add(c.name)">
            <span class="block w-7 h-7 rounded-lg border border-white/60 shadow-sm transition-transform group-hover:scale-110"
                  :style="{ background: c.hex }" />
            <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-2xs font-bold px-1.5 py-0.5 rounded bg-surface-charcoal text-white whitespace-nowrap transition-opacity">
              {{ c.name }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ modelValue: String });
const emit = defineEmits(['update:modelValue']);

// Curated wedding + event color palette (grouped by family).
const PALETTE = [
  { name: 'Golds & metallics', colors: [
    { name: 'Champagne', hex: '#F7E7CE' }, { name: 'Ivory', hex: '#FFFDF5' },
    { name: 'Cream', hex: '#FFFDD0' }, { name: 'Old Gold', hex: '#CFB53B' },
    { name: 'Gold', hex: '#D4AF37' }, { name: 'Rose Gold', hex: '#B76E79' },
    { name: 'Copper', hex: '#B87333' }, { name: 'Bronze', hex: '#CD7F32' },
    { name: 'Silver', hex: '#C0C0C0' }, { name: 'Platinum', hex: '#E5E4E2' },
    { name: 'Pewter', hex: '#899499' },
  ] },
  { name: 'Whites & neutrals', colors: [
    { name: 'White', hex: '#FFFFFF' }, { name: 'Off-white', hex: '#FAF9F6' },
    { name: 'Pearl', hex: '#F0EAD6' }, { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Taupe', hex: '#8B7E74' }, { name: 'Sand', hex: '#C2B280' },
    { name: 'Camel', hex: '#C19A6B' }, { name: 'Khaki', hex: '#C3B091' },
    { name: 'Nude', hex: '#E3BC9A' }, { name: 'Ecru', hex: '#C2B280' },
  ] },
  { name: 'Blush & pinks', colors: [
    { name: 'Blush', hex: '#FFC0CB' }, { name: 'Rose', hex: '#FF66CC' },
    { name: 'Dusty Rose', hex: '#DCAE96' }, { name: 'Coral', hex: '#FF7F50' },
    { name: 'Salmon', hex: '#FA8072' }, { name: 'Peach', hex: '#FFCBA4' },
    { name: 'Fuchsia', hex: '#FF00FF' }, { name: 'Magenta', hex: '#C71585' },
  ] },
  { name: 'Reds & wines', colors: [
    { name: 'Red', hex: '#DC143C' }, { name: 'Burgundy', hex: '#800020' },
    { name: 'Wine', hex: '#722F37' }, { name: 'Maroon', hex: '#800000' },
    { name: 'Ruby', hex: '#E0115F' }, { name: 'Cherry', hex: '#B22222' },
    { name: 'Brick', hex: '#B22222' }, { name: 'Terracotta', hex: '#E2725B' },
  ] },
  { name: 'Purples', colors: [
    { name: 'Lavender', hex: '#E6E6FA' }, { name: 'Lilac', hex: '#C8A2C8' },
    { name: 'Mauve', hex: '#E0B0FF' }, { name: 'Plum', hex: '#8E4585' },
    { name: 'Purple', hex: '#800080' }, { name: 'Eggplant', hex: '#614051' },
    { name: 'Violet', hex: '#8F00FF' },
  ] },
  { name: 'Blues', colors: [
    { name: 'Sky', hex: '#87CEEB' }, { name: 'Powder Blue', hex: '#B0E0E6' },
    { name: 'Baby Blue', hex: '#89CFF0' }, { name: 'Royal Blue', hex: '#4169E1' },
    { name: 'Navy', hex: '#000080' }, { name: 'Midnight', hex: '#191970' },
    { name: 'Teal', hex: '#008080' }, { name: 'Turquoise', hex: '#40E0D0' },
    { name: 'Aqua', hex: '#00FFFF' }, { name: 'Cobalt', hex: '#0047AB' },
  ] },
  { name: 'Greens', colors: [
    { name: 'Mint', hex: '#98FF98' }, { name: 'Sage', hex: '#BCB88A' },
    { name: 'Olive', hex: '#808000' }, { name: 'Emerald', hex: '#50C878' },
    { name: 'Forest', hex: '#228B22' }, { name: 'Hunter', hex: '#355E3B' },
    { name: 'Jade', hex: '#00A86B' }, { name: 'Lime', hex: '#BFFF00' },
  ] },
  { name: 'Oranges & yellows', colors: [
    { name: 'Orange', hex: '#FFA500' }, { name: 'Tangerine', hex: '#F28500' },
    { name: 'Pumpkin', hex: '#FF7518' }, { name: 'Mustard', hex: '#FFDB58' },
    { name: 'Yellow', hex: '#FFFF00' }, { name: 'Butter', hex: '#FFF5B7' },
    { name: 'Amber', hex: '#FFBF00' }, { name: 'Saffron', hex: '#F4C430' },
  ] },
  { name: 'Browns & blacks', colors: [
    { name: 'Chocolate', hex: '#7B3F00' }, { name: 'Brown', hex: '#8B4513' },
    { name: 'Espresso', hex: '#4B3621' }, { name: 'Charcoal', hex: '#36454F' },
    { name: 'Slate', hex: '#708090' }, { name: 'Black', hex: '#000000' },
  ] },
];

// Flatten to a lookup for chip rendering.
const FLAT = PALETTE.flatMap((cat) => cat.colors);

// Split the free-form value into discrete tokens on " & " or ",".
// Whole-token equality avoids "Rose" matching "Rose Gold" / "Dusty Rose".
function tokensOf(value) {
  return String(value || '')
    .split(/\s*[&,]\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const selectedNames = computed(() => {
  const parts = tokensOf(props.modelValue).map((p) => p.toLowerCase());
  return FLAT.filter((c) => parts.includes(c.name.toLowerCase()));
});

function add(name) {
  const parts = tokensOf(props.modelValue);
  if (parts.some((p) => p.toLowerCase() === name.toLowerCase())) return;
  parts.push(name);
  emit('update:modelValue', parts.join(' & '));
}

function remove(name) {
  const parts = tokensOf(props.modelValue).filter((p) => p.toLowerCase() !== name.toLowerCase());
  emit('update:modelValue', parts.join(' & '));
}

function contrastColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const l = (r * 299 + g * 587 + b * 114) / 1000;
  return l > 155 ? '#1F1E1A' : '#FFFDF7';
}
</script>
