<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
    <router-link :to="`/app/events/${route.params.id}`" class="btn-ghost !text-sm !px-2 !py-1 mb-1">
      <ChevronLeftIcon class="w-3.5 h-3.5" /> Back to event
    </router-link>
    <h1 class="section-title text-2xl mb-1">Guest tags</h1>
    <p class="text-subtext mb-5">Group guests by family, church, work — segment your messaging.</p>

    <div v-if="loading" class="flex justify-center py-8"><LoadingSpinner /></div>

    <div v-else class="space-y-3">
      <div v-for="tag in tags" :key="tag._id" class="surface-card p-3 flex items-center gap-3">
        <input
          type="color"
          v-model="tag.color"
          class="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
          @change="save(tag)"
        />
        <input
          v-model="tag.name"
          class="flex-1 bg-transparent text-heading outline-none"
          @change="save(tag)"
        />
        <span class="chip-gold text-2xs" :style="{ background: tag.color + '22', color: tag.color }">
          {{ tag.name }}
        </span>
        <button class="btn-danger !text-sm !py-1.5 !px-3" @click="remove(tag)">
          <TrashIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="surface-inset p-3 flex gap-2">
        <input
          type="color"
          v-model="newTag.color"
          class="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
        />
        <input
          v-model="newTag.name"
          class="flex-1 field-input"
          placeholder="Tag name (e.g. Family)"
          @keydown.enter="add"
        />
        <AppButton :loading="adding" @click="add"><PlusIcon class="w-4 h-4" /> Add</AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute } from 'vue-router';
import { ChevronLeftIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import * as api from '@/services/tags.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppButton from '@/components/common/AppButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const route = useRoute();
const toast = useToast();
const tags = ref([]);
const loading = ref(true);
const adding = ref(false);
const newTag = reactive({ name: '', color: '#C8A24B' });

async function load() {
  try { tags.value = await api.listTags(route.params.id); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

async function add() {
  if (!newTag.name.trim()) return;
  adding.value = true;
  try {
    const tag = await api.createTag(route.params.id, { name: newTag.name.trim(), color: newTag.color });
    tags.value.push(tag);
    newTag.name = '';
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { adding.value = false; }
}

async function save(tag) {
  try { await api.updateTag(route.params.id, tag._id, { name: tag.name, color: tag.color }); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

async function remove(tag) {
  if (!(await askConfirm(`Delete tag "${tag.name}"? It will be removed from all guests.`))) return;
  try {
    await api.deleteTag(route.params.id, tag._id);
    tags.value = tags.value.filter((t) => t._id !== tag._id);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

onMounted(load);
</script>
