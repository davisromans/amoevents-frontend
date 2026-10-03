<template>
  <transition name="offline-bar">
    <div v-if="visible" :class="['offline-status-bar', online ? 'offline-status-bar--online' : 'offline-status-bar--offline']" role="status" aria-live="polite">
      <span class="offline-status-dot" aria-hidden="true"></span>
      <span>{{ label }}</span>
      <span v-if="pending && online && !syncing" class="offline-status-pending">{{ pending }} queued</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useOfflineStatus } from '@/composables/useOfflineStatus';

const { online, syncing, pending, justSynced, label } = useOfflineStatus();
const visible = computed(() => !online.value || syncing.value || justSynced.value || pending.value > 0);
</script>

<style scoped>
.offline-status-bar {
  min-height: 34px;
  padding: 7px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .01em;
  text-align: center;
  position: relative;
  z-index: 70;
}
.offline-status-bar--offline { background: #b42318; }
.offline-status-bar--online { background: #16855b; }
.offline-status-dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; box-shadow: 0 0 0 3px rgba(255,255,255,.18); }
.offline-status-pending { opacity: .82; font-weight: 700; }
.offline-bar-enter-active, .offline-bar-leave-active { transition: opacity .2s, transform .2s; }
.offline-bar-enter-from, .offline-bar-leave-to { opacity: 0; transform: translateY(-100%); }
@media (max-width: 540px) { .offline-status-bar { padding-inline: 10px; font-size: 11px; } }
</style>
