<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import {
  listInbox,
  inboxConversation,
  markInboxRead,
  replyToInbox,
  replyToInboxTemplate,
} from '@/services/messaging.service';
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
const loadingMessages = ref(false);
const sending = ref(false);
const error = ref('');
const waTemplates = ref([]);
const templateMode = ref(false);
const selectedTemplateKey = ref('');
const templateParams = ref('');
const messagePane = ref(null);
let pollTimer;
let searchTimer;

const filters = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
];

const selectedTemplate = computed(() => waTemplates.value.find(
  (item) => `${item.name}::${item.language}` === selectedTemplateKey.value,
));
const replyWindowOpen = computed(() => Boolean(
  selected.value?.freeWindowExpiresAt
  && new Date(selected.value.freeWindowExpiresAt) > new Date(),
));

function isDesktop() { return window.matchMedia('(min-width: 768px)').matches; }

async function scrollToBottom(behavior = 'auto') {
  await nextTick();
  if (messagePane.value) messagePane.value.scrollTo({ top: messagePane.value.scrollHeight, behavior });
}

async function loadList() {
  const query = filter.value === 'unread'
    ? { unread: 'true' }
    : (filter.value === 'all' ? {} : { status: filter.value });
  const fresh = await listInbox(eventId.value, search.value, query);
  conversations.value = fresh;
  if (selected.value) {
    const current = fresh.find((conversation) => conversation._id === selected.value._id);
    if (current) selected.value = { ...selected.value, ...current };
  }
  if (!selected.value && conversations.value.length && isDesktop()) {
    await openConversation(conversations.value[0]);
  }
}

async function refreshSelected({ scroll = false } = {}) {
  if (!selected.value) return;
  const conversationId = selected.value._id;
  const data = await inboxConversation(eventId.value, conversationId);
  if (selected.value?._id !== conversationId) return;
  messages.value = data.messages || [];
  selected.value = { ...selected.value, ...(data.conversation || {}) };
  if (scroll) await scrollToBottom();
}

async function openConversation(item) {
  selected.value = item;
  messages.value = [];
  error.value = '';
  loadingMessages.value = true;
  try {
    await refreshSelected({ scroll: true });
    await markInboxRead(eventId.value, item._id);
    item.unreadCount = 0;
    if (!replyWindowOpen.value) templateMode.value = true;
  } finally {
    loadingMessages.value = false;
  }
}

function closeConversation() {
  selected.value = null;
  messages.value = [];
  error.value = '';
}

function errorMessage(exception, fallback) {
  return exception?.response?.data?.error?.message
    || exception?.response?.data?.error?.code
    || exception?.message
    || fallback;
}

async function reconcileTimedOutReply(text, startedAt) {
  try {
    await refreshSelected({ scroll: true });
    return messages.value.some((message) => (
      message.direction === 'outbound'
      && message.text === text
      && new Date(message.receivedAt).getTime() >= startedAt - 5000
    ));
  } catch (_) {
    return false;
  }
}

async function sendReply() {
  const text = draft.value.trim();
  if (!text || !selected.value || sending.value) return;
  sending.value = true;
  error.value = '';
  const startedAt = Date.now();
  try {
    const message = await replyToInbox(eventId.value, selected.value._id, text);
    if (!messages.value.some((item) => item._id === message._id)) messages.value.push(message);
    draft.value = '';
    selected.value.lastMessageText = message.text;
    selected.value.lastMessageAt = message.receivedAt;
    await scrollToBottom('smooth');
  } catch (exception) {
    const timedOut = exception?.code === 'ECONNABORTED' || /timeout/i.test(exception?.message || '');
    if (timedOut && await reconcileTimedOutReply(text, startedAt)) {
      draft.value = '';
    } else if (timedOut) {
      error.value = 'Infobip is still responding. The inbox will verify the result automatically—do not send the same reply again yet.';
    } else {
      error.value = errorMessage(exception, 'Reply failed');
    }
  } finally {
    sending.value = false;
  }
}

async function sendTemplateReply() {
  if (!selectedTemplate.value || !selected.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    const message = await replyToInboxTemplate(eventId.value, selected.value._id, {
      templateName: selectedTemplate.value.name,
      language: selectedTemplate.value.language,
      bodyParams: templateParams.value
        ? templateParams.value.split('|').map((value) => value.trim())
        : [],
    });
    if (!messages.value.some((item) => item._id === message._id)) messages.value.push(message);
    templateParams.value = '';
    selected.value.lastMessageText = message.text;
    selected.value.lastMessageAt = message.receivedAt;
    await scrollToBottom('smooth');
  } catch (exception) {
    error.value = errorMessage(exception, 'Template send failed');
  } finally {
    sending.value = false;
  }
}

function fullTime(value) {
  return value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(value))
    : '';
}

function messageTime(value) {
  return value
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : '';
}

function listTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((today - messageDay) / 86400000);
  if (dayDifference === 0) return messageTime(value);
  if (dayDifference === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: '2-digit' } : {}),
  }).format(date);
}

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function windowLabel(value) {
  return value && new Date(value) > new Date()
    ? `Free reply until ${fullTime(value)}`
    : 'Template required';
}

const displayMessages = computed(() => {
  const rank = { failed: 5, read: 4, delivered: 3, sent: 2, queued: 1 };
  const deduplicated = [];
  for (const message of messages.value) {
    const previous = deduplicated[deduplicated.length - 1];
    const same = previous
      && previous.direction === message.direction
      && previous.text === message.text
      && Math.abs(new Date(previous.receivedAt) - new Date(message.receivedAt)) < 120000;
    if (same) {
      if ((rank[message.providerStatus] || 0) > (rank[previous.providerStatus] || 0)) {
        previous.providerStatus = message.providerStatus;
      }
      continue;
    }
    deduplicated.push({ ...message });
  }
  let previousDay = '';
  return deduplicated.map((message) => {
    const day = new Date(message.receivedAt).toDateString();
    const showDate = day !== previousDay;
    previousDay = day;
    return { ...message, showDate, dateLabel: dateLabel(message.receivedAt) };
  });
});

function ticks(status) {
  if (status === 'failed') return '×';
  if (status === 'read' || status === 'delivered') return '✓✓';
  return '✓';
}

function tickClass(status) {
  if (status === 'failed') return 'text-red-500';
  if (status === 'read') return 'text-sky-400';
  return 'text-slate-400 dark:text-slate-300';
}

async function pollInbox() {
  try {
    await loadList();
    if (selected.value) await refreshSelected();
  } catch (_) { /* the next poll retries transient network failures */ }
}

watch(search, () => {
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => loadList().catch(() => {}), 300);
});

onMounted(async () => {
  loading.value = true;
  try {
    const data = await listWhatsAppTemplates();
    waTemplates.value = data.items || [];
    await loadList();
    pollTimer = window.setInterval(pollInbox, 5000);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (searchTimer) window.clearTimeout(searchTimer);
});
</script>

<template>
  <div class="inbox-shell h-[calc(100vh-7rem)] min-h-[620px] overflow-hidden rounded-2xl bg-[#f7f8fa] shadow-sm ring-1 ring-black/5 dark:bg-[#0b1115] dark:ring-white/5">
    <aside
      class="h-full w-full shrink-0 flex-col bg-white/95 md:w-[360px] md:border-r md:border-slate-200/60 dark:bg-[#11181d] dark:md:border-white/[0.06]"
      :class="selected ? 'hidden md:flex' : 'flex'"
    >
      <div class="px-4 pb-3 pt-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">This event only</p>
            <h1 class="mt-0.5 text-xl font-black text-slate-900 dark:text-slate-50">WhatsApp Inbox</h1>
          </div>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
            {{ conversations.length }}
          </span>
        </div>

        <label class="relative block">
          <MagnifyingGlassIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="search"
            class="w-full rounded-xl border-0 bg-slate-100 py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-emerald-400/60 dark:bg-white/[0.06] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:bg-white/[0.08]"
            placeholder="Search name or phone…"
          />
          <button v-if="search" type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10" @click="search = ''">
            <XMarkIcon class="h-4 w-4" />
          </button>
        </label>

        <div class="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="item in filters"
            :key="item.value"
            type="button"
            class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition"
            :class="filter === item.value
              ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-[#07120e]'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10'"
            @click="filter = item.value; loadList()"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-2">
        <button
          v-for="conversation in conversations"
          :key="conversation._id"
          type="button"
          class="my-1 w-full rounded-xl px-3 py-3 text-left transition"
          :class="selected?._id === conversation._id
            ? 'bg-emerald-50 dark:bg-emerald-500/10'
            : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'"
          @click="openConversation(conversation)"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-3">
                <strong class="truncate text-[13px] font-extrabold text-slate-900 dark:text-slate-50">{{ conversation.displayName }}</strong>
                <span class="shrink-0 text-[10px] font-medium text-slate-400" :title="fullTime(conversation.lastMessageAt)">{{ listTime(conversation.lastMessageAt) }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span class="truncate text-xs text-slate-500 dark:text-slate-400">{{ conversation.lastMessageText || conversation.phone }}</span>
                <span class="flex shrink-0 items-center gap-1.5">
                  <span v-if="conversation.lastMessageType === 'template' && conversation.lastMessageMediaUrl" class="text-xs text-slate-400">▧</span>
                  <span v-if="conversation.lastMessageStatus" :class="tickClass(conversation.lastMessageStatus)" class="text-sm font-black leading-none">{{ ticks(conversation.lastMessageStatus) }}</span>
                  <span v-if="conversation.unreadCount" class="min-w-5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white dark:text-[#07120e]">{{ conversation.unreadCount }}</span>
                </span>
              </div>
            </div>
          </div>
        </button>

        <div v-if="loading" class="px-4 py-8 text-center text-sm text-slate-400">Loading conversations…</div>
        <div v-else-if="!conversations.length" class="px-5 py-12 text-center">
          <ChatBubbleLeftRightIcon class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
          <p class="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">No conversations found</p>
          <p class="mt-1 text-xs text-slate-400">Replies for this event will appear here.</p>
        </div>
      </div>
    </aside>

    <main class="h-full min-w-0 flex-1 flex-col" :class="selected ? 'flex' : 'hidden md:flex'">
      <template v-if="selected">
        <header class="flex min-h-[68px] items-center justify-between gap-3 bg-white/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.06)] dark:bg-[#11181d] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)] md:px-5">
          <div class="flex min-w-0 items-center gap-2.5">
            <button type="button" class="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] md:hidden" aria-label="Back to conversations" @click="closeConversation">
              <ArrowLeftIcon class="h-5 w-5" />
            </button>
            <div class="min-w-0">
              <h2 class="truncate text-sm font-black text-slate-900 dark:text-slate-50 md:text-base">{{ selected.displayName }}</h2>
              <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ selected.phone }}</p>
            </div>
          </div>
          <span
            class="hidden shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold sm:inline-flex"
            :class="replyWindowOpen
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'"
          >
            {{ windowLabel(selected.freeWindowExpiresAt) }}
          </span>
        </header>

        <section ref="messagePane" class="chat-canvas flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <div v-if="loadingMessages" class="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading messages…</div>
          <template v-else>
            <template v-for="message in displayMessages" :key="message._id">
              <div v-if="message.showDate" class="my-4 flex justify-center">
                <span class="rounded-lg bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur dark:bg-[#182229]/90 dark:text-slate-300">{{ message.dateLabel }}</span>
              </div>
              <div class="mb-1.5 flex" :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'">
                <div
                  class="message-bubble max-w-[88%] px-3 py-2 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%]"
                  :class="message.direction === 'outbound' ? 'message-bubble--outbound' : 'message-bubble--inbound'"
                >
                  <img v-if="message.mediaUrl" :src="message.mediaUrl" class="mb-2 max-h-72 w-full rounded-lg object-contain" alt="Message attachment" />
                  <p class="whitespace-pre-wrap break-words">{{ message.text }}</p>
                  <p class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60" :title="fullTime(message.receivedAt)">
                    {{ messageTime(message.receivedAt) }}
                    <span v-if="message.direction === 'outbound'" :class="tickClass(message.providerStatus)" class="font-black">{{ ticks(message.providerStatus) }}</span>
                  </p>
                </div>
              </div>
            </template>
            <div v-if="!displayMessages.length" class="flex h-full items-center justify-center text-center">
              <div>
                <ChatBubbleLeftRightIcon class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
                <p class="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">No messages in this conversation yet</p>
              </div>
            </div>
          </template>
        </section>

        <footer class="bg-white/95 px-3 py-3 shadow-[0_-1px_0_rgba(15,23,42,0.06)] dark:bg-[#11181d] dark:shadow-[0_-1px_0_rgba(255,255,255,0.05)] md:px-4">
          <p v-if="error" class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-400/10 dark:text-red-300">{{ error }}</p>

          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-bold transition"
                :class="!templateMode ? 'bg-white text-slate-900 shadow-sm dark:bg-[#26323a] dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                :disabled="!replyWindowOpen"
                @click="templateMode = false"
              >
                Message
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-bold transition"
                :class="templateMode ? 'bg-white text-slate-900 shadow-sm dark:bg-[#26323a] dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                @click="templateMode = true"
              >
                Template
              </button>
            </div>
            <span class="text-[11px] font-semibold" :class="replyWindowOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
              {{ replyWindowOpen ? 'Free-form window open' : 'Template required' }}
            </span>
          </div>

          <div v-if="templateMode" class="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70 dark:bg-white/[0.035] dark:ring-white/[0.06]">
            <select v-model="selectedTemplateKey" class="field-input">
              <option value="">Choose an approved template…</option>
              <option v-for="template in waTemplates" :key="`${template.name}::${template.language}`" :value="`${template.name}::${template.language}`">
                {{ template.name }} [{{ template.language }}]
              </option>
            </select>
            <input v-model="templateParams" class="field-input" placeholder="Template values in order, separated with |" />
            <button type="button" class="btn-primary w-full" :disabled="sending || !selectedTemplate" @click="sendTemplateReply">
              {{ sending ? 'Sending…' : 'Send template' }}
            </button>
          </div>

          <div v-else class="flex items-end gap-2">
            <textarea
              v-model="draft"
              rows="1"
              class="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-emerald-400/60 dark:bg-white/[0.06] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:bg-white/[0.08]"
              placeholder="Type a reply…"
              @keydown.enter.exact.prevent="sendReply"
            />
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-500 dark:text-[#07120e] dark:hover:bg-emerald-400"
              :disabled="sending || !draft.trim()"
              aria-label="Send reply"
              @click="sendReply"
            >
              <PaperAirplaneIcon class="h-5 w-5 -rotate-45" />
            </button>
          </div>
        </footer>
      </template>

      <div v-else class="m-auto max-w-sm px-6 text-center text-slate-500 dark:text-slate-400">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
          <ChatBubbleLeftRightIcon class="h-7 w-7" />
        </div>
        <p class="mt-4 text-lg font-black text-slate-700 dark:text-slate-200">Select a conversation</p>
        <p class="mt-1 text-sm">Only messages belonging to this event are shown here.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.inbox-shell {
  display: flex;
}

.chat-canvas {
  background-color: #efeae2;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.25) 0 1px, transparent 1.5px),
    radial-gradient(circle at 70% 65%, rgba(15, 118, 110, 0.05) 0 1px, transparent 1.5px);
  background-size: 34px 34px, 42px 42px;
}

:global(.dark) .chat-canvas {
  background-color: #0b141a;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.025) 0 1px, transparent 1.5px),
    radial-gradient(circle at 70% 65%, rgba(37, 211, 102, 0.025) 0 1px, transparent 1.5px);
}

.message-bubble {
  color: #111b21;
}

.message-bubble--outbound {
  border-radius: 14px 14px 3px 14px;
  background: #d9fdd3;
}

.message-bubble--inbound {
  border-radius: 14px 14px 14px 3px;
  background: #fff;
}

:global(.dark) .message-bubble {
  color: #e9edef;
}

:global(.dark) .message-bubble--outbound {
  background: #005c4b;
}

:global(.dark) .message-bubble--inbound {
  background: #202c33;
}
</style>
