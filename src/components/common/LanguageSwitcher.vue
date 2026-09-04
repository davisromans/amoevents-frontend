<template>
  <div class="relative" @focusout="onBlur">
    <button
      class="btn-ghost !p-2 !rounded-full inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest"
      :aria-label="t('settings.language')"
      @click="open = !open"
    >
      <GlobeAltIcon class="w-4 h-4" />
      <span>{{ current.flag }}</span>
    </button>

    <Transition
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-1 w-40 z-50 surface-card p-1 shadow-gold-soft"
        role="menu"
      >
        <button
          v-for="loc in LOCALES"
          :key="loc.code"
          class="w-full flex items-center gap-2 px-3 py-2 text-md font-semibold rounded-lg text-left transition"
          :class="loc.code === locale
            ? 'bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft'
            : 'text-surface-charcoal dark:text-surface-bone hover:bg-surface-mist/50 dark:hover:bg-surface-fog/50'"
          @click="pick(loc.code)"
        >
          <span class="text-2xs font-black w-6">{{ loc.flag }}</span>
          <span>{{ loc.label }}</span>
          <CheckIcon v-if="loc.code === locale" class="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { GlobeAltIcon, CheckIcon } from '@heroicons/vue/24/outline';
import { setLocale, LOCALES } from '@/i18n';

const { t, locale } = useI18n();
const open = ref(false);
const current = computed(() => LOCALES.find((l) => l.code === locale.value) || LOCALES[0]);

function pick(code) {
  setLocale(code);
  open.value = false;
}

function onBlur(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) open.value = false;
}
</script>
