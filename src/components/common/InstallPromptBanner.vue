<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300"
      leave-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="shouldPrompt && !dismissed && !iOSGuideOpen"
           class="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-50 surface-card p-4 shadow-card-lg animate-slide-up">
        <div class="flex items-start gap-3">
          <img src="/icon-192.png" alt="" class="w-10 h-10 rounded-xl shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-md font-black text-surface-charcoal dark:text-surface-bone">Install {{ brand.name }}</p>
            <p class="text-xs text-surface-slate dark:text-surface-ash">Add to your home screen for one-tap access.</p>
          </div>
          <button class="btn-ghost !p-1" @click="close" aria-label="Dismiss">
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="flex gap-2 mt-3">
          <button v-if="canPromptNative" class="btn-primary !text-sm flex-1 justify-center" @click="doInstall">
            <ArrowDownTrayIcon class="w-4 h-4" /> Install
          </button>
          <button v-else-if="isIOS" class="btn-primary !text-sm flex-1 justify-center" @click="iOSGuideOpen = true">
            <ArrowDownTrayIcon class="w-4 h-4" /> How to install
          </button>
          <button class="btn-secondary !text-sm" @click="close">Later</button>
        </div>
      </div>
    </Transition>

    <!-- iOS "Add to Home Screen" guide -->
    <Transition
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="iOSGuideOpen" class="fixed inset-0 z-[900] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-surface-charcoal/50 backdrop-blur-sm" @click="iOSGuideOpen = false" />
        <div class="relative w-full max-w-sm surface-card p-6 animate-scale-in">
          <button class="btn-ghost !p-1 absolute top-3 right-3" @click="iOSGuideOpen = false" aria-label="Close">
            <XMarkIcon class="w-4 h-4" />
          </button>
          <img src="/icon-192.png" alt="" class="w-14 h-14 rounded-2xl mx-auto mb-3" />
          <h3 class="text-lg font-black text-center text-surface-charcoal dark:text-surface-bone mb-1">Add to Home Screen</h3>

          <!-- Browser tabs — auto-selects based on UA -->
          <div class="flex gap-1 p-1 rounded-2xl surface-inset mb-4">
            <button class="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                    :class="iOSTab === 'safari'
                      ? 'bg-gradient-gold text-surface-charcoal shadow-gold-soft'
                      : 'text-surface-slate dark:text-surface-ash'"
                    @click="iOSTab = 'safari'">Safari</button>
            <button class="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                    :class="iOSTab === 'chrome'
                      ? 'bg-gradient-gold text-surface-charcoal shadow-gold-soft'
                      : 'text-surface-slate dark:text-surface-ash'"
                    @click="iOSTab = 'chrome'">Chrome</button>
          </div>

          <ol v-if="iOSTab === 'safari'" class="space-y-3 text-md text-surface-charcoal dark:text-surface-bone">
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">1</span>
              <span>Tap the <strong>Share</strong> button <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-surface-mist dark:bg-surface-fog text-2xs">⬆︎</span> at the <strong>bottom</strong> of the screen.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">2</span>
              <span>Scroll and tap <strong>Add to Home Screen</strong>.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">3</span>
              <span>Tap <strong>Add</strong>. The {{ brand.name }} icon lands on your home screen.</span>
            </li>
          </ol>

          <ol v-else class="space-y-3 text-md text-surface-charcoal dark:text-surface-bone">
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">1</span>
              <span>Tap the <strong>Share</strong> button <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-surface-mist dark:bg-surface-fog text-2xs">⬆︎</span> at the <strong>top-right</strong> of the address bar.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">2</span>
              <span>Scroll and tap <strong>Add to Home Screen</strong>.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="chip-gold shrink-0">3</span>
              <span>Tap <strong>Add</strong>. The {{ brand.name }} icon lands on your home screen.</span>
            </li>
          </ol>

          <button class="btn-primary w-full justify-center mt-5" @click="iOSGuideOpen = false">Got it</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import { useBrand } from '@/composables/useBrand';
const { brand } = useBrand();

const { shouldPrompt, canPromptNative, isIOS, isIOSChrome, install, dismiss } = useInstallPrompt();
const dismissed = ref(false);
const iOSGuideOpen = ref(false);
const iOSTab = ref(isIOSChrome.value ? 'chrome' : 'safari');

async function doInstall() {
  const res = await install();
  if (res.ok) dismissed.value = true;
}
function close() {
  dismiss();
  dismissed.value = true;
}
</script>
