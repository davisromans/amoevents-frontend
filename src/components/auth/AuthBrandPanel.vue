<template>
  <div class="relative h-full overflow-hidden">
    <!-- Ambient purple glow layers — three offset radial washes so the
         gradient feels physical, not painted. -->
    <div class="absolute inset-0" style="background: radial-gradient(ellipse at 15% 20%, rgba(208,132,255,0.28), transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(155,89,182,0.35), transparent 60%), linear-gradient(180deg, #12091E 0%, #0B0714 100%);" />

    <!-- Faint grid mesh, adds texture without competing with type. -->
    <div class="absolute inset-0 opacity-[0.04]" aria-hidden="true"
         style="background-image: linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 48px 48px;" />

    <div class="relative h-full flex flex-col p-10 lg:p-14 xl:p-16">
      <!-- Brand mark, small — the form panel already has the logo. -->
      <div class="inline-flex items-center gap-2.5 text-white shrink-0">
        <img src="/logo.png" alt="" class="w-6 h-6 rounded-md" />
        <span class="font-black text-md">Amo Events</span>
      </div>

      <!-- Rotating statement. Big, editorial, one clear sentence at a time. -->
      <div class="flex-1 flex flex-col justify-center py-10">
        <transition
          mode="out-in"
          enter-active-class="transition duration-slow ease-out"
          leave-active-class="transition duration-fast ease-out"
          enter-from-class="opacity-0 translate-y-3" leave-to-class="opacity-0 -translate-y-3"
        >
          <div :key="current">
            <p class="text-2xs uppercase font-black tracking-widest text-white/50">{{ STATEMENTS[current].eyebrow }}</p>
            <h2 class="mt-4 text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.1] max-w-lg">
              {{ STATEMENTS[current].line1 }}<br />
              <span class="bg-gradient-to-r from-brand-primary-soft to-brand-primary bg-clip-text text-transparent">{{ STATEMENTS[current].line2 }}</span>
            </h2>
            <p class="mt-5 text-lg text-white/70 max-w-md leading-relaxed">{{ STATEMENTS[current].body }}</p>
          </div>
        </transition>

        <!-- Progress dots for the rotating statements. -->
        <div class="mt-10 flex items-center gap-1.5">
          <button v-for="(_, i) in STATEMENTS" :key="i" type="button"
                  :aria-label="`Slide ${i + 1}`"
                  :class="['h-1 rounded-full transition-all duration-slow',
                           i === current ? 'w-8 bg-brand-primary' : 'w-1.5 bg-white/25 hover:bg-white/40']"
                  @click="current = i" />
        </div>
      </div>

      <!-- Stat strip — three understated numbers. -->
      <div class="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 shrink-0">
        <div v-for="s in STATS" :key="s.label">
          <p class="text-2xl font-black text-white tabular-nums">{{ s.value }}</p>
          <p class="text-2xs uppercase font-bold tracking-widest text-white/50 mt-1">{{ s.label }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

// Editorial one-liners — rotated every 6s. Kept event-domain-specific
// so someone reading them mid-signup gets a concrete sense of what the
// product does, not marketing air.
const STATEMENTS = [
  { eyebrow: 'One dashboard',      line1: 'Every wedding.',     line2: 'Every guest.',      body: 'Invitations, RSVPs, gate scanning, gallery — one workspace for the whole event.' },
  { eyebrow: 'From save-the-date', line1: 'Save-the-date',      line2: 'to thank-you.',     body: 'Automated cascades run WhatsApp and SMS on your schedule. Guests hear from you, not from a spreadsheet.' },
  { eyebrow: 'At the gate',        line1: 'Scan in a second.',  line2: 'Zero queues.',      body: 'Any phone becomes a professional scanner. Live arrivals sync across every gate.' },
  { eyebrow: 'After the party',    line1: 'Every photo.',        line2: 'Preserved.',        body: 'Guest uploads, video from the whole night — stored for years, ready to share.' },
];

import { fetchPublicStats } from '@/services/publicStats.service';

const STATS = ref([
  { value: '—',     label: 'Events run' },
  { value: '—',     label: 'Guests invited' },
  { value: '4 min', label: 'Avg. setup' },
]);

const current = ref(0);
let timer = null;
onMounted(async () => {
  timer = setInterval(() => { current.value = (current.value + 1) % STATEMENTS.length; }, 6000);
  const s = await fetchPublicStats();
  STATS.value = [
    { value: fmt(s.displayEvents), label: 'Events run' },
    { value: fmt(s.displayGuests), label: 'Guests invited' },
    { value: '4 min',              label: 'Avg. setup' },
  ];
});
onBeforeUnmount(() => clearInterval(timer));
function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000)      return `${Math.round(v / 100) / 10}k`.replace('.0k', 'k');
  return `${v}+`;
}
</script>
