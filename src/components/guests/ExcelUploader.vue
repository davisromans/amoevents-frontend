<template>
  <div>
    <div
      class="surface-inset p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer"
      :class="dragging
        ? 'border-brand-gold bg-brand-gold-glow'
        : 'border-surface-mist dark:border-surface-fog hover:border-brand-gold'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="$refs.fileEl.click()"
    >
      <ArrowUpTrayIcon class="w-6 h-6 text-brand-gold-deep dark:text-brand-gold-soft mx-auto mb-2" />
      <p class="text-md font-bold text-surface-charcoal dark:text-surface-bone">Drop .xlsx file or click to browse</p>
      <p class="text-xs text-surface-slate dark:text-surface-ash mt-1">Columns: First name, Last name, Phone, WhatsApp, Type, Pledge…</p>
      <input ref="fileEl" type="file" accept=".xlsx,.xlsm" class="hidden" @change="onPick" />
    </div>

    <div v-if="uploading" class="mt-4 flex justify-center"><LoadingSpinner label="Uploading…" /></div>
    <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400 font-medium text-center">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ArrowUpTrayIcon } from '@heroicons/vue/24/outline';
import { previewExcel } from '@/services/excel.service';
import { apiErrorMessage } from '@/services/http';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const props = defineProps({ eventId: { type: String, required: true } });
const emit = defineEmits(['previewed']);

const dragging = ref(false);
const uploading = ref(false);
const error = ref('');

function onDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) upload(file);
}
function onPick(e) {
  const file = e.target.files?.[0];
  if (file) upload(file);
  e.target.value = '';
}

async function upload(file) {
  error.value = '';
  uploading.value = true;
  try {
    const preview = await previewExcel(props.eventId, file);
    emit('previewed', preview);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    uploading.value = false;
  }
}
</script>
