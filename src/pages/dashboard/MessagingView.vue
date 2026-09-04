<template>
  <PageShell
    title="Send messages"
    :description="`Broadcast to guests via WhatsApp, SMS, or both. Every send draws from your prepaid units first, then wallet — SMS ${pricing.smsRateTZS} TZS/segment · WhatsApp ${pricing.waRateTZS} TZS/msg.`"
    :crumbs="[{ label: 'Events', to: '/app/events' }, { label: 'Event', to: `/app/events/${route.params.id}` }, { label: 'Messages' }]"
  >
    <template #actions>
      <router-link :to="`/app/events/${route.params.id}/reminders`">
        <Button variant="secondary" size="md">
          <template #leading><ClockIcon class="w-4 h-4" /></template>
          Reminders
        </Button>
      </router-link>
    </template>

    <WatermarkBanner :event="event" audience="owner" />

    <!-- Channel picker — pill style, matches Guests filter chips visually. -->
    <div class="flex items-center gap-1 p-1 rounded-xl surface-inset mb-6 w-fit">
      <button v-for="c in CHANNELS" :key="c.value"
              type="button"
              :class="['px-4 py-1.5 rounded-lg text-sm font-bold transition-colors duration-fast whitespace-nowrap',
                       channel === c.value
                         ? 'bg-surface-ivory dark:bg-surface-coal shadow-elev-1 text-surface-charcoal dark:text-surface-bone'
                         : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone']"
              @click="channel = c.value">{{ c.label }}</button>
    </div>

    <!-- Template picker: custom list (native <select> replaced so rows can be
         acted on directly — delete without leaving the list). -->
    <div class="mb-4 surface-card overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-surface-mist dark:border-surface-fog">
        <div>
          <p class="text-heading">Templates</p>
          <p class="text-subtext">Meta-approved messages you can send to any guest.</p>
        </div>
        <button class="btn-secondary !text-sm" @click="startNew"><PlusIcon class="w-4 h-4" /> New</button>
      </div>
      <ul v-if="templates.length" class="max-h-72 overflow-y-auto divide-y divide-surface-mist dark:divide-surface-fog">
        <li v-for="t in templates" :key="t._id"
            class="flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors"
            :class="selectedId === t._id
              ? 'bg-brand-gold-glow'
              : 'hover:bg-surface-mist/40 dark:hover:bg-surface-fog/40'"
            @click="selectedId = t._id">
          <div class="min-w-0 flex-1">
            <p class="text-heading truncate">{{ t.name }}</p>
            <p class="text-2xs text-surface-slate dark:text-surface-ash uppercase tracking-widest">
              {{ t.category }} · {{ t.language }}<span v-if="!t.tenantId"> · system</span>
            </p>
          </div>
          <button v-if="canDeleteRow(t)"
                  class="btn-ghost !p-1.5 !text-red-600 hover:!bg-red-500/10"
                  title="Delete template"
                  @click.stop="onDeleteRow(t)">
            <TrashIcon class="w-4 h-4" />
          </button>
        </li>
      </ul>
      <div v-else class="px-4 py-8 text-center text-subtext">
        No templates yet. Click <strong>New</strong> to create one.
      </div>
    </div>

    <!-- Editor (shown when a template is selected OR when composing new).
         Desktop: two-column layout — composer on the left, a sticky
         preview/audience/send rail on the right (same shape as Meta
         Business Suite / most messaging SaaS tools). Collapses to a
         single stacked column below lg. -->
    <div v-if="composer" class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-6 items-start">
      <!-- LEFT: message composer -->
      <div class="space-y-4 min-w-0">
      <div class="surface-card p-4 sm:p-5 space-y-4">
        <!-- Name (only when editing / creating custom) -->
        <div v-if="isEditableTemplate">
          <div class="flex flex-wrap gap-3">
            <AppInput v-model="composer.name" label="Template name" placeholder="My reminder" class="flex-1 min-w-[180px]" />
            <AppSelect v-model="composer.category" label="Category" :options="CATEGORIES" class="w-40" />
            <AppSelect v-model="composer.language" label="Language" :options="[{value:'sw',label:'SW'},{value:'en',label:'EN'}]" class="w-28" />
          </div>
        </div>

        <!-- WhatsApp template card — hidden entirely when channel is SMS-only. -->
        <div v-if="channel !== 'sms'" class="rounded-2xl overflow-hidden shadow-md border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-surface-charcoal">
          <div class="px-4 py-3 flex items-center justify-between gap-3 bg-emerald-500/10 border-b border-emerald-500/20">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">💬</span>
              <div class="min-w-0">
                <p class="text-sm font-black text-surface-charcoal dark:text-surface-bone leading-tight">WhatsApp message</p>
                <p class="text-2xs text-surface-slate dark:text-surface-ash truncate">
                  {{ waTemplates.length }} approved Meta templates
                  <span v-if="waLastSyncedAt">· synced {{ formatRelative(waLastSyncedAt) }}</span>
                  · <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ waCostFormatted }}</span>
                </p>
              </div>
            </div>
            <button class="btn-ghost !text-xs !py-1.5 !px-2.5" :disabled="syncingWa" @click="syncWaTemplates">
              <ArrowPathIcon class="w-3.5 h-3.5" :class="syncingWa ? 'animate-spin' : ''" />
              {{ syncingWa ? 'Syncing…' : 'Sync from Meta' }}
            </button>
          </div>

          <div class="p-4">
            <!-- Setup — the live preview used to sit beside this in its own
                 column; it now lives in the right-hand rail with the SMS
                 preview, WhatsApp on top / SMS below, so both channels'
                 previews are together regardless of which one this card
                 currently occupies. -->
            <div class="space-y-3">
              <div>
                <label class="field-label !mb-1">Template</label>
                <select v-model="composer.waTemplate" class="field-input" :disabled="!isEditableTemplate && !overrideBody">
                  <option v-if="!waTemplates.length" disabled value="">
                    No templates cached — click "Sync from Meta"
                  </option>
                  <option v-for="t in waTemplates" :key="t.name + t.language" :value="t.name">
                    {{ t.name }} [{{ t.language }}]
                    {{ t.hasImageHeader ? '· 🖼' : '' }}
                    {{ t.buttonsKind === 'url' ? '· 🔗' : t.buttonsKind === 'quickreply' ? '· 💬' : '' }}
                  </option>
                </select>
              </div>

              <!-- Header image chooser — only when the picked Meta template
                   has an image header. Default = personalised guest card;
                   picking an event asset sends the SAME image to every
                   recipient instead of a per-guest render. -->
              <div v-if="selectedWaMeta && selectedWaMeta.hasImageHeader" class="space-y-1.5">
                <label class="field-label !mb-1">Header image</label>
                <select v-model="composer.headerImageChoice"
                        @change="onHeaderImageChoice"
                        class="field-input !py-1.5 !text-sm">
                  <option value="card">Personalised guest card (per-recipient)</option>
                  <option v-for="a in eventAssets" :key="a._id" :value="`asset:${a._id}`">
                    Event image: {{ a.label || a.slug }}
                  </option>
                </select>
                <div v-if="composer.headerImageChoice?.startsWith('asset:')"
                     class="flex items-center gap-2 mt-1">
                  <img :src="pickedAssetUrl" class="h-12 w-12 rounded object-cover" />
                  <p class="text-2xs text-surface-slate dark:text-surface-ash">
                    Same image sent to every recipient — no per-guest QR overlay.
                  </p>
                </div>
                <p v-if="!eventAssets.length" class="text-2xs text-surface-slate dark:text-surface-ash">
                  Upload event images under the event page's <em>Extra images (no QR)</em> section to pick from.
                </p>
              </div>

              <!-- Per-{{N}} variable rows: mapping (default) + per-send override
                   text field. Leave override blank → uses the mapped guest/event
                   value. Fill it → literal text sent to every recipient. -->
              <div v-if="selectedWaMeta && selectedWaMeta.bodyVarCount" class="space-y-1.5">
                <label class="field-label !mb-1">Body variables</label>
                <div v-for="n in selectedWaMeta.bodyVarCount" :key="'b'+n"
                     class="grid grid-cols-12 gap-2 items-center">
                  <span class="col-span-2 font-mono text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-center">
                    {{ placeholderLabel(n) }}
                  </span>
                  <select v-model="selectedWaMeta.varMap[String(n)]"
                          class="col-span-5 field-input !py-1.5 !text-sm">
                    <option value="">— auto: unset —</option>
                    <option v-for="t in bodyCatalog" :key="t.key" :value="t.key">{{ t.label }}</option>
                  </select>
                  <input v-model="composer.waOverrides[String(n)]"
                         class="col-span-5 field-input !py-1.5 !text-sm"
                         placeholder="or type override text…" />
                </div>
              </div>

              <div v-if="selectedWaMeta && selectedWaMeta.buttonsKind === 'url' && selectedWaMeta.buttonLabels.length"
                   class="space-y-1.5 pt-2 border-t border-emerald-500/10">
                <label class="field-label !mb-1">URL button suffixes</label>
                <div v-for="(label, i) in selectedWaMeta.buttonLabels" :key="'u'+i"
                     class="grid grid-cols-12 gap-2 items-center">
                  <span class="col-span-4 text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 truncate">
                    {{ label }}
                  </span>
                  <select v-model="selectedWaMeta.urlButtonMap[String(i)]"
                          class="col-span-8 field-input !py-1.5 !text-sm">
                    <option value="">— unset —</option>
                    <option v-for="t in urlCatalog" :key="t.key" :value="t.key">{{ t.label }}</option>
                  </select>
                </div>
              </div>

              <div v-if="selectedWaMeta" class="flex justify-end pt-1">
                <button class="btn-secondary !text-xs !py-1.5" :disabled="savingMap" @click="saveVarMap">
                  <BookmarkIcon class="w-3.5 h-3.5" />
                  {{ savingMap ? 'Saving…' : 'Save mapping to template' }}
                </button>
              </div>
            </div>
          </div>
          <details class="mt-2 text-xs">
            <summary class="cursor-pointer font-bold text-surface-charcoal dark:text-surface-bone">
              📖 Placeholder guide — read this before creating a Meta template
            </summary>
            <div class="mt-2 p-2 bg-white dark:bg-surface-fog rounded-md space-y-1.5 text-surface-charcoal dark:text-surface-bone">
              <p>When you design a template in Meta Business Suite, use variables in <strong>this exact order</strong>:</p>
              <ul v-pre class="font-mono text-2xs space-y-0.5">
                <li><span class="chip-gold !text-2xs !py-0">{{1}}</span> → guest first name (e.g. Davis)</li>
                <li><span class="chip-gold !text-2xs !py-0">{{2}}</span> → event name (e.g. Harusi ya Alice)</li>
                <li><span class="chip-gold !text-2xs !py-0">{{3}}</span> → event date (e.g. 15/08/2026)</li>
                <li><span class="chip-gold !text-2xs !py-0">{{4}}</span> → venue name (e.g. Serena Hotel)</li>
                <li><span class="chip-gold !text-2xs !py-0">{{5}}</span> → short code (e.g. HR8-P31)</li>
              </ul>
              <p class="pt-1 border-t border-surface-mist dark:border-surface-charcoal/40">
                <strong>URL buttons</strong> also numbered — for a Ramani + Kalenda template put maps as button 1 and calendar as button 2:
              </p>
              <ul v-pre class="font-mono text-2xs space-y-0.5">
                <li>Button 1 URL: <code>https://www.google.com/maps/search/?api=1&query={{1}}</code></li>
                <li>Button 2 URL: <code>https://events.amoview.com/api/public/ics/{{1}}</code></li>
              </ul>
              <p class="pt-1 text-surface-slate dark:text-surface-ash">
                Templates with fewer body vars work too — we just skip the extras. But the ORDER must match, or values land in the wrong slot.
              </p>
            </div>
          </details>
          <p class="text-2xs text-surface-slate dark:text-surface-ash mt-2">
            Meta locks the body — only the values above are personalized. Click <strong>Sync from Meta</strong> after approving a new template in Business Suite.
          </p>
        </div>

        <!-- SMS body hidden when channel is WhatsApp-only — Meta template is the source of truth there. -->
        <div v-if="channel !== 'whatsapp'">
          <label class="field-label flex items-center justify-between flex-wrap gap-2">
            <span>SMS body</span>
            <span class="text-2xs font-bold normal-case tracking-normal"
                  :class="smsStats.isUnicode ? 'text-amber-600 dark:text-amber-400' : 'text-surface-slate dark:text-surface-ash'">
              ~{{ smsStats.estimatedLength }} chars once sent ·
              {{ smsStats.segments }} SMS{{ smsStats.segments === 1 ? '' : 'es' }}
              <span v-if="smsStats.isUnicode">(Unicode — {{ smsStats.perSegment }}/segment)</span>
              <span v-else>({{ smsStats.perSegment }}/segment)</span>
              · <span class="text-brand-gold-deep dark:text-brand-gold-soft">{{ smsCostFormatted }}</span>
              <InfoHint text="Estimated after {{placeholders}} are filled in with a real guest's name/details — not the raw template length." />
            </span>
          </label>
          <textarea
            ref="bodyRef"
            v-model="composer.body"
            :readonly="!isEditableTemplate && !overrideBody"
            :rows="6"
            class="field-input font-medium resize-y min-h-[130px]"
            placeholder="Habari {{first_name}}, karibu {{event_name}} tarehe {{date}}…"
          />
          <div class="flex items-center justify-between mt-1">
            <button v-if="!isEditableTemplate && !overrideBody" class="btn-ghost !text-xs" @click="overrideBody = true">
              <PencilSquareIcon class="w-3.5 h-3.5" /> Edit this send only
            </button>
            <span class="text-subtext">Click a chip below to insert.</span>
          </div>

          <!-- Placeholder chips — clickable inserters -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <button v-for="p in PLACEHOLDERS" :key="p.token"
                    type="button"
                    class="chip-gold !text-2xs hover:!scale-105 transition"
                    :disabled="!isEditableTemplate && !overrideBody"
                    @click="insertPlaceholder(p.token)">
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- WhatsApp buttons + image are controlled by the Meta template picker
             above. No per-send toggles here anymore. -->

        <p v-if="serverError" class="text-sm text-red-600 dark:text-red-400 font-medium">{{ serverError }}</p>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-surface-mist dark:border-surface-fog">
          <button v-if="isEditableTemplate" class="btn-ghost !text-sm" @click="saveTemplate">
            <BookmarkIcon class="w-4 h-4" /> {{ selectedId ? 'Save' : 'Save preset' }}
          </button>
          <button v-else-if="overrideBody" class="btn-ghost !text-sm" @click="saveAsMyTemplate">
            <BookmarkIcon class="w-4 h-4" /> Save preset
          </button>
        </div>
      </div>
      </div>
      <!-- /LEFT -->

      <!-- RIGHT: live preview + audience + test + send, pinned while the
           left column scrolls — the sidebar rail every real messaging
           tool has, so "send" is never a mile of scrolling away. -->
      <div class="space-y-4 lg:sticky lg:top-4">

      <!-- WhatsApp live preview — moved here from inside the WA setup card
           so both channels' previews sit together in the rail: WhatsApp on
           top, SMS below, matching send order for 'auto'/'both'. Only
           WhatsApp shows for the whatsapp-only channel; only SMS shows for
           the sms-only channel. -->
      <div v-if="channel !== 'sms'" class="surface-card p-4 sm:p-5">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-2">WhatsApp preview</p>
        <div class="rounded-2xl bg-[#d9fdd3] dark:bg-[#005c4b] p-3 shadow-inner"
             style="background-image: radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 1px, transparent 1px); background-size: 12px 12px;">
          <div class="rounded-xl bg-white dark:bg-[#075e54] p-3 shadow max-w-full">
            <div v-if="selectedWaMeta?.hasImageHeader"
                 class="mb-2 rounded-md aspect-[4/5] bg-surface-mist dark:bg-black/30 flex items-center justify-center text-4xl">🖼️</div>
            <pre v-if="selectedWaTemplatePreview"
                 class="text-sm whitespace-pre-wrap font-sans text-surface-charcoal dark:text-white leading-snug">{{ selectedWaTemplatePreview.body }}</pre>
            <p v-else class="text-xs text-surface-slate dark:text-white/70">Pick a template to preview.</p>
            <p class="text-right text-2xs text-surface-slate/70 dark:text-white/60 mt-1">
              {{ new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }} ✓✓
            </p>
          </div>
          <div v-if="selectedWaTemplatePreview?.buttons.length" class="mt-2 space-y-1">
            <button v-for="(b, i) in selectedWaTemplatePreview.buttons" :key="i"
                    class="w-full bg-white dark:bg-[#075e54] text-emerald-600 dark:text-emerald-300 text-sm font-bold py-2 rounded-md shadow">
              {{ b }}
            </button>
          </div>
        </div>
        <p class="text-2xs text-surface-slate dark:text-surface-ash mt-1.5 text-center">
          Sample: {{ sampleGuest?.firstName || 'Davis' }}
        </p>
      </div>

      <!-- SMS live preview — only shown when SMS is actually part of the
           mix (auto/sms/both). -->
      <div v-if="channel !== 'whatsapp'" class="surface-card p-4 sm:p-5">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-2">SMS preview</p>
        <div class="rounded-2xl bg-surface-cream dark:bg-surface-night p-3">
          <div class="rounded-xl bg-white dark:bg-surface-coal p-3 shadow max-w-[85%] ml-auto">
            <p class="text-sm whitespace-pre-wrap text-surface-charcoal dark:text-surface-bone leading-snug">{{ rendered || '—' }}</p>
            <p class="text-right text-2xs text-surface-slate dark:text-surface-ash mt-1">
              {{ new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>
        <p class="text-2xs text-surface-slate dark:text-surface-ash mt-1.5 text-center">
          Sample: {{ sampleGuestName }}
        </p>
      </div>

      <!-- Audience -->
      <div class="surface-card p-4 sm:p-5">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-3">Audience</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AppSelect v-model="audience.rsvpStatus" label="RSVP" :options="RSVP" />
          <AppSelect v-model="audience.arrivalStatus" label="Arrival" :options="ARRIVAL" />
          <div class="flex items-center gap-1">
            <AppSelect v-model="audience.sendState" label="Send state" class="flex-1" :options="[
              {value:'any',label:'Everyone'},
              {value:'never',label: composer?._id ? 'Never got THIS template' : 'Never messaged (any)'},
              {value:'already',label: composer?._id ? 'Already got THIS template' : 'Already messaged (any)'},
            ]" />
            <InfoHint v-if="audience.sendState !== 'any'" text="Scoped to this saved template's own send history — skip guests who already got, say, the RSVP invite without also excluding them from a separate Thank-you template. Only works for saved templates; typed one-off messages fall back to \'messaged at all, ever\' for the whole event." />
          </div>
          <label class="flex items-end gap-2 pb-3">
            <input type="checkbox" v-model="audience.vipOnly" class="accent-brand-gold w-4 h-4" />
            <span class="text-heading">VIP only</span>
          </label>
        </div>
        <!-- Pledge audience — two independent filters that combine (AND):
             1) payment status (everyone / still owing / fully paid)
             2) tier reached (any / at-least-this-tier / exactly-this-tier) -->
        <div class="mt-3 space-y-3">
          <div>
            <label class="field-label flex items-center gap-1.5">
              Payment status
              <InfoHint text="Filters by how much a guest has PAID so far, regardless of tier. Combine with the tier filter below for precise targeting." />
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="opt in PLEDGE_STATUS_OPTIONS" :key="opt.value" type="button"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition"
                      :class="audience.pledgeStatus === opt.value
                        ? 'bg-gradient-gold text-surface-charcoal border-transparent shadow-gold-soft'
                        : 'border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash'"
                      @click="audience.pledgeStatus = opt.value">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div v-if="eventPledgeTiers.length">
            <label class="field-label flex items-center gap-1.5">
              Pledge tier
              <InfoHint text="'At least' includes this tier and every tier above it. 'Exactly' targets only guests who landed in this specific tier band." />
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select v-model="audience.tierMinTZS" class="field-input">
                <option value="">Any tier</option>
                <option v-for="t in eventPledgeTiers" :key="t.minTZS" :value="String(t.minTZS)">
                  {{ t.label || `${t.seats} seat${t.seats === 1 ? '' : 's'}` }} (≥ {{ Number(t.minTZS).toLocaleString() }} TZS)
                </option>
              </select>
              <select v-model="audience.tierMode" class="field-input" :disabled="!audience.tierMinTZS">
                <option value="atLeast">At least this tier</option>
                <option value="exact">Exactly this tier</option>
              </select>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <label class="field-label">Filter by tags (any match)</label>
          <div v-if="availableTags.length" class="flex flex-wrap gap-1.5">
            <button v-for="t in availableTags" :key="t._id" type="button"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border transition"
                    :class="audience.tags.includes(t._id)
                      ? 'bg-gradient-gold text-surface-charcoal border-transparent shadow-gold-soft'
                      : 'border-surface-mist dark:border-surface-fog text-surface-slate dark:text-surface-ash'"
                    @click="toggleAudienceTag(t._id)">
              {{ t.name }}
            </button>
          </div>
          <!-- Was silently invisible when no tags existed yet — the
               feature itself is fine (tag a guest from the Guests page's
               edit form, and it applies to whichever channel you send
               through), the operator just had no way to discover it from
               here. -->
          <p v-else class="text-subtext">
            No tags yet —
            <router-link :to="`/app/events/${route.params.id}/tags`" class="text-brand-gold-deep dark:text-brand-gold-soft font-bold hover:underline">create some</router-link>,
            then tag guests from the
            <router-link :to="`/app/events/${route.params.id}/guests`" class="text-brand-gold-deep dark:text-brand-gold-soft font-bold hover:underline">Guests page</router-link>'s edit form.
          </p>
        </div>
      </div>

      <!-- Test send — fires the exact same template to one typed number, no
           audience, no wallet debit. Lets you check the real render before
           committing to the full broadcast. -->
      <div class="surface-card p-4 sm:p-5">
        <p class="text-2xs uppercase font-black tracking-widest text-surface-slate dark:text-surface-ash mb-2 flex items-center gap-1.5">
          Send a test first
          <InfoHint text="Sends this exact message to one number you type — doesn't touch your guest list, doesn't cost from your wallet. Pick a guest below to control whose name/pledge data fills the placeholders." />
        </p>
        <div class="mb-2">
          <label class="field-label !mb-1">Use this guest's data for placeholders</label>
          <select v-model="sampleGuestId" class="field-input !py-1.5 !text-sm">
            <option v-if="!allGuests.length" value="">No guests yet — using placeholder sample data</option>
            <option v-for="g in allGuests" :key="g._id" :value="g._id">
              {{ g.firstName }} {{ g.lastName || '' }}<span v-if="g.pledge?.amount"> · pledged {{ formatTZS(g.pledge.amount) }}</span>
            </option>
          </select>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex-1 min-w-[220px]"><PhoneInput v-model="testPhone" /></div>
          <AppButton class="!text-sm" :loading="testSending"
                     :disabled="!testPhone || (!composer.body && !composer.waTemplate)"
                     @click="sendTest">
            Send test
          </AppButton>
        </div>
        <div v-if="testResults" class="mt-2 space-y-1">
          <p v-for="(r, i) in testResults" :key="i" class="text-sm font-medium"
             :class="r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
            {{ r.ok ? '✓' : '✗' }} {{ r.channel.toUpperCase() }} — {{ r.ok ? 'sent' : r.error }}
          </p>
        </div>
      </div>

      <!-- Cost estimate — new. Uses real MessagingPricing rates and the
           live audience count to show exactly what a broadcast will cost
           before the user commits. -->
      <div class="rounded-2xl bg-gradient-to-br from-brand-primary-glow to-transparent border border-brand-primary/20 p-4 sm:p-5">
        <p class="text-2xs uppercase font-black tracking-widest text-brand-primary-deep dark:text-brand-primary-soft mb-3">Estimated cost</p>
        <div class="flex items-baseline justify-between gap-3">
          <p class="text-3xl font-black text-surface-charcoal dark:text-surface-bone tabular-nums leading-none">{{ totalCostFormatted }}</p>
          <p class="text-sm text-surface-slate dark:text-surface-ash">
            {{ audienceCount == null ? '—' : audienceCount }} recipient{{ audienceCount === 1 ? '' : 's' }}
          </p>
        </div>
        <div class="mt-3 space-y-1 text-xs text-surface-slate dark:text-surface-ash">
          <div v-if="channel !== 'sms'" class="flex items-center justify-between">
            <span>WhatsApp</span>
            <span class="tabular-nums text-surface-charcoal dark:text-surface-bone">{{ pricing.waRateTZS }} TZS × recipient</span>
          </div>
          <div v-if="channel !== 'whatsapp'" class="flex items-center justify-between">
            <span>SMS</span>
            <span class="tabular-nums text-surface-charcoal dark:text-surface-bone">{{ pricing.smsRateTZS }} TZS × {{ smsStats.segments }} segment{{ smsStats.segments === 1 ? '' : 's' }} × recipient</span>
          </div>
        </div>
      </div>

      <!-- Send bar — comes AFTER audience so the flow is: setup → audience → send. -->
      <div class="rounded-2xl bg-surface-ivory dark:bg-surface-coal border border-surface-mist dark:border-surface-fog p-4 space-y-3">
        <div class="flex items-center gap-2 text-sm text-surface-charcoal dark:text-surface-bone">
          <UsersIcon class="w-4 h-4 text-surface-slate dark:text-surface-ash" />
          <span v-if="audienceCountLoading" class="text-surface-slate dark:text-surface-ash">Counting audience…</span>
          <span v-else-if="audienceCount === null" class="text-surface-slate dark:text-surface-ash">— guests will get this</span>
          <span v-else class="font-semibold"><span class="tabular-nums">{{ audienceCount }}</span> guest{{ audienceCount === 1 ? '' : 's' }} will get this</span>
        </div>
        <p v-if="serverError" class="text-sm text-state-danger font-medium">{{ serverError }}</p>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="md" @click="composer = null">Discard</Button>
          <Button variant="primary" size="md" class="ml-auto flex-1 sm:flex-none justify-center"
                  :loading="sending"
                  :disabled="event?.paymentStatus !== 'paid' || (!composer.body && !composer.waTemplate) || audienceCount === 0"
                  @click="send">
            <template #leading><PaperAirplaneIcon class="w-4 h-4" /></template>
            Send now
          </Button>
        </div>
      </div>
      </div>
      <!-- /RIGHT -->
    </div>

    <!-- Recent jobs -->
    <section v-if="jobs.length" class="mt-6">
      <h2 class="text-heading mb-3">Recent sends</h2>
      <div class="space-y-2">
        <div v-for="j in jobs.slice(0, 6)" :key="j._id" class="surface-card p-3 flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center" :class="statusBg(j.status)">
            <component :is="statusIcon(j.status)" class="w-4 h-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-heading truncate">
              {{ j.channel }} · {{ j.stats?.sent || 0 }} sent · {{ j.stats?.failed || 0 }} failed
            </p>
            <p v-if="j.channel === 'auto' || j.channel === 'both'" class="text-2xs text-surface-slate dark:text-surface-ash">
              {{ j.stats?.whatsapp || 0 }} WhatsApp · {{ j.stats?.sms || 0 }} SMS
            </p>
            <p class="text-2xs text-surface-slate dark:text-surface-ash">{{ new Date(j.createdAt).toLocaleString() }}</p>
          </div>
          <span :class="statusChip(j.status)">{{ j.status }}</span>
          <button class="btn-ghost !text-xs !py-1 !px-2" @click="openDelivery(j)">Delivery</button>
        </div>
      </div>
    </section>

    <MessageDeliveryDrawer
      v-model:open="deliveryOpen"
      mode="job"
      :job-id="deliveryJobId"
      :title="`Delivery — job ${deliveryJobId?.slice(-6) || ''}`"
    />
  </PageShell>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { askConfirm } from '@/composables/useConfirm';
import { useRoute } from 'vue-router';
import { LockClosedIcon, PaperAirplaneIcon, PlusIcon, TrashIcon, PencilSquareIcon, BookmarkIcon, CheckCircleIcon, ExclamationCircleIcon, ClockIcon, ArrowPathIcon, UsersIcon } from '@heroicons/vue/24/outline';
import { listWhatsAppTemplates, syncWhatsAppTemplates, updateVarMap } from '@/services/whatsappTemplates.service';
import { getEvent } from '@/services/events.service';
import { startMessageJob, listMessageJobs, sendTestMessage, previewMessageCost } from '@/services/messaging.service';
import PhoneInput from '@/components/common/PhoneInput.vue';
import { listTemplates, createTemplate, updateTemplate, deleteTemplate as apiDeleteTemplate, deleteTemplate, uploadTemplateImage } from '@/services/messageTemplates.service';
import { useAuthStore } from '@/stores/auth';
import MessageDeliveryDrawer from '@/components/messaging/MessageDeliveryDrawer.vue';
const auth = useAuthStore();

const deliveryOpen = ref(false);
const deliveryJobId = ref('');
function openDelivery(j) { deliveryJobId.value = j._id; deliveryOpen.value = true; }
import { listGuests } from '@/services/guests.service';
import { formatTZS } from '@/utils/format';
import { listTags as listTagsApi } from '@/services/tags.service';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppSelect from '@/components/common/AppSelect.vue';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import PageShell from '@/components/shell/PageShell.vue';
import WatermarkBanner from '@/components/events/WatermarkBanner.vue';
import InfoHint from '@/components/common/InfoHint.vue';
import { Button } from '@/components/ui';

const PLEDGE_STATUS_OPTIONS = [
  { value: 'any', label: 'Everyone' },
  { value: 'not_completed', label: 'Still owing' },
  { value: 'completed', label: 'Fully paid only' },
];

const CHANNELS = [
  { value: 'auto', label: 'Auto' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'both', label: 'Both' },
];
const CATEGORIES = [
  { value: 'invitation', label: 'Invitation' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'thank_you', label: 'Thank-you' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'other', label: 'Other' },
];
const RSVP = [
  { value: '', label: 'Any' }, { value: 'pending', label: 'Pending' },
  { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'maybe', label: 'Maybe' },
];
const ARRIVAL = [
  { value: '', label: 'Any' }, { value: 'not_arrived', label: 'Not arrived' }, { value: 'arrived', label: 'Arrived' },
];
const PLACEHOLDERS = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{guest_name}}', label: 'Full name' },
  { token: '{{event_name}}', label: 'Event' },
  { token: '{{date}}', label: 'Date' },
  { token: '{{venue}}', label: 'Venue' },
  { token: '{{member_id}}', label: 'Member ID' },
  { token: '{{code}}', label: 'Short code' },
  { token: '{{gallery_url}}', label: 'Gallery share link' },
  { token: '{{event_type}}', label: 'Event type' },
  { token: '{{countdown_days}}', label: 'Days until event' },
  { token: '{{church_name}}', label: 'Church name' },
  { token: '{{church_address}}', label: 'Church address' },
  { token: '{{church_arrival}}', label: 'Church arrival time' },
  { token: '{{payment_contacts}}', label: 'Payment contacts (block)' },
  { token: '{{contact_phones}}', label: 'Contact phones (block)' },
  { token: '{{pledge_amount}}', label: 'Guest pledged (TZS)' },
  { token: '{{pledge_received}}', label: 'Guest paid so far (TZS)' },
  { token: '{{pledge_outstanding}}', label: 'Guest outstanding (TZS)' },
  { token: '{{due_date}}', label: 'Pledge due date' },
];

const route = useRoute();
const toast = useToast();

const channel = ref('auto');
const audience = reactive({
  rsvpStatus: '', arrivalStatus: '', vipOnly: false, sendState: 'any', tags: [],
  pledgeStatus: 'any', tierMinTZS: '', tierMode: 'atLeast',
});
const availableTags = ref([]);
function toggleAudienceTag(id) {
  const i = audience.tags.indexOf(id);
  if (i >= 0) audience.tags.splice(i, 1); else audience.tags.push(id);
}

const templates = ref([]);
const selectedId = ref('');
const composer = ref(null); // reactive template payload once selected/new
const overrideBody = ref(false);
const bodyRef = ref(null);
const event = ref(null);
const eventPledgeTiers = computed(() => {
  const t = event.value?.pledgeTiers?.tiers;
  return Array.isArray(t) ? [...t].sort((a, b) => a.minTZS - b.minTZS) : [];
});
// Which guest's data fills {{placeholders}} in every preview (WhatsApp
// bubble, SMS bubble, char-count estimate) AND in the actual test send.
// Was hardcoded to whichever guest the API happened to return first —
// no way to check a specific guest's own name/pledge amounts before a
// real broadcast. allGuests backs the picker; sampleGuest stays the
// single source of truth every preview computed already reads from.
const allGuests = ref([]);
const sampleGuestId = ref('');
const sampleGuest = computed(() => allGuests.value.find((g) => g._id === sampleGuestId.value) || allGuests.value[0] || null);
const jobs = ref([]);
const sending = ref(false);
const serverError = ref('');

// Live "N guests will get this" count — refetches from the same
// buildAudienceFilter() the real send uses, so the number shown here is
// exactly who gets messaged, not an approximation. Debounced so typing/
// toggling filters doesn't fire a request per keystroke, and stale
// responses (audience changed again before an older request resolved) are
// dropped instead of overwriting a newer result.
const audienceCount = ref(null);
const audienceCountLoading = ref(false);
let audienceCountTimer = null;
let audienceCountSeq = 0;
async function refreshAudienceCount() {
  if (!composer.value) { audienceCount.value = null; return; }
  const seq = ++audienceCountSeq;
  audienceCountLoading.value = true;
  try {
    const res = await previewMessageCost(route.params.id, {
      channel: channel.value,
      template: { body: composer.value.body || ' ', language: composer.value.language || 'sw' },
      audience: buildAudiencePayload(),
    });
    if (seq === audienceCountSeq) audienceCount.value = res.guestCount ?? 0;
  } catch (err) {
    if (seq === audienceCountSeq) audienceCount.value = null;
  } finally {
    if (seq === audienceCountSeq) audienceCountLoading.value = false;
  }
}
function scheduleAudienceCount() {
  clearTimeout(audienceCountTimer);
  audienceCountTimer = setTimeout(refreshAudienceCount, 400);
}
watch([audience, channel, () => composer.value?._id, () => composer.value?.waTemplate], scheduleAudienceCount, { deep: true });
watch(() => composer.value, (c) => { if (c) scheduleAudienceCount(); else audienceCount.value = null; });

const waTemplates = ref([]);
const syncingWa = ref(false);

// Live pricing config from super-admin. Falls back to sensible defaults so
// the composer never blocks on network.
const pricing = ref({ smsRateTZS: 30, waRateTZS: 100, enforceBalance: false });
async function loadPricing() {
  try {
    const r = await http.get('/messaging/pricing');
    pricing.value = r.data?.data || r.data || pricing.value;
  } catch (_) {}
}

// Only these tokens actually differ per recipient — everything else
// (event name, date, venue, church details, payment/contact blocks,
// gallery link…) is IDENTICAL for every guest in this send, and we
// already have the real event doc loaded, so there's nothing to
// estimate there: tokenValues() below returns the true value and we
// use its exact length. Guessing a length for a value we already know
// exactly would just be worse than using the value itself.
// gallery_url isn't guest-varying, but it IS a server-signed JWT link we
// can't reproduce client-side (see tokenValues()'s comment) — grouped
// here so it gets the same "estimate, don't fake precision" treatment.
const GUEST_VARYING_TOKENS = new Set([
  'first_name', 'last_name', 'guest_name', 'full_name',
  'short_code', 'member_id',
  'pledge_amount', 'pledge_received', 'pledge_outstanding',
  'gallery_url',
]);
// Average real-world length for the guest-varying tokens only, in
// characters — used purely for segment/cost estimation, never shown as
// literal text. Rough East-African-market averages; good enough for a
// planning estimate before any guest data exists, not meant to be exact
// for any one guest (that's inherently unknowable before send-time).
const TOKEN_LENGTH_ESTIMATE = {
  first_name: 6, last_name: 8, guest_name: 15, full_name: 15,
  short_code: 7, member_id: 11,
  pledge_amount: 9, pledge_received: 9, pledge_outstanding: 9,
  gallery_url: 78, // https://events.amoview.com/gallery/<signed JWT>
};
const DEFAULT_TOKEN_LENGTH_ESTIMATE = 8; // fallback for any token not listed above

// Swap every {{token}} for a same-length filler string so segment math
// reflects the message guests will actually receive, not the raw
// template text. Event-level tokens use the REAL current value's exact
// length (tokenValues() already has the live event/guest data); only
// genuinely per-recipient tokens fall back to an average estimate.
// Returns the FULL substituted string, not just its length — needed so
// the GSM-7/Unicode check right below tests what the guest actually
// receives. Testing the raw template was a real bug: "{{" and "}}" are
// outside the GSM-7 basic character set, so ANY templated message got
// flagged as requiring Unicode (70 chars/segment) even when the real,
// rendered Swahili text was plain GSM-7 (160 chars/segment) — a 5-
// segment estimate for what was actually a 2-segment message.
function estimateRenderedBody(body) {
  const vals = tokenValues();
  return String(body || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, token) => {
    if (!GUEST_VARYING_TOKENS.has(token)) {
      const real = vals[token];
      if (real != null && String(real).length) return String(real);
    }
    const n = TOKEN_LENGTH_ESTIMATE[token] ?? DEFAULT_TOKEN_LENGTH_ESTIMATE;
    return 'x'.repeat(n);
  });
}

// SMS segment math — GSM-7 encodes 160 chars/segment, but the moment any
// non-GSM char (Swahili tone marks, emoji) sneaks in the whole message
// re-encodes to UCS-2 at 70 chars/segment. Show the operator BOTH numbers
// so they can trim if the multiplier surprises them.
const GSM_BASIC = /^[A-Za-z0-9@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà]*$/;
const smsStats = computed(() => {
  const body = composer.value?.body || '';
  const renderedForCount = estimateRenderedBody(body);
  const isUnicode = !GSM_BASIC.test(renderedForCount);
  const perSegment = isUnicode ? 70 : 160;
  const perSegmentConcat = isUnicode ? 67 : 153; // multipart overhead
  const estimatedLength = renderedForCount.length;
  let segments = 0;
  if (estimatedLength <= perSegment) segments = estimatedLength ? 1 : 0;
  else segments = Math.ceil(estimatedLength / perSegmentConcat);
  return { isUnicode, perSegment, segments, estimatedLength };
});
const smsCostFormatted = computed(() => {
  const total = smsStats.value.segments * (pricing.value?.smsRateTZS || 0);
  return total.toLocaleString('sw-TZ') + ' TZS/recipient';
});
const waCostFormatted = computed(() =>
  (pricing.value?.waRateTZS || 0).toLocaleString('sw-TZ') + ' TZS/recipient'
);

// Total cost estimate — recipient count × per-recipient cost, per
// channel mix. Falls back to a per-recipient hint when the audience
// count hasn't resolved yet, so the card is never empty.
const totalCostFormatted = computed(() => {
  const n = audienceCount.value;
  const wa = pricing.value?.waRateTZS || 0;
  const sms = (pricing.value?.smsRateTZS || 0) * smsStats.value.segments;
  const per = channel.value === 'sms' ? sms
    : channel.value === 'whatsapp' ? wa
    : channel.value === 'both' ? wa + sms
    : Math.max(wa, sms); // 'auto' — WA preferred but not guaranteed, budget the higher
  if (n == null) return `~${per.toLocaleString('sw-TZ')} TZS / recipient`;
  return `${(per * n).toLocaleString('sw-TZ')} TZS`;
});
const waLastSyncedAt = computed(() => {
  if (!waTemplates.value.length) return null;
  return waTemplates.value.reduce((max, t) => (t.lastSyncedAt > max ? t.lastSyncedAt : max), waTemplates.value[0].lastSyncedAt);
});
function formatRelative(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const bodyTokens = ref([]);
const bodyCatalog = ref([]);
const urlCatalog = ref([]);

// Event assets — extra images the tenant uploaded (save-the-date, program
// flyer, etc.). Populates the "Header image" chooser on the WA card.
const eventAssets = ref([]);
async function loadEventAssets() {
  try {
    eventAssets.value = await (await import('@/services/eventAssets.service')).listAssets(route.params.id);
  } catch (_) {}
}
const pickedAssetUrl = computed(() => {
  const id = (composer.value?.headerImageChoice || '').replace(/^asset:/, '');
  return eventAssets.value.find((a) => a._id === id)?.url || '';
});
// Selecting an asset flips attachCardVariant off + attachImageUrl on.
// Card option restores the per-guest render path.
function onHeaderImageChoice() {
  const c = composer.value;
  if (!c) return;
  if (c.headerImageChoice === 'card') {
    c.attachCardVariant = true;
    c.attachImageUrl = '';
    c.attachImagePath = '';
    return;
  }
  const id = c.headerImageChoice.replace(/^asset:/, '');
  const asset = eventAssets.value.find((a) => a._id === id);
  if (asset) {
    c.attachCardVariant = false;
    c.attachImageUrl = asset.url;
    c.attachImagePath = '';
  }
}
const urlTokens = ref([]);
// Vue's template parser chokes on literal '{{' inside interpolations, so we
// build the placeholder label via a plain method.
function placeholderLabel(n) { return '{' + '{' + n + '}' + '}'; }
async function refreshWaTemplates() {
  try {
    const resp = await listWhatsAppTemplates();
    // Response shape has drifted across backend revisions — tolerate the
    // array living at the top level, under `items`, or under `templates`,
    // rather than assuming one shape and silently ending up with nothing.
    const rawList = Array.isArray(resp) ? resp
      : Array.isArray(resp?.items) ? resp.items
        : Array.isArray(resp?.templates) ? resp.templates
          : [];
    // Guarantee varMap/urlButtonMap are objects so v-model can safely set keys —
    // older synced rows predate the field and would otherwise crash the picker.
    const items = rawList.map((t) => ({
      ...t,
      varMap: t.varMap && typeof t.varMap === 'object' ? t.varMap : {},
      urlButtonMap: t.urlButtonMap && typeof t.urlButtonMap === 'object' ? t.urlButtonMap : {},
      buttonLabels: t.buttonLabels || [],
    }));
    waTemplates.value = items;
    bodyTokens.value = resp.bodyTokens || [];
    bodyCatalog.value = resp.bodyCatalog || (resp.bodyTokens || []).map((k) => ({ key: k, label: k }));
    urlCatalog.value = resp.urlCatalog || (resp.urlTokens || []).map((k) => ({ key: k, label: k }));
    urlTokens.value = resp.urlTokens || [];
  } catch (err) {
    // This used to fail silently, which is exactly how "Synced 2 templates"
    // could show while the dropdown stayed empty — the sync call succeeded
    // but this follow-up list refresh failed with no visible sign of it.
    console.error('Failed to load WhatsApp templates', err);
    toast.error(apiErrorMessage(err));
  }
}
const selectedWaMeta = computed(() =>
  waTemplates.value.find((t) => t.name === composer.value?.waTemplate) || null
);
const savingMap = ref(false);
async function saveVarMap() {
  const t = selectedWaMeta.value;
  if (!t) return;
  savingMap.value = true;
  try {
    const updated = await updateVarMap(t._id, { varMap: t.varMap, urlButtonMap: t.urlButtonMap });
    Object.assign(t, updated);
    toast.success('Mapping saved');
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { savingMap.value = false; }
}

// Build a live preview of what WhatsApp will actually send, with the 5 body
// values substituted so tenants see the real message and not {{1}}..{{5}}.
const WA_HARDCODED_PREVIEW = {
  rsvp: {
    body: 'Karibu {{1}} kwenye {{2}} tarehe {{3}} sehemu ya {{4}}. Code yako ni {{5}}. Utakuwepo?',
    buttons: ['Nitakuja', 'Sitakuja', 'Sijui bado'],
  },
  ratiba: {
    body: 'Karibu {{1}} kwenye {{2}} tarehe {{3}} sehemu ya {{4}}. Code yako ni {{5}}. Utakuwepo?',
    buttons: ['Fungua Ramani', 'Ongeza Kalenda'],
  },
};
// Values keyed by canonical token so we can substitute using whatever varMap
// the admin picked for this template.
function tokenValues() {
  const g = sampleGuest.value || {};
  const ev = event.value || {};
  const short = ev.code && g.pubCode ? `${ev.code}-${g.pubCode}` : (g.memberId || '—');
  const fmtTZS = (n) => Number(n || 0).toLocaleString('sw-TZ');
  const pledgedAmt   = g.pledge?.amount      ?? 0;
  const pledgedPaid  = g.pledge?.receivedTZS ?? 0;
  const pledgedOut   = Math.max(0, pledgedAmt - pledgedPaid);
  // Payment methods + contact phones come from the event doc; render as
  // multi-line blocks so they slot straight into a WA template variable.
  const paymentBlock = (ev.paymentContacts || []).map((c) => {
    const label = c.bankName || c.method || c.label || '';
    return [c.phone, c.accountName, label].filter(Boolean).join(' - ');
  }).filter(Boolean).join('\n') || '—';
  const phoneBlock = (ev.contactPhones || []).map((c) =>
    [c.phone, c.label].filter(Boolean).join(' - ')
  ).filter(Boolean).join('\n') || '—';
  return {
    first_name:   g.firstName || 'Davis',
    last_name:    g.lastName || '',
    full_name:    `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Davis',
    guest_name:   `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Davis',
    event_name:   ev.name || 'Event',
    event_type:   ev.eventType || '',
    date:         ev.date ? new Date(ev.date).toLocaleDateString('en-GB') : '—',
    time:         ev.date ? new Date(ev.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
    venue:        ev.venue?.name || '—',
    venue_address: ev.venue?.address || '—',
    short_code:   short,
    member_id:    g.memberId || '—',
    pledge_amount:      fmtTZS(pledgedAmt),
    pledge_received:    fmtTZS(pledgedPaid),
    pledge_outstanding: fmtTZS(pledgedOut),
    due_date:           ev.pledgeDueAt ? new Date(ev.pledgeDueAt).toLocaleDateString('en-GB') : '—',
    payment_contacts:   paymentBlock,
    contact_phones:     phoneBlock,
    // Same for every recipient — computed identically to what
    // send.service.js actually substitutes server-side.
    countdown_days: ev.date ? String(Math.max(0, Math.ceil((new Date(ev.date) - Date.now()) / 86_400_000))) : '0',
    church_name:    ev.church?.name || '',
    church_address: ev.church?.address || '',
    church_arrival: ev.church?.arrivalTime || '',
    // gallery_url is a server-signed JWT link (send.service.js signs it
    // at send-time) — genuinely can't be reproduced client-side, so this
    // one token stays a length ESTIMATE (handled in TOKEN_LENGTH_ESTIMATE
    // below), not a real value like everything else here.
  };
}

const selectedWaTemplatePreview = computed(() => {
  const choice = composer.value?.waTemplate || 'rsvp';
  const meta = waTemplates.value.find((t) => t.name === choice);
  const vals = tokenValues();

  // Prefer the actual Meta body text (from Sync). Fall back to the two
  // hardcoded alias bodies. Show a friendly note if we still have neither.
  let bodyTpl = meta?.bodyText || WA_HARDCODED_PREVIEW[choice]?.body || '';
  let buttons = meta?.buttonLabels?.length ? meta.buttonLabels : (WA_HARDCODED_PREVIEW[choice]?.buttons || []);

  // Substitute {{N}} using the template's varMap. Default map for aliases:
  //   1=first_name, 2=event_name, 3=date, 4=venue, 5=short_code
  const legacyMap = { '1': 'first_name', '2': 'event_name', '3': 'date', '4': 'venue', '5': 'short_code' };
  const map = (meta?.varMap && Object.keys(meta.varMap).length) ? meta.varMap : legacyMap;
  // Per-send overrides beat the mapped value. Empty string = fall through.
  const overrides = composer.value?.waOverrides || {};
  const body = bodyTpl
    ? bodyTpl.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const ov = overrides[String(n)];
        if (ov && String(ov).trim()) return ov;
        const tok = map[String(n)];
        if (!tok) return `⟨{{${n}}} unmapped⟩`;
        return vals[tok] ?? '';
      })
    : `(Not synced yet — click "Sync from Meta" to see the real body.)`;
  return { body, buttons };
});
async function syncWaTemplates() {
  syncingWa.value = true;
  try {
    const { synced, pruned } = await syncWhatsAppTemplates();
    await refreshWaTemplates();
    toast.success(`Synced ${synced} template${synced === 1 ? '' : 's'}${pruned ? `, pruned ${pruned}` : ''}`);
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { syncingWa.value = false; }
}
const selectedTemplate = computed(() => templates.value.find((t) => t._id === selectedId.value));
const isEditableTemplate = computed(() => {
  if (!composer.value) return false;
  if (composer.value.__isNew) return true;
  if (selectedTemplate.value?.tenantId) return true; // owned by this tenant
  return auth.isSuperAdmin; // system templates: only super admin can edit
});
// Per-row delete visibility for the custom list (super admin can nuke system
// templates too; owners/collaborators only their own tenant's).
function canDeleteRow(t) {
  if (t.tenantId) return true;
  return auth.isSuperAdmin;
}
async function onDeleteRow(t) {
  if (!(await askConfirm(`Delete template "${t.name}"?`))) return;
  try {
    await deleteTemplate(t._id);
    templates.value = templates.value.filter((x) => x._id !== t._id);
    if (selectedId.value === t._id) { selectedId.value = ''; composer.value = null; }
    toast.success('Deleted');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
const isWhatsAppCompatible = computed(() => ['auto', 'whatsapp', 'both'].includes(channel.value));

const sampleGuestName = computed(() => sampleGuest.value
  ? `${sampleGuest.value.firstName} ${sampleGuest.value.lastName || ''}`.trim()
  : 'Davis Mwaisemba');

// Full substitution using the same real-value map the character
// estimator uses (tokenValues()) — every token on the placeholder chip
// list renders correctly here, not just the handful this used to
// hardcode. gallery_url is the one token tokenValues() can't produce
// (server-signed JWT) — shown as a clear placeholder note instead of
// silently leaving raw {{gallery_url}} in the preview.
const rendered = computed(() => {
  if (!composer.value) return '';
  const vals = tokenValues();
  return String(composer.value.body || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, token) => {
    if (token === 'gallery_url') return '(gallery link — shown at send time)';
    return token in vals ? vals[token] : match;
  });
});

// Fill composer when selection changes.
watch(selectedId, (id) => {
  if (!id) { composer.value = null; return; }
  const t = selectedTemplate.value;
  if (!t) return;
  composer.value = {
    _id: t._id,
    name: t.name,
    category: t.category,
    language: t.language,
    body: t.body,
    includeRsvpButtons: !!t.includeRsvpButtons,
    buttons: (t.buttons || []).map((b) => ({ ...b })),
    poll: t.poll ? { question: t.poll.question || '', options: (t.poll.options || []).map((o) => ({ ...o })) } : null,
    attachCardVariant: !!t.attachCardVariant,
    attachImagePath: t.attachImagePath || null,
    attachImageUrl: t.attachImageUrl || null,
    attachImagePreview: t.attachImageUrl || null,
    waTemplate: t.waTemplate || waTemplates.value[0]?.name || '',
    waOverrides: t.waOverrides ? { ...t.waOverrides } : {},
    headerImageChoice: t.attachCardVariant === false && t.attachImageUrl
      ? `asset:${eventAssets.value.find((a) => a.url === t.attachImageUrl)?._id || ''}`
      : 'card',
    __isNew: false,
  };
  overrideBody.value = false;
});

async function onDeleteTemplate() {
  const t = selectedTemplate.value;
  if (!t) return;
  if (!(await askConfirm(`Delete template "${t.name}"?`))) return;
  try {
    await apiDeleteTemplate(t._id);
    toast.success('Template deleted');
    templates.value = templates.value.filter((x) => x._id !== t._id);
    selectedId.value = '';
    composer.value = null;
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

function startNew() {
  selectedId.value = '';
  composer.value = {
    name: 'My template',
    category: 'invitation',
    language: 'sw',
    body: 'Habari {{first_name}}, karibu {{event_name}} tarehe {{date}} sehemu ya {{venue}}.',
    includeRsvpButtons: true,
    buttons: [],
    poll: null,
    attachCardVariant: true,
    attachImagePath: null, attachImageUrl: null, attachImagePreview: null,
    waTemplate: waTemplates.value[0]?.name || '',
    waOverrides: {},
    headerImageChoice: 'card',
    __isNew: true,
  };
  overrideBody.value = true;
}

function insertPlaceholder(token) {
  if (!composer.value) return;
  const el = bodyRef.value;
  if (!el || typeof el.selectionStart !== 'number') {
    composer.value.body = (composer.value.body || '') + token;
    return;
  }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = composer.value.body.slice(0, start);
  const after = composer.value.body.slice(end);
  composer.value.body = before + token + after;
  nextTick(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + token.length;
  });
}

function addPollOption() {
  if (!composer.value.poll) composer.value.poll = { question: 'Select', options: [] };
  composer.value.poll.options.push({ id: `opt_${composer.value.poll.options.length + 1}`, title: '', description: '' });
}

async function onImageFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const res = await uploadTemplateImage(f);
    composer.value.attachImagePath = res.path;
    composer.value.attachImageUrl = null;
    composer.value.attachImagePreview = res.url;
    toast.success('Image uploaded');
  } catch (err) { toast.error(apiErrorMessage(err)); }
}
function clearImage() {
  composer.value.attachImagePath = null;
  composer.value.attachImageUrl = null;
  composer.value.attachImagePreview = null;
}

async function saveTemplate() {
  try {
    const payload = buildTemplatePayload();
    if (composer.value._id) {
      await updateTemplate(composer.value._id, payload);
      toast.success('Template updated');
    } else {
      const t = await createTemplate(payload);
      composer.value._id = t._id;
      composer.value.__isNew = false;
      toast.success('Template saved');
    }
    await loadTemplates();
    selectedId.value = composer.value._id;
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

async function saveAsMyTemplate() {
  composer.value.__isNew = true;
  composer.value._id = undefined;
  composer.value.name = `${selectedTemplate.value?.name || 'Copy'} — my version`;
  await saveTemplate();
}

function buildTemplatePayload() {
  const c = composer.value;
  const buttons = c.includeRsvpButtons ? undefined : c.buttons?.filter((b) => b.title && b.id);
  const poll = c.poll?.options?.length ? { question: c.poll.question, options: c.poll.options } : undefined;
  return {
    name: c.name, category: c.category, language: c.language, body: c.body,
    includeRsvpButtons: c.includeRsvpButtons,
    buttons: buttons?.length ? buttons : undefined,
    poll,
    attachCardVariant: c.attachCardVariant,
    attachImagePath: c.attachImagePath || undefined,
    attachImageUrl: c.attachImageUrl || undefined,
    waTemplate: c.waTemplate || 'rsvp',
    waOverrides: c.waOverrides || {},
  };
}

// Turns the tier-mode UI (at-least / exactly) into a min/max TZS range the
// backend can filter on. "Exactly" caps at the next tier's threshold so a
// guest who paid enough for tier 3 doesn't also match a tier-2 "exact" pick.
function buildAudiencePayload() {
  let tierMinTZS, tierMaxTZS;
  if (audience.tierMinTZS) {
    tierMinTZS = Number(audience.tierMinTZS);
    if (audience.tierMode === 'exact') {
      const sorted = eventPledgeTiers.value;
      const idx = sorted.findIndex((t) => t.minTZS === tierMinTZS);
      const next = idx >= 0 ? sorted[idx + 1] : null;
      tierMaxTZS = next ? next.minTZS : undefined;
    }
  }
  return {
    rsvpStatus: audience.rsvpStatus || undefined,
    arrivalStatus: audience.arrivalStatus || undefined,
    vipOnly: audience.vipOnly || undefined,
    sendState: audience.sendState || undefined,
    // Scopes "never/already messaged" to THIS saved template's own send
    // history — skip guests who already got the RSVP invite without also
    // excluding them from a separate Thank-you template. Only meaningful
    // for saved templates (composer._id); adhoc/typed sends fall back to
    // the old event-wide behavior since there's no template to scope to.
    templateId: composer.value?._id || undefined,
    tags: audience.tags?.length ? audience.tags : undefined,
    pledgeStatus: audience.pledgeStatus !== 'any' ? audience.pledgeStatus : undefined,
    tierMinTZS, tierMaxTZS,
  };
}

const testPhone = ref('');
const testSending = ref(false);
const testResults = ref(null);

async function sendTest() {
  const c = composer.value;
  testSending.value = true; testResults.value = null;
  try {
    const buttonsForSend = c.includeRsvpButtons ? [
      { id: 'rsvp_yes', title: 'Nitakuja' },
      { id: 'rsvp_no', title: 'Sitakuja' },
      { id: 'rsvp_maybe', title: 'Sijui bado' },
    ] : (c.buttons?.filter((b) => b.title && b.id) || undefined);
    const res = await sendTestMessage(route.params.id, {
      phone: testPhone.value,
      channel: channel.value,
      guestId: sampleGuestId.value || undefined,
      template: {
        body: c.body,
        language: c.language || 'sw',
        buttons: buttonsForSend,
        poll: c.poll?.options?.length ? { question: c.poll.question, options: c.poll.options } : undefined,
        attachCardVariant: !!c.attachCardVariant,
        attachImagePath: c.attachImagePath || undefined,
        attachImageUrl: c.attachImageUrl || undefined,
        waTemplate: c.waTemplate || undefined,
        waOverrides: c.waOverrides || {},
      },
    });
    testResults.value = res.results;
  } catch (err) { toast.error(apiErrorMessage(err)); }
  finally { testSending.value = false; }
}

async function send() {
  serverError.value = '';
  sending.value = true;
  try {
    const c = composer.value;
    const buttonsForSend = c.includeRsvpButtons ? [
      { id: 'rsvp_yes', title: 'Nitakuja' },
      { id: 'rsvp_no', title: 'Sitakuja' },
      { id: 'rsvp_maybe', title: 'Sijui bado' },
    ] : (c.buttons?.filter((b) => b.title && b.id) || undefined);
    await startMessageJob(route.params.id, {
      channel: channel.value,
      template: {
        body: c.body,
        language: c.language || 'sw',
        buttons: buttonsForSend,
        poll: c.poll?.options?.length ? { question: c.poll.question, options: c.poll.options } : undefined,
        attachCardVariant: !!c.attachCardVariant,
        attachImagePath: c.attachImagePath || undefined,
        attachImageUrl: c.attachImageUrl || undefined,
        waTemplate: c.waTemplate || 'rsvp',
    waOverrides: c.waOverrides || {},
      },
      audience: buildAudiencePayload(),
    });
    toast.success('Send started — check recent sends');
    jobs.value = await listMessageJobs(route.params.id);
  } catch (err) { serverError.value = apiErrorMessage(err); }
  finally { sending.value = false; }
}

async function loadTemplates() {
  try { templates.value = await listTemplates(); }
  catch (err) { toast.error(apiErrorMessage(err)); }
}

async function refresh() {
  try {
    const [ev, gs] = await Promise.all([
      getEvent(route.params.id),
      // Enough to populate the test-send guest picker without pulling
      // an entire 300+ guest wedding list on every page load.
      listGuests(route.params.id, { limit: 500 }).catch(() => ({ items: [] })),
    ]);
    event.value = ev.event;
    allGuests.value = gs.items || [];
    if (allGuests.value.length && !sampleGuestId.value) sampleGuestId.value = allGuests.value[0]._id;
    jobs.value = await listMessageJobs(route.params.id);
  } catch (err) { toast.error(apiErrorMessage(err)); }
}

function statusChip(s) { return { queued: 'chip', running: 'chip-warn', completed: 'chip-success', failed: 'chip-danger', canceled: 'chip' }[s] || 'chip'; }
function statusIcon(s) { if (s === 'completed') return CheckCircleIcon; if (s === 'failed') return ExclamationCircleIcon; return ClockIcon; }
function statusBg(s) { return { queued: 'bg-surface-mist/50 text-surface-slate', running: 'bg-amber-500/15 text-amber-500', completed: 'bg-emerald-500/15 text-emerald-500', failed: 'bg-red-500/15 text-red-500', canceled: 'bg-surface-mist/50 text-surface-slate' }[s] || ''; }

onMounted(async () => {
  await loadTemplates();
  const inv = templates.value.find((t) => t.category === 'invitation' && t.language === 'sw');
  if (inv) selectedId.value = inv._id;
  await refresh();
  try { availableTags.value = await listTagsApi(route.params.id); } catch (_) {}
  refreshWaTemplates();
  loadEventAssets();
  loadPricing();
});
</script>
