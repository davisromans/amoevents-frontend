<template>
  <div class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog shadow-card-lg overflow-hidden">
    <div class="flex items-center gap-1.5 px-4 py-3 border-b border-surface-mist dark:border-surface-fog">
      <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
      <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
      <span class="w-2.5 h-2.5 rounded-full bg-surface-mist dark:bg-surface-fog" />
      <span class="ml-3 text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash">Guest list · Amara &amp; Kito</span>
    </div>

    <div class="px-4 py-3 flex items-center justify-between border-b border-surface-mist dark:border-surface-fog">
      <div class="flex items-center gap-2 text-xs">
        <span class="chip-gold !text-2xs">RSVP: 128 yes</span>
        <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-cream dark:bg-surface-night text-surface-slate dark:text-surface-ash">142 total</span>
      </div>
      <div class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xs font-bold">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 13l4 4L19 7"/></svg>
        Excel synced
      </div>
    </div>

    <div class="divide-y divide-surface-mist dark:divide-surface-fog">
      <div v-for="g in GUESTS" :key="g.name" class="flex items-center gap-3 px-4 py-2.5">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-2xs font-black shrink-0"
             :style="{ background: g.color }">{{ initials(g.name) }}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-surface-charcoal dark:text-surface-bone truncate">{{ g.name }}</p>
          <p class="text-2xs text-surface-slate dark:text-surface-ash">{{ g.phone }}</p>
        </div>
        <span class="text-2xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              :class="{
                'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': g.status === 'yes',
                'bg-amber-500/15 text-amber-600 dark:text-amber-400': g.status === 'maybe',
                'bg-surface-mist dark:bg-surface-fog text-surface-slate dark:text-surface-ash': g.status === 'pending',
              }">
          {{ g.status === 'yes' ? '✓ Yes' : g.status === 'maybe' ? '~ Maybe' : 'Pending' }}
        </span>
        <div v-if="g.channel" class="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
             :class="g.channel === 'wa' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-blue-500/15 text-blue-500'">
          <svg v-if="g.channel === 'wa'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z"/></svg>
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4z"/></svg>
        </div>
      </div>
    </div>

    <div class="px-4 py-3 border-t border-surface-mist dark:border-surface-fog flex items-center justify-between bg-surface-cream dark:bg-surface-night">
      <span class="text-2xs text-surface-slate dark:text-surface-ash">+ 128 more · scroll</span>
      <button class="text-2xs font-bold text-brand-gold-deep dark:text-brand-gold-soft">Send WhatsApp reminders →</button>
    </div>
  </div>
</template>

<script setup>
const GUESTS = [
  { name: 'Neema Mushi',      phone: '+255 754 · 12 45', status: 'yes',     channel: 'wa', color: 'linear-gradient(135deg,#D084FF,#9B59B6)' },
  { name: 'Baraka Kimario',   phone: '+255 715 · 98 21', status: 'yes',     channel: 'wa', color: 'linear-gradient(135deg,#FFB86B,#E5722F)' },
  { name: 'Zaituni Hamis',    phone: '+255 787 · 44 09', status: 'maybe',   channel: 'sms',color: 'linear-gradient(135deg,#79E0B3,#2FA675)' },
  { name: 'Elias Mrindoko',   phone: '+255 622 · 55 12', status: 'pending', channel: 'wa', color: 'linear-gradient(135deg,#7CC5FF,#3B7BD9)' },
  { name: 'Grace Nyerere',    phone: '+255 754 · 30 77', status: 'yes',     channel: 'wa', color: 'linear-gradient(135deg,#FFB0D4,#D9457A)' },
];

function initials(n) { return n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }
</script>
