<template>
  <AppModal :model-value="modelValue" title="Missing PSD fonts" :max-width="620"
            @update:model-value="$emit('update:modelValue', $event)">
    <div class="space-y-4">
      <div class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
        <p class="font-bold">The PSD did not include these font files.</p>
        <p class="mt-1">Upload the matching font to keep the original design, or replace it with Inter. Text stays editable either way.</p>
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

        <p v-if="errors[font.family]" class="mt-2 text-2xs text-red-600 dark:text-red-400">{{ errors[font.family] }}</p>

        <div class="mt-3 flex flex-wrap gap-2">
          <label class="btn-primary !py-1.5 !px-3 !text-xs cursor-pointer"
                 :class="{ 'pointer-events-none opacity-60': uploadingFamily }">
            Upload {{ font.family }}
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
import { uploadFontVariant } from '@/services/fonts.service';
import { loadUploadedFontVariant } from '@/utils/fontLoader';

defineProps({
  modelValue: { type: Boolean, default: false },
  fonts: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'uploaded', 'use-default']);

const uploadingFamily = ref('');
const errors = reactive({});

async function upload(font, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || uploadingFamily.value) return;
  uploadingFamily.value = font.family;
  errors[font.family] = '';
  try {
    const uploaded = await uploadFontVariant(file, {
      family: font.family,
      weight: font.weight || 400,
      style: font.style || 'normal',
    });
    const variant = (uploaded.variants || []).find((item) =>
      Number(item.weight) === Number(font.weight || 400) && item.style === (font.style || 'normal'))
      || uploaded.variants?.at(-1);
    if (variant) await loadUploadedFontVariant(font.family, variant);
    emit('uploaded', font.family);
  } catch (error) {
    errors[font.family] = error?.response?.data?.message || error?.message || 'This font could not be uploaded.';
  } finally {
    uploadingFamily.value = '';
  }
}
</script>
