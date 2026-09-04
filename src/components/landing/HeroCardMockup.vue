<template>
  <div class="relative w-full max-w-md mx-auto">
    <!-- Ambient glow behind the whole composition -->
    <div class="absolute -inset-8 bg-brand-gold-glow blur-3xl opacity-60 pointer-events-none" aria-hidden="true" />

    <!-- Back card: floats slightly behind, tilted, hints at scale -->
    <div class="absolute inset-0 rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card-lg -rotate-6 translate-x-4 translate-y-6 opacity-70" aria-hidden="true" />

    <!-- Front invitation card -->
    <div class="relative rounded-3xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card-lg overflow-hidden animate-slide-up">
      <!-- Gradient header band -->
      <div class="h-24 bg-gradient-gold relative overflow-hidden">
        <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 20% 40%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.3) 0%, transparent 50%);" aria-hidden="true" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="px-6 py-5 space-y-4">
        <div class="text-center">
          <p class="text-2xs uppercase font-black tracking-widest text-brand-gold-deep dark:text-brand-gold-soft">You are invited</p>
          <h4 class="text-2xl font-black text-surface-charcoal dark:text-surface-bone mt-1">Amara &amp; Kito</h4>
          <p class="text-xs text-surface-slate dark:text-surface-ash mt-1">Saturday · 14 September · 4:00 PM</p>
        </div>

        <!-- QR-code-style block -->
        <div class="relative mx-auto w-28 h-28 rounded-xl bg-surface-cream dark:bg-surface-night border border-surface-mist dark:border-surface-fog p-2">
          <svg viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
            <!-- Simplified QR pattern -->
            <g fill="currentColor" class="text-surface-charcoal dark:text-surface-bone">
              <!-- Corner markers -->
              <rect x="4" y="4" width="20" height="20" rx="2" />
              <rect x="8" y="8" width="12" height="12" rx="1" fill="white" class="dark:fill-surface-coal" />
              <rect x="11" y="11" width="6" height="6" rx="1" />
              <rect x="76" y="4" width="20" height="20" rx="2" />
              <rect x="80" y="8" width="12" height="12" rx="1" fill="white" class="dark:fill-surface-coal" />
              <rect x="83" y="11" width="6" height="6" rx="1" />
              <rect x="4" y="76" width="20" height="20" rx="2" />
              <rect x="8" y="80" width="12" height="12" rx="1" fill="white" class="dark:fill-surface-coal" />
              <rect x="11" y="83" width="6" height="6" rx="1" />
              <!-- Body dots -->
              <g>
                <rect x="30" y="8" width="4" height="4" /><rect x="38" y="8" width="4" height="4" /><rect x="50" y="8" width="4" height="4" /><rect x="62" y="8" width="4" height="4" />
                <rect x="34" y="16" width="4" height="4" /><rect x="46" y="16" width="4" height="4" /><rect x="58" y="16" width="4" height="4" /><rect x="66" y="16" width="4" height="4" />
                <rect x="8" y="30" width="4" height="4" /><rect x="16" y="30" width="4" height="4" /><rect x="28" y="30" width="4" height="4" /><rect x="40" y="30" width="4" height="4" /><rect x="52" y="30" width="4" height="4" /><rect x="60" y="30" width="4" height="4" /><rect x="72" y="30" width="4" height="4" /><rect x="84" y="30" width="4" height="4" /><rect x="92" y="30" width="4" height="4" />
                <rect x="12" y="38" width="4" height="4" /><rect x="24" y="38" width="4" height="4" /><rect x="32" y="38" width="4" height="4" /><rect x="44" y="38" width="4" height="4" /><rect x="56" y="38" width="4" height="4" /><rect x="68" y="38" width="4" height="4" /><rect x="76" y="38" width="4" height="4" /><rect x="88" y="38" width="4" height="4" />
                <rect x="8" y="46" width="4" height="4" /><rect x="20" y="46" width="4" height="4" /><rect x="36" y="46" width="4" height="4" /><rect x="48" y="46" width="4" height="4" /><rect x="64" y="46" width="4" height="4" /><rect x="80" y="46" width="4" height="4" /><rect x="92" y="46" width="4" height="4" />
                <rect x="16" y="54" width="4" height="4" /><rect x="28" y="54" width="4" height="4" /><rect x="40" y="54" width="4" height="4" /><rect x="52" y="54" width="4" height="4" /><rect x="72" y="54" width="4" height="4" /><rect x="84" y="54" width="4" height="4" />
                <rect x="8" y="62" width="4" height="4" /><rect x="32" y="62" width="4" height="4" /><rect x="44" y="62" width="4" height="4" /><rect x="60" y="62" width="4" height="4" /><rect x="76" y="62" width="4" height="4" /><rect x="88" y="62" width="4" height="4" /><rect x="96" y="62" width="4" height="4" />
                <rect x="30" y="76" width="4" height="4" /><rect x="42" y="76" width="4" height="4" /><rect x="54" y="76" width="4" height="4" /><rect x="66" y="76" width="4" height="4" />
                <rect x="34" y="84" width="4" height="4" /><rect x="46" y="84" width="4" height="4" /><rect x="58" y="84" width="4" height="4" /><rect x="70" y="84" width="4" height="4" />
                <rect x="30" y="92" width="4" height="4" /><rect x="42" y="92" width="4" height="4" /><rect x="54" y="92" width="4" height="4" /><rect x="66" y="92" width="4" height="4" />
              </g>
              <!-- Center logo circle -->
              <circle cx="50" cy="50" r="8" fill="url(#heroGoldGrad)" />
              <circle cx="50" cy="50" r="7" fill="none" stroke="white" stroke-width="1.5" class="dark:stroke-surface-coal" />
            </g>
            <defs>
              <linearGradient id="heroGoldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#D084FF" />
                <stop offset="100%" stop-color="#9B59B6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div class="text-center pt-1 border-t border-surface-mist dark:border-surface-fog pt-3">
          <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">Table 12 · Seat 4</p>
        </div>
      </div>
    </div>

    <!-- Floating "checked in" chip -->
    <div class="absolute -right-2 -bottom-2 sm:-right-6 sm:-bottom-4 rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card px-3 py-2 flex items-center gap-2 animate-slide-up" style="animation-delay: 200ms; animation-fill-mode: backwards;">
      <span class="relative flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>
      <div>
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash leading-tight">Arrived</p>
        <p class="text-xs font-bold text-surface-charcoal dark:text-surface-bone leading-tight">Amara · Table 12</p>
      </div>
    </div>

    <!-- Floating WhatsApp bubble on top-left -->
    <div class="absolute -left-2 top-8 sm:-left-8 rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card p-3 max-w-[180px] animate-slide-up hidden sm:block" style="animation-delay: 400ms; animation-fill-mode: backwards;">
      <div class="flex items-start gap-2">
        <div class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z"/></svg>
        </div>
        <div class="min-w-0">
          <p class="text-2xs uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 leading-tight">WhatsApp</p>
          <p class="text-xs text-surface-charcoal dark:text-surface-bone mt-0.5 leading-snug">Karibu Amara — invitation delivered ✓</p>
        </div>
      </div>
    </div>
  </div>
</template>
