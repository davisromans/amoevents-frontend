<template>
  <div v-if="visible"
       class="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden pointer-events-none">
    <div class="h-full bg-gradient-gold origin-left transition-transform duration-300 ease-out"
         :style="{ transform: `scaleX(${progress})` }" />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const visible = ref(false);
const progress = ref(0);
let tickTimer = null;
let hideTimer = null;

function start() {
  clearTimeout(hideTimer);
  clearInterval(tickTimer);
  visible.value = true;
  progress.value = 0.08;
  // Fake progress creep so the bar always feels alive, even on slow chunks.
  tickTimer = setInterval(() => {
    if (progress.value < 0.9) progress.value += (0.9 - progress.value) * 0.15;
  }, 200);
}
function done() {
  clearInterval(tickTimer);
  progress.value = 1;
  hideTimer = setTimeout(() => { visible.value = false; progress.value = 0; }, 250);
}

function onEvt(e) { e.detail ? start() : done(); }

onMounted(() => window.addEventListener('app:route-loading', onEvt));
onBeforeUnmount(() => {
  window.removeEventListener('app:route-loading', onEvt);
  clearInterval(tickTimer); clearTimeout(hideTimer);
});
</script>
