<template>
  <PageShell title="Customer messages" description="Everything people send to the WhatsApp number — whether or not they are a guest and whatever event or template it relates to.">

    <div class="flex items-center gap-2 mb-4">
      <button class="chip cursor-pointer" :class="tab === 'messages' ? 'chip-primary' : 'chip-neutral'" @click="tab = 'messages'">
        Messages
        <span v-if="totalUnread" class="ml-1.5 px-1.5 rounded-full bg-brand-gold-deep text-white text-2xs font-black">{{ totalUnread }}</span>
      </button>
      <button class="chip cursor-pointer" :class="tab === 'events' ? 'chip-primary' : 'chip-neutral'" @click="tab = 'events'; loadEvents()">
        Calls &amp; other events
      </button>
    </div>

    <!-- MESSAGES -->
    <div v-if="tab === 'messages'" class="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <div class="surface-card overflow-hidden flex flex-col max-h-[70vh]">
        <div class="p-3 flex items-center gap-2 border-b border-surface-mist dark:border-surface-fog">
          <MagnifyingGlassIcon class="w-4 h-4 text-surface-slate" />
          <input v-model="q" @input="debouncedLoad"
                 class="flex-1 bg-transparent text-md outline-none placeholder:text-surface-slate/60"
                 placeholder="Search number, name or text…" />
          <label class="flex items-center gap-1 text-2xs font-bold text-surface-slate dark:text-surface-ash whitespace-nowrap">
            <input type="checkbox" v-model="onlyUnread" @change="loadConversations" class="accent-brand-gold" /> Unread
          </label>
        </div>
        <div v-if="loading" class="flex justify-center py-10"><LoadingSpinner /></div>
        <p v-else-if="!conversations.length" class="p-8 text-center text-subtext">
          No customer messages yet. New messages sent to the number from now on will appear here.
        </p>
        <ul v-else class="overflow-y-auto divide-y divide-surface-mist dark:divide-surface-fog">
          <li v-for="c in conversations" :key="c.phone">
            <button class="w-full text-left px-4 py-3 hover:bg-surface-mist/40 dark:hover:bg-surface-fog/40"
                    :class="selected === c.phone ? 'bg-surface-mist/60 dark:bg-surface-fog/60' : ''"
                    @click="openThread(c.phone)">
              <div class="flex items-center justify-between gap-2">
                <p class="text-heading truncate">{{ c.guestName || c.profileName || c.phone }}</p>
                <span class="text-2xs text-surface-slate dark:text-surface-ash whitespace-nowrap">{{ formatDateTime(c.lastMessageAt) }}</span>
              </div>
              <p class="text-xs text-surface-slate dark:text-surface-ash truncate mt-0.5">{{ c.lastText || ('[' + c.lastType.toLowerCase() + ']') }}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-2xs font-mono text-surface-slate dark:text-surface-ash">{{ c.phone }}</span>
                <span v-if="c.eventName" class="text-2xs px-1.5 rounded bg-surface-mist dark:bg-surface-fog">{{ c.eventName }}</span>
                <span v-else class="chip-warn !text-2xs !py-0 !px-1.5">Not a guest</span>
                <span v-if="c.unread" class="ml-auto px-1.5 rounded-full bg-brand-gold-deep text-white text-2xs font-black">{{ c.unread }}</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <div class="surface-card flex flex-col max-h-[70vh]">
        <div v-if="!selected" class="flex-1 flex items-center justify-center p-16 text-subtext">
          <div class="text-center">
            <ChatBubbleLeftRightIcon class="w-8 h-8 text-surface-slate mx-auto mb-2" />
            Select a conversation
          </div>
        </div>
        <template v-else>
          <div class="px-5 py-3 border-b border-surface-mist dark:border-surface-fog flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-heading truncate">{{ current?.guestName || current?.profileName || selected }}</p>
              <p class="text-2xs text-surface-slate dark:text-surface-ash font-mono">
                {{ selected }}<span v-if="current?.profileName && current?.guestName"> · WhatsApp name: {{ current.profileName }}</span>
              </p>
            </div>
            <a :href="'tel:' + selected" class="btn-secondary !text-sm inline-flex items-center gap-1.5">
              <PhoneIcon class="w-4 h-4" /> Call
            </a>
          </div>
          <div v-if="threadLoading" class="flex justify-center py-10"><LoadingSpinner /></div>
          <div v-else class="flex-1 overflow-y-auto p-5 space-y-3">
            <div v-for="m in thread" :key="m._id" class="max-w-[85%]">
              <div class="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-surface-mist/60 dark:bg-surface-fog/60">
                <p v-if="m.type !== 'TEXT'" class="text-2xs uppercase tracking-widest font-black text-surface-slate dark:text-surface-ash mb-0.5">{{ m.type.toLowerCase().replace(/_/g, ' ') }}</p>
                <p class="text-md whitespace-pre-wrap break-words">{{ m.text || '—' }}</p>
                <a v-if="m.mediaUrl" :href="m.mediaUrl" target="_blank" rel="noopener" class="text-xs underline text-brand-gold-deep">Open attachment</a>
              </div>
              <p class="text-2xs text-surface-slate dark:text-surface-ash mt-0.5 ml-1">{{ formatDateTime(m.receivedAt) }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- CALLS & OTHER EVENTS -->
    <div v-else>
      <div v-if="eventsLoading" class="flex justify-center py-10"><LoadingSpinner /></div>
      <div v-else-if="!events.length" class="surface-card p-12 text-center">
        <PhoneXMarkIcon class="w-8 h-8 text-surface-slate mx-auto mb-2" />
        <p class="text-subtext max-w-lg mx-auto">
          Nothing received yet. Any call or other non-message event the provider sends to the number is recorded here
          instead of being dropped. If missed calls never show up, calling needs to be enabled for the number
          in WhatsApp Manager (Phone numbers → Call settings).
        </p>
      </div>
      <div v-else class="surface-card overflow-hidden">
        <table class="w-full text-md">
          <thead>
            <tr class="text-left text-2xs uppercase tracking-widest text-surface-slate dark:text-surface-ash border-b border-surface-mist dark:border-surface-fog">
              <th class="px-5 py-3 font-black">When</th>
              <th class="px-5 py-3 font-black">Type</th>
              <th class="px-5 py-3 font-black">From</th>
              <th class="px-5 py-3 font-black">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e._id" class="border-b border-surface-mist dark:border-surface-fog align-top">
              <td class="px-5 py-3 text-xs whitespace-nowrap text-surface-slate dark:text-surface-ash">{{ formatDateTime(e.receivedAt) }}</td>
              <td class="px-5 py-3"><code class="text-xs px-2 py-0.5 rounded-md bg-surface-mist/60 dark:bg-surface-fog/60 font-bold">{{ e.type }}</code></td>
              <td class="px-5 py-3 font-mono text-xs">{{ e.from || '—' }}</td>
              <td class="px-5 py-3 text-xs">
                <p>{{ e.text }}</p>
                <details class="cursor-pointer mt-1">
                  <summary class="text-surface-slate dark:text-surface-ash">raw payload</summary>
                  <pre class="mt-1 text-2xs overflow-x-auto max-w-md">{{ JSON.stringify(e.raw, null, 2) }}</pre>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ChatBubbleLeftRightIcon, MagnifyingGlassIcon, PhoneIcon, PhoneXMarkIcon } from '@heroicons/vue/24/outline';
import http, { unwrap, apiErrorMessage } from '@/services/http';
import { formatDateTime } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import PageShell from '@/components/shell/PageShell.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const toast = useToast();
const tab = ref('messages');
const q = ref('');
const onlyUnread = ref(false);
const conversations = ref([]);
const loading = ref(true);
const selected = ref('');
const thread = ref([]);
const threadLoading = ref(false);
const events = ref([]);
const eventsLoading = ref(false);

const current = computed(() => conversations.value.find((c) => c.phone === selected.value) || null);
const totalUnread = computed(() => conversations.value.reduce((n, c) => n + (c.unread || 0), 0));

async function loadConversations() {
  try {
    const res = await http.get('/admin/inbound', { params: { q: q.value || undefined, unread: onlyUnread.value || undefined } });
    conversations.value = unwrap(res);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { loading.value = false; }
}

let timer = null;
function debouncedLoad() { clearTimeout(timer); timer = setTimeout(loadConversations, 300); }

async function openThread(phone) {
  selected.value = phone;
  threadLoading.value = true;
  try {
    thread.value = unwrap(await http.get('/admin/inbound/thread', { params: { phone } }));
    await http.post('/admin/inbound/read', { phone });
    const c = conversations.value.find((x) => x.phone === phone);
    if (c) c.unread = 0;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { threadLoading.value = false; }
}

async function loadEvents() {
  eventsLoading.value = true;
  try { events.value = unwrap(await http.get('/admin/inbound/events')); }
  catch (err) { toast.error(apiErrorMessage(err)); }
  finally { eventsLoading.value = false; }
}

let poll = null;
onMounted(() => {
  loadConversations();
  // New customer messages arrive any time; refresh quietly.
  poll = setInterval(() => {
    if (tab.value === 'messages') loadConversations();
    if (selected.value && tab.value === 'messages') {
      http.get('/admin/inbound/thread', { params: { phone: selected.value } })
        .then((r) => { thread.value = unwrap(r); }).catch(() => {});
    }
  }, 30000);
});
onBeforeUnmount(() => { clearInterval(poll); clearTimeout(timer); });
</script>
