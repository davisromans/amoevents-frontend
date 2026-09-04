<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
    <PageHeader title="Event types">
      <template #actions>
        <button class="btn-primary" @click="startNew"><PlusIcon class="w-4 h-4" /> New type</button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>
    <div v-else class="space-y-2">
      <div v-for="t in items" :key="t._id" class="surface-card p-3 flex items-center gap-3">
        <span class="text-2xl">{{ t.icon || '🎉' }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-heading">
            {{ t.label }}
            <span v-if="t.hasChurch" class="ml-2 text-2xs chip">⛪ Church</span>
          </p>
        </div>
        <button class="btn-ghost !text-xs" @click="edit(t)"><PencilSquareIcon class="w-3.5 h-3.5" /></button>
        <button class="text-red-500 hover:text-red-700" @click="remove(t)"><TrashIcon class="w-4 h-4" /></button>
      </div>
    </div>

    <AppModal v-model="editorOpen" :title="editing._id ? 'Edit event type' : 'New event type'" :maxWidth="520">
      <div class="space-y-3">
        <AppInput v-model="editing.label" label="Name" placeholder="Wedding" />
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="editing.icon" label="Icon (emoji)" placeholder="💍" />
          <AppInput v-model.number="editing.sortOrder" label="Sort order" type="number" placeholder="1" />
        </div>
        <AppInput v-model="editing.defaultDressCode" label="Default dress code" placeholder="Formal" />
        <AppInput v-model="editing.defaultHostText" label="Default host text" type="textarea" :rows="3" />
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="editing.hasChurch" class="accent-brand-gold w-4 h-4" />
          <span class="text-heading">Has church / ceremony</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="editorOpen = false">Cancel</button>
          <AppButton :loading="saving" @click="save">Save</AppButton>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { listEventTypes, createEventType, updateEventType, deleteEventType } from '@/services/eventTypes.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import PageHeader from '@/components/layout/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import AppModal from '@/components/common/AppModal.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';

const toast = useToast();
const items = ref([]);
const loading = ref(true);
const editorOpen = ref(false);
const saving = ref(false);
const editing = reactive({ _id: null, slug: '', label: '', icon: '', defaultDressCode: '', defaultHostText: '', hasChurch: false, sortOrder: 10 });

async function refresh() {
  loading.value = true;
  try { items.value = await listEventTypes(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}
function startNew() {
  Object.assign(editing, { _id: null, slug: '', label: '', icon: '', defaultDressCode: '', defaultHostText: '', hasChurch: false, sortOrder: 10 });
  editorOpen.value = true;
}
function edit(t) { Object.assign(editing, t); editorOpen.value = true; }
async function save() {
  saving.value = true;
  try {
    // Slug auto-derived from label; kept stable on edit.
    const slug = editing.slug || editing.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const payload = { slug, label: editing.label, icon: editing.icon,
      defaultDressCode: editing.defaultDressCode, defaultHostText: editing.defaultHostText,
      hasChurch: editing.hasChurch, sortOrder: editing.sortOrder };
    if (editing._id) await updateEventType(editing._id, payload);
    else await createEventType(payload);
    toast.success('Saved');
    editorOpen.value = false;
    await refresh();
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { saving.value = false; }
}
async function remove(t) {
  if (!(await askConfirm(`Delete event type "${t.label}"?`))) return;
  try { await deleteEventType(t._id); await refresh(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}
onMounted(refresh);
</script>
