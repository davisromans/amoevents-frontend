<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { listInbox, inboxConversation, markInboxRead, replyToInbox, replyToInboxTemplate } from '@/services/messaging.service';
import { listWhatsAppTemplates } from '@/services/whatsappTemplates.service';

const route = useRoute();
const eventId = computed(() => route.params.id);
const conversations = ref([]);
const selected = ref(null);
const messages = ref([]);
const search = ref('');
const filter = ref('all');
const draft = ref('');
const loading = ref(false);
const sending = ref(false);
const error = ref('');
const waTemplates = ref([]);
const templateMode = ref(false);
const selectedTemplate = ref('');
const templateLanguage = ref('sw');
const templateParams = ref('');
let pollTimer;

async function loadList() {
  const filters = filter.value === 'unread' ? { unread: 'true' } : (filter.value === 'all' ? {} : { status: filter.value });
  const fresh = await listInbox(eventId.value, search.value, filters);
  conversations.value = fresh;
  if (selected.value) {
    const current = fresh.find((c) => c._id === selected.value._id);
    if (current) selected.value = { ...selected.value, ...current };
  }
  if (!selected.value && conversations.value.length) await openConversation(conversations.value[0]);
}
async function openConversation(item) {
  selected.value = item;
  const data = await inboxConversation(eventId.value, item._id);
  messages.value = data.messages || [];
  await markInboxRead(eventId.value, item._id);
  item.unreadCount = 0;
}
async function sendReply() {
  if (!draft.value.trim() || !selected.value) return;
  sending.value = true; error.value = '';
  try {
    const msg = await replyToInbox(eventId.value, selected.value._id, draft.value.trim());
    messages.value.push(msg); draft.value = '';
    selected.value.lastMessageText = msg.text;
    selected.value.lastMessageAt = msg.receivedAt;
  } catch (e) { error.value = e?.response?.data?.error?.message || e?.response?.data?.error?.code || e.message || 'Reply failed'; }
  finally { sending.value = false; }
}
async function sendTemplateReply() {
  if (!selectedTemplate.value || !selected.value) return;
  sending.value = true; error.value = '';
  try {
    const msg = await replyToInboxTemplate(eventId.value, selected.value._id, { templateName: selectedTemplate.value, language: templateLanguage.value, bodyParams: templateParams.value ? templateParams.value.split('|').map((v) => v.trim()) : [] });
    messages.value.push(msg); templateParams.value = ''; selected.value.lastMessageText = msg.text; selected.value.lastMessageAt = msg.receivedAt;
  } catch (e) { error.value = e?.response?.data?.error?.message || e?.response?.data?.error?.code || e.message || 'Template send failed'; }
  finally { sending.value = false; }
}
function time(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function windowLabel(value) { return value && new Date(value) > new Date() ? `Free reply until ${new Date(value).toLocaleString()}` : 'Template required'; }
const displayMessages = computed(() => {
  const rank = { failed: 5, read: 4, delivered: 3, sent: 2, queued: 1 };
  const result = [];
  for (const message of messages.value) {
    const previous = result[result.length - 1];
    const same = previous && previous.direction === message.direction && previous.text === message.text && Math.abs(new Date(previous.receivedAt) - new Date(message.receivedAt)) < 120000;
    if (same) { if ((rank[message.providerStatus] || 0) > (rank[previous.providerStatus] || 0)) previous.providerStatus = message.providerStatus; continue; }
    result.push({ ...message });
  }
  return result;
});
function ticks(status) { if (status === 'failed') return '×'; if (status === 'read') return '✓✓'; if (status === 'delivered') return '✓✓'; return '✓'; }
function tickClass(status) { return status === 'failed' ? 'text-red-500' : status === 'read' ? 'text-sky-500' : 'text-slate-400'; }
async function pollInbox() {
  try {
    await loadList();
    if (selected.value) {
      const data = await inboxConversation(eventId.value, selected.value._id);
      messages.value = data.messages || [];
    }
  } catch (_) { /* transient network errors are retried on the next poll */ }
}
onMounted(async () => { loading.value = true; try { const data = await listWhatsAppTemplates(); waTemplates.value = data.items || []; await loadList(); pollTimer = window.setInterval(pollInbox, 5000); } finally { loading.value = false; } });
onUnmounted(() => { if (pollTimer) window.clearInterval(pollTimer); });
</script>

<template>
  <div class="h-[calc(100vh-7rem)] min-h-[620px] flex overflow-hidden rounded-2xl border border-surface-line dark:border-surface-line-dark bg-white dark:bg-surface-night shadow-sm">
    <aside class="w-[330px] shrink-0 border-r border-surface-line dark:border-surface-line-dark flex flex-col">
      <div class="p-4 border-b border-surface-line dark:border-surface-line-dark">
        <div class="flex items-center justify-between mb-3"><h1 class="text-lg font-black text-surface-ink dark:text-white">WhatsApp Inbox</h1><span class="text-xs text-surface-slate">This event only</span></div>
        <input v-model="search" @keyup.enter="loadList" class="field-input mb-2" placeholder="Search name or phone…" />
        <div class="flex gap-1.5 overflow-x-auto pb-1">
          <button v-for="item in [{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'sent', label: 'Sent' }, { value: 'delivered', label: 'Delivered' }, { value: 'read', label: 'Read' }, { value: 'failed', label: 'Failed' }]" :key="item.value" @click="filter = item.value; loadList()" class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors" :class="filter === item.value ? 'bg-brand-gold text-surface-ink shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-surface-slate hover:bg-slate-200 dark:hover:bg-slate-700'">{{ item.label }}</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <button v-for="c in conversations" :key="c._id" @click="openConversation(c)" class="w-full text-left px-4 py-3 border-b border-surface-line/70 dark:border-surface-line-dark hover:bg-brand-gold/10" :class="selected?._id === c._id ? 'bg-brand-gold/15' : ''">
          <div class="flex items-center justify-between"><strong class="truncate text-sm text-surface-ink dark:text-white">{{ c.displayName }}</strong><span class="text-[10px] text-surface-slate">{{ time(c.lastMessageAt) }}</span></div>
          <div class="flex items-center justify-between gap-2 mt-1"><span class="truncate text-xs text-surface-slate">{{ c.lastMessageText || c.phone }}</span><span v-if="c.unreadCount" class="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold">{{ c.unreadCount }}</span></div>
        </button>
        <p v-if="!loading && !conversations.length" class="p-6 text-sm text-surface-slate">No conversations for this event yet.</p>
      </div>
    </aside>
    <main class="flex-1 flex flex-col min-w-0">
      <template v-if="selected">
        <header class="px-5 py-4 border-b border-surface-line dark:border-surface-line-dark flex items-center justify-between">
          <div><h2 class="font-black text-surface-ink dark:text-white">{{ selected.displayName }}</h2><p class="text-xs text-surface-slate">{{ selected.phone }}</p></div>
          <span class="text-xs" :class="selected.freeWindowExpiresAt && new Date(selected.freeWindowExpiresAt) > new Date() ? 'text-emerald-600' : 'text-amber-600'">{{ windowLabel(selected.freeWindowExpiresAt) }}</span>
        </header>
        <section class="flex-1 overflow-y-auto p-5 space-y-3 bg-surface-mist/40 dark:bg-surface-night/60">
          <div v-for="m in displayMessages" :key="m._id" class="flex" :class="m.direction === 'outbound' ? 'justify-end' : 'justify-start'"><div class="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm" :class="m.direction === 'outbound' ? 'bg-white dark:bg-surface-ash text-surface-ink dark:text-white rounded-br-sm border border-slate-200 dark:border-slate-700' : 'bg-emerald-50 dark:bg-emerald-950/30 text-surface-ink dark:text-white rounded-bl-sm'"><img v-if="m.mediaUrl" :src="m.mediaUrl" class="max-h-64 rounded-xl mb-2 object-contain" /><img v-if="!m.mediaUrl && m.direction === 'outbound' && selected.cardMediaUrl && m.messageType === 'whatsapp'" :src="selected.cardMediaUrl" class="max-h-64 rounded-xl mb-2 object-contain" /><p class="whitespace-pre-wrap">{{ m.text }}</p><p class="text-[10px] opacity-60 text-right mt-1">{{ time(m.receivedAt) }} <span v-if="m.direction === 'outbound'" :class="tickClass(m.providerStatus)" class="font-black ml-1">{{ ticks(m.providerStatus) }}</span></p></div></div>
        </section>
        <footer class="p-4 border-t border-surface-line dark:border-surface-line-dark"><p v-if="error" class="mb-2 text-xs text-red-600">{{ error }}</p><div class="flex items-center justify-between mb-2"><div class="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"><button class="px-3 py-1 rounded-md text-xs font-bold" :class="!templateMode ? 'bg-white dark:bg-slate-700 shadow' : ''" @click="templateMode = false">Message</button><button class="px-3 py-1 rounded-md text-xs font-bold" :class="templateMode ? 'bg-white dark:bg-slate-700 shadow' : ''" @click="templateMode = true">Template</button></div><span v-if="selected.freeWindowExpiresAt && new Date(selected.freeWindowExpiresAt) <= new Date()" class="text-xs text-amber-600">Template required</span></div><div v-if="templateMode" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 space-y-2"><select v-model="selectedTemplate" class="field-input"><option value="">Choose an approved template…</option><option v-for="t in waTemplates" :key="t.name + t.language" :value="t.name">{{ t.name }} [{{ t.language }}]</option></select><input v-model="templateParams" class="field-input" placeholder="Template values in order, separate with |" /><button @click="sendTemplateReply" :disabled="sending || !selectedTemplate" class="btn-primary w-full">{{ sending ? 'Sending…' : 'Send template' }}</button></div><div v-else class="flex gap-2"><textarea v-model="draft" @keydown.enter.exact.prevent="sendReply" rows="2" class="field-input flex-1 resize-none" placeholder="Type a reply…" /><button @click="sendReply" :disabled="sending || !draft.trim()" class="btn-primary px-5">{{ sending ? 'Sending…' : 'Send' }}</button></div></footer>
      </template>
      <div v-else class="m-auto text-center text-surface-slate"><p class="text-lg font-bold">Select a conversation</p><p class="text-sm mt-1">Messages from other events will never appear here.</p></div>
    </main>
  </div>
</template>
