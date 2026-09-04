<template>
  <div class="max-w-sm mx-auto">
    <!-- Phone frame with the scanner UI inside -->
    <div class="rounded-[36px] bg-surface-charcoal dark:bg-black p-2.5 shadow-card-lg">
      <div class="rounded-[28px] bg-surface-night overflow-hidden aspect-[9/16] relative">
        <!-- Live camera feed simulation -->
        <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
        <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(circle at 30% 20%, rgba(192,111,239,0.3), transparent 60%);" />

        <!-- Top status bar -->
        <div class="relative flex items-center justify-between px-4 pt-4 text-white/80">
          <span class="text-2xs font-bold">Gate 1 · Live</span>
          <span class="inline-flex items-center gap-1 text-2xs font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
          </span>
        </div>

        <!-- Reticle -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="relative w-48 h-48">
            <div class="absolute inset-0 border-2 border-brand-gold rounded-2xl opacity-70" />
            <div class="absolute inset-4 border border-brand-gold/40 rounded-xl" />
            <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-gold rounded-tl-2xl" />
            <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-gold rounded-tr-2xl" />
            <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-gold rounded-bl-2xl" />
            <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-gold rounded-br-2xl" />
            <!-- Scanning line -->
            <div class="absolute inset-x-4 h-0.5 bg-brand-gold shadow-[0_0_10px_rgba(192,111,239,0.9)] top-1/2" />
          </div>
        </div>

        <!-- Success toast -->
        <div class="absolute bottom-24 inset-x-4 rounded-2xl bg-emerald-500 text-white shadow-lg p-4 flex items-center gap-3 animate-slide-up">
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-md font-black leading-tight">Amara Mwakabuta</p>
            <p class="text-2xs opacity-90 mt-0.5">Table 12 · Seat 4 · +1 guest</p>
          </div>
        </div>

        <!-- Bottom count -->
        <div class="absolute bottom-3 inset-x-3 rounded-xl bg-black/50 backdrop-blur-md p-3 flex items-center justify-between text-white">
          <div>
            <p class="text-2xs uppercase font-black tracking-widest opacity-70">Arrived</p>
            <p class="text-2xl font-black tabular-nums">128<span class="text-sm opacity-70 font-bold"> / 250</span></p>
          </div>
          <div class="w-24 h-2 rounded-full bg-white/20 overflow-hidden">
            <div class="h-full bg-brand-gold rounded-full" style="width: 51%" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
