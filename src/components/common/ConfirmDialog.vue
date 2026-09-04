<template>
  <AppModal :modelValue="!!s" @update:modelValue="onClose" :title="s?.title" :maxWidth="440">
    <div v-if="s" class="space-y-4">
      <p class="text-md text-surface-charcoal dark:text-surface-bone">{{ s.message }}</p>
      <div class="flex justify-end gap-2">
        <button class="btn-ghost" @click="answer(false)">{{ s.cancelText }}</button>
        <button :class="s.danger
                  ? 'btn-primary !bg-red-600 hover:!bg-red-700 !text-white'
                  : 'btn-primary'"
                @click="answer(true)">
          {{ s.confirmText }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { computed } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import { confirmState } from '@/composables/useConfirm';

const s = computed(() => confirmState.value);
function answer(v) {
  const st = confirmState.value;
  confirmState.value = null;
  st?.resolve(v);
}
// Modal-outside-close counts as "cancel".
function onClose(v) { if (!v) answer(false); }
</script>
