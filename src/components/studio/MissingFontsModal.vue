<template>
  <AppModal :model-value="modelValue" title="Missing PSD fonts" :max-width="620"
            @update:model-value="$emit('update:modelValue', $event)">
    <div class="space-y-4">
      <div class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
        <p class="font-bold">The PSD did not include these font files.</p>
        <p class="mt-1">Upload the matching font to keep the original design, or replace it with Inter. Text stays editable either way.</p>
      </div>

      <div class="rounded-xl border border-surface-mist p-3 dark:border-surface-fog">
        <label class="btn-secondary !py-2 !px-3 !text-xs cursor-pointer inline-flex"
               :class="{ 'pointer-events-none opacity-60': batchUploading || uploadingFamily }">
          {{ batchUploading ? 'Reading font metadata…' : 'Import several font files' }}
          <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" class="hidden"
                 :disabled="batchUploading || !!uploadingFamily" @change="uploadBatch" />
        </label>
        <p class="mt-1.5 text-2xs text-surface-slate dark:text-surface-ash">
          Select a whole font family at once. Names, weights and italic styles are detected automatically.
        </p>
        <p v-if="batchMessage" class="mt-1.5 text-2xs text-emerald-600 dark:text-emerald-400">{{ batchMessage }}</p>
        <p v-if="batchError" class="mt-1.5 whitespace-pre-line text-2xs text-red-600 dark:text-red-400">{{ batchError }}</p>
      </div>

      <div v-for="font in fonts" :key="font.family"
           class="rounded-xl border border-surface-mist p-3 dark:border-surface-fog">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-bold text-sm break-words">{{ font.family }}</p>
            <p class="text-2xs text-surface-slate dark:text-surface-ash">
              {{ font.layerCount }} text layer{{ font.layerCount === 1 ? '' : 's' }}
              <span v-if="font.weight"> · weight {{ font.weight }}</span>
              <span v-if="font.style && font.style !== 'normal'"> · {{ font.style }}</span>
            </p>
          </div>
          <span v-if="uploadingFamily === font.family" class="text-2xs font-bold text-brand-primary">Uploading…</span>
        </div>

        <p v-if="errors[font.family]" class="mt-2 text-2xs"
           :class="savedVariants[font.family] ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'">
          {{ errors[font.family] }}
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button v-if="savedVariants[font.family]" class="btn-primary !py-1.5 !px-3 !text-xs"
                  :disabled="!!uploadingFamily" @click="activate(font)">
            Retry activation
          </button>
          <label class="btn-primary !py-1.5 !px-3 !text-xs cursor-pointer"
                 :class="{ 'pointer-events-none opacity-60': uploadingFamily }">
            {{ savedVariants[font.family] ? 'Choose another file' : `Upload ${font.family}` }}
            <input type="file" accept=".ttf,.otf,.woff,.woff2" class="hidden"
                   :disabled="!!uploadingFamily" @change="upload(font, $event)" />
          </label>
          <button class="btn-secondary !py-1.5 !px-3 !text-xs" :disabled="!!uploadingFamily"
                  @click="$emit('use-default', font.family)">
            Use Inter instead
          </button>
        </div>
      </div>

      <p v-if="!fonts.length" class="text-sm text-center py-4 text-surface-slate dark:text-surface-ash">
        All PSD fonts are resolved.
      </p>
    </div>
  </AppModal>
</template>

<script setup>
import { reactive, ref } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import { uploadFontFiles, uploadFontVariant } from '@/services/fonts.service';
import { apiErrorMessage } from '@/services/http';
import { loadUploadedFontVariant } from '@/utils/fontLoader';

defineProps({
  modelValue: { type: Boolean, default: false },
  fonts: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'uploaded', 'imported', 'use-default']);

const uploadingFamily = ref('');
const errors = reactive({});
const savedVariants = reactive({});
const batchUploading = ref(false);
const batchMessage = ref('');
const batchError = ref('');

async function uploadBatch(event) {
  const files = [...(event.target.files || [])];
  event.target.value = '';
  if (!files.length || batchUploading.value) return;
  batchUploading.value = true;
  batchMessage.value = '';
  batchError.value = '';
  try {
    const result = await uploadFontFiles(files);
    const imported = result.fonts || [];
    const failed = result.failed || [];
    batchMessage.value = `${imported.length} of ${files.length} font file${files.length === 1 ? '' : 's'} imported.`;
    if (failed.length) batchError.value = failed.map((item) => `${item.fileName}: ${item.error}`).join('\n');
    emit('imported', imported);
  } catch (error) {
    batchError.value = apiErrorMessage(error) || 'The selected font files could not be imported.';
  } finally {
    batchUploading.value = false;
  }
}

async function activate(font) {
  const variant = savedVariants[font.family];
  if (!variant || uploadingFamily.value) return;
  uploadingFamily.value = font.family;
  errors[font.family] = '';
  try {
    await loadUploadedFontVariant(font.family, variant);
    delete savedVariants[font.family];
    emit('uploaded', font.family);
  } catch (error) {
    errors[font.family] = `Font is saved, but this browser could not activate it yet: ${error?.message || 'download failed'}.`;
  } finally {
    uploadingFamily.value = '';
  }
}

async function upload(font, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || uploadingFamily.value) return;
  uploadingFamily.value = font.family;
  errors[font.family] = '';
  try {
    const uploaded = await uploadFontVariant(file, { family: font.family });
    const detected = uploaded.detectedMetadata || {};
    const variant = (uploaded.variants || []).find((item) =>
      Number(item.weight) === Number(detected.weight) && item.style === detected.style)
      || uploaded.variants?.at(-1);
    if (!variant) throw new Error('The server saved the font without a matching variant.');
    savedVariants[font.family] = variant;
    try {
      await loadUploadedFontVariant(font.family, variant);
    } catch (error) {
      errors[font.family] = `Font uploaded successfully, but this browser could not activate it yet: ${error?.message || 'download failed'}.`;
      return;
    }
    delete savedVariants[font.family];
    emit('uploaded', font.family);
  } catch (error) {
    errors[font.family] = apiErrorMessage(error) || 'This font could not be uploaded.';
  } finally {
    uploadingFamily.value = '';
  }
}
</script>
