<template>
  <div class="flex flex-col gap-4">
    <p v-if="!selected.length" class="text-2xs text-surface-slate dark:text-surface-ash">
      Select a layer to edit it.
    </p>

    <template v-else>
      <!-- Multi-select: align & distribute only -->
      <div v-if="selected.length > 1" class="space-y-3">
        <p class="section-eyebrow">{{ selected.length }} layers selected</p>
        <div>
          <p class="field-label mb-1">Align to selection</p>
          <div class="grid grid-cols-3 gap-1">
            <button v-for="m in ALIGN_MODES" :key="m.value" class="btn-ghost !p-1.5" :title="m.label" @click="align(m.value)">
              <component :is="m.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div v-if="selected.length > 2">
          <p class="field-label mb-1">Distribute evenly</p>
          <div class="grid grid-cols-2 gap-1">
            <button class="btn-ghost !text-2xs !py-1.5" @click="distribute('horizontal')">Horizontal</button>
            <button class="btn-ghost !text-2xs !py-1.5" @click="distribute('vertical')">Vertical</button>
          </div>
        </div>
        <div v-if="selected.length === 2">
          <p class="field-label mb-1">Masking</p>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('clip-mask', selected)">
            Clip top shape to bottom layer
          </button>
        </div>
      </div>

      <!-- Single selection -->
      <template v-else>
        <!-- Text controls (Batch 10) -->
        <div v-if="obj.get('data')?.isAdjustmentLayer" class="space-y-3">
          <p class="section-eyebrow">{{ obj.get('data')?.name || 'Adjustment layer' }}</p>
          <div v-for="control in adjustmentLayerControls" :key="control.key">
            <p class="field-label mb-1">{{ control.label }} — {{ adjustmentLayerValues[control.key] ?? control.default }}</p>
            <input type="range" class="w-full accent-brand-gold" :min="control.min" :max="control.max" :step="control.step || 0.01"
                   :value="adjustmentLayerValues[control.key] ?? control.default" @input="setAdjustmentLayerValue(control.key, Number($event.target.value))" />
          </div>
          <p class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">Affects image layers below it. Move this layer in the Layers panel to change its scope.</p>
        </div>

        <div v-else-if="isTextObject(obj)" class="space-y-3">
          <div v-if="!currentBinding">
            <p class="field-label mb-1">Text</p>
            <textarea class="field-input !text-xs w-full" rows="3" :value="obj.text" @change="setProp('text', $event.target.value)" />
          </div>
          <div>
            <p class="field-label mb-1">Variable</p>
            <select class="field-input !py-1.5 !text-xs" value="" @mousedown="cacheSelectionForVariable" @change="chooseVariable($event.target.value); $event.target.value = ''">
              <option value="" disabled>{{ hasCachedSelection() ? 'Insert into highlighted text…' : currentBinding ? 'Whole layer: ' + (BINDING_FIELDS.find(f => f.key === currentBinding)?.label || currentBinding) : 'Bind whole layer…' }}</option>
              <option v-if="currentBinding" value="__clear__">— Remove binding —</option>
              <option v-for="f in BINDING_FIELDS" :key="f.key" :value="f.key">{{ f.label }}</option>
            </select>
          </div>
          <div v-if="obj.type === 'textbox'" class="rounded-xl border border-surface-mist dark:border-surface-fog p-2 space-y-1.5">
            <p class="field-label">Resize text</p>
            <div class="grid grid-cols-2 gap-1">
              <button class="btn-ghost !text-2xs !py-1.5" :class="{ 'bg-brand-primary-glow': textResizeMode === 'frame' }"
                      @click="setTextResizeMode('frame')">Frame only</button>
              <button class="btn-ghost !text-2xs !py-1.5" :class="{ 'bg-brand-primary-glow': textResizeMode === 'content' }"
                      @click="setTextResizeMode('content')">Frame + text</button>
            </div>
            <p class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">
              <template v-if="textResizeMode === 'frame'">Side handles and W resize the text box only; the font does not stretch. Height follows wrapped lines.</template>
              <template v-else>Corner handles and W/H scale the box and the text inside together.</template>
            </p>
          </div>
          <div>
            <p class="field-label mb-1">Font{{ currentSelectionLabel }}</p>
            <FontPicker :model-value="currentFontFamily" :required-family="originalPsdFont" @update:model-value="setFont" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <p class="field-label mb-1">Size{{ currentSelectionLabel }}</p>
              <input type="number" min="6" max="400" class="field-input !py-1.5 !text-xs"
                     :value="currentFontSize" @input="setTextProp('fontSize', Number($event.target.value))" />
            </div>
            <div>
              <p class="field-label mb-1">Weight{{ currentSelectionLabel }}</p>
              <select class="field-input !py-1.5 !text-xs" :value="currentFontWeight" @change="setTextProp('fontWeight', Number($event.target.value))">
                <option v-for="weight in FONT_WEIGHTS" :key="weight" :value="weight">{{ weight }} · {{ fontWeightLabel(weight) }}</option>
              </select>
            </div>
          </div>
          <div>
            <p class="field-label mb-1">Fill{{ currentSelectionLabel }}</p>
            <FillPicker :model-value="currentFill" @update:model-value="(v) => setTextProp('fill', v)" />
          </div>
          <div class="flex gap-1">
            <button class="btn-ghost !p-1.5 flex-1" :class="{ 'bg-brand-primary-glow': currentFontWeight >= 700 }"
                    @click="setTextProp('fontWeight', currentFontWeight >= 700 ? 400 : 700)">
              <BoldIcon class="w-4 h-4 mx-auto" />
            </button>
            <button class="btn-ghost !p-1.5 flex-1" :class="{ 'bg-brand-primary-glow': currentFontStyle === 'italic' }"
                    @click="setTextProp('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic')">
              <ItalicIcon class="w-4 h-4 mx-auto" />
            </button>
            <button class="btn-ghost !p-1.5 flex-1 font-bold underline" :class="{ 'bg-brand-primary-glow': currentUnderline }"
                    title="Underline (Ctrl/Cmd+U)" @click="setTextProp('underline', !currentUnderline)">U</button>
            <button class="btn-ghost !p-1.5 flex-1 font-bold line-through" :class="{ 'bg-brand-primary-glow': currentLinethrough }"
                    title="Strikethrough" @click="setTextProp('linethrough', !currentLinethrough)">S</button>
          </div>
          <div class="flex gap-1">
            <button v-for="a in ['left','center','right','justify']" :key="a" class="btn-ghost !p-1.5 flex-1"
                    :class="{ 'bg-brand-primary-glow': obj.textAlign === a }" @click="setProp('textAlign', a)">
              <component :is="a === 'left' ? Bars3BottomLeftIcon : a === 'center' || a === 'justify' ? Bars3Icon : Bars3BottomRightIcon" class="w-4 h-4 mx-auto" />
              <span class="sr-only">{{ a }}</span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <p class="field-label mb-1">Baseline{{ currentSelectionLabel }}</p>
              <input type="number" min="-200" max="200" step="1" class="field-input !py-1.5 !text-xs"
                     :value="currentBaselineShift" @input="setTextProp('deltaY', Number($event.target.value))" />
            </div>
            <div>
              <p class="field-label mb-1">Case</p>
              <select class="field-input !py-1.5 !text-xs" value="" @change="transformTextCase($event.target.value); $event.target.value = ''">
                <option value="" disabled>Change case…</option>
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="title">Title Case</option>
                <option value="sentence">Sentence case</option>
              </select>
            </div>
          </div>
          <div>
            <p class="field-label mb-1">Line height — {{ obj.lineHeight?.toFixed(2) }}</p>
            <input type="range" min="0.8" max="2.5" step="0.02" class="w-full accent-brand-gold"
                   :value="obj.lineHeight" @input="setProp('lineHeight', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Letter spacing — {{ ((obj.charSpacing || 0) / 10).toFixed(0) }}</p>
            <input type="range" min="-50" max="400" step="5" class="w-full accent-brand-gold"
                   :value="obj.charSpacing" @input="setProp('charSpacing', Number($event.target.value))" />
          </div>
          <div class="rounded-xl border border-surface-mist dark:border-surface-fog p-2 space-y-2">
            <p class="field-label">Reusable text styles</p>
            <div class="flex gap-1">
              <select class="field-input !py-1.5 !text-xs min-w-0 flex-1" :value="selectedTextStyleId" @change="applyTextStyle($event.target.value)">
                <option value="">Choose a saved style…</option>
                <option v-for="style in textStyles" :key="style.id" :value="style.id">{{ style.name }}</option>
              </select>
              <button class="btn-ghost !text-2xs !py-1.5 shrink-0" title="Save current typography as a reusable style" @click="saveTextStyle">Save</button>
              <button v-if="selectedTextStyleId" class="btn-ghost !text-2xs !py-1.5 shrink-0 text-red-500" title="Delete selected style" @click="deleteTextStyle">Delete</button>
            </div>
            <p class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">Styles are stored on this device and can be applied to a whole layer or highlighted characters.</p>
          </div>
        </div>

        <!-- Shape controls -->
        <div v-else-if="['rect','ellipse','path'].includes(obj.type)" class="space-y-3">
          <button v-if="obj.type === 'path'" class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('edit-path', obj)">Edit anchor points</button>
          <div>
            <p class="field-label mb-1">Fill</p>
            <FillPicker :model-value="obj.fill" @update:model-value="(v) => setProp('fill', v)" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke</p>
            <input type="color" class="w-full h-8 rounded-md cursor-pointer" :value="toHex(obj.stroke) || '#000000'" @input="setProp('stroke', $event.target.value)" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke width — {{ obj.strokeWidth }}</p>
            <input type="range" min="0" max="40" class="w-full accent-brand-gold"
                   :value="obj.strokeWidth" @input="setProp('strokeWidth', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Stroke style</p>
            <div class="flex gap-1">
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': !obj.strokeDashArray }" @click="setProp('strokeDashArray', null)">Solid</button>
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': dashKind(obj.strokeDashArray) === 'dashed' }" @click="setProp('strokeDashArray', [12, 6])">Dashed</button>
              <button class="btn-ghost !text-2xs !py-1 flex-1" :class="{ 'bg-brand-primary-glow': dashKind(obj.strokeDashArray) === 'dotted' }" @click="setProp('strokeDashArray', [2, 4])">Dotted</button>
            </div>
          </div>
          <div>
            <p class="field-label mb-1">Corner join</p>
            <div class="flex gap-1">
              <button v-for="j in ['miter','round','bevel']" :key="j" class="btn-ghost !text-2xs !py-1 flex-1 capitalize"
                      :class="{ 'bg-brand-primary-glow': obj.strokeLineJoin === j }" @click="setProp('strokeLineJoin', j)">{{ j }}</button>
            </div>
          </div>
          <div v-if="obj.type === 'rect'">
            <p class="field-label mb-1">Corner radius — {{ obj.rx || 0 }}</p>
            <input type="range" min="0" max="200" class="w-full accent-brand-gold" :value="obj.rx || 0"
                   @input="setProp('rx', Number($event.target.value)); setProp('ry', Number($event.target.value))" />
          </div>
        </div>

        <div v-else-if="obj.type === 'image' && obj.get('data')?.isQr" class="space-y-3">
          <p class="section-eyebrow">QR code</p>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-2xs font-bold">QR color<input type="color" class="mt-1 w-full h-8 rounded" :value="qrData.fg" @input="updateQr({ fg: $event.target.value })" /></label>
            <label class="text-2xs font-bold">Background<input type="color" class="mt-1 w-full h-8 rounded" :value="qrData.bg" @input="updateQr({ bg: $event.target.value })" /></label>
            <label class="text-2xs font-bold">Border<input type="color" class="mt-1 w-full h-8 rounded" :value="qrData.borderColor" @input="updateQr({ borderColor: $event.target.value })" /></label>
            <label class="text-2xs font-bold">Border width<input type="number" min="0" max="40" class="field-input !py-1.5 !text-xs mt-1" :value="qrData.borderWidth" @change="updateQr({ borderWidth: Number($event.target.value) })" /></label>
            <label class="text-2xs font-bold">Corner radius<input type="number" min="0" max="160" class="field-input !py-1.5 !text-xs mt-1" :value="qrData.borderRadius" @change="updateQr({ borderRadius: Number($event.target.value) })" /></label>
            <label class="text-2xs font-bold">Padding<input type="number" min="0" max="100" class="field-input !py-1.5 !text-xs mt-1" :value="qrData.padding" @change="updateQr({ padding: Number($event.target.value) })" /></label>
          </div>
          <div v-for="position in ['top','bottom']" :key="position" class="rounded-xl border border-surface-mist dark:border-surface-fog p-2 space-y-2">
            <label class="flex items-center gap-2 text-2xs font-bold capitalize">
              <input type="checkbox" class="accent-brand-gold" :checked="qrData[`show${position[0].toUpperCase() + position.slice(1)}Label`]" @change="updateQr({ [`show${position[0].toUpperCase() + position.slice(1)}Label`]: $event.target.checked })" />
              Show {{ position }} label
            </label>
            <template v-if="qrData[`show${position[0].toUpperCase() + position.slice(1)}Label`]">
              <div class="grid grid-cols-2 gap-2">
                <label class="text-2xs">Color<input type="color" class="mt-1 w-full h-7 rounded" :value="qrData[`${position}LabelColor`]" @input="updateQr({ [`${position}LabelColor`]: $event.target.value })" /></label>
                <label class="text-2xs">Size<input type="number" min="8" max="120" class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelFontSize`]" @change="updateQr({ [`${position}LabelFontSize`]: Number($event.target.value) })" /></label>
                <label class="text-2xs col-span-2">Font<input type="text" class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelFontFamily`]" @change="updateQr({ [`${position}LabelFontFamily`]: $event.target.value || 'Arial' })" /></label>
                <label class="text-2xs">Weight
                  <select class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelFontWeight`]" @change="updateQr({ [`${position}LabelFontWeight`]: Number($event.target.value) })">
                    <option :value="400">Regular</option><option :value="600">Semi bold</option><option :value="700">Bold</option><option :value="900">Black</option>
                  </select>
                </label>
                <label class="text-2xs">Style
                  <select class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelFontStyle`]" @change="updateQr({ [`${position}LabelFontStyle`]: $event.target.value })">
                    <option value="normal">Normal</option><option value="italic">Italic</option>
                  </select>
                </label>
                <label class="text-2xs col-span-2">Letter spacing<input type="number" min="-5" max="30" step="0.5" class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelLetterSpacing`]" @change="updateQr({ [`${position}LabelLetterSpacing`]: Number($event.target.value) })" /></label>
                <label class="text-2xs">Offset X<input type="number" min="-200" max="200" class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelOffsetX`]" @change="updateQr({ [`${position}LabelOffsetX`]: Number($event.target.value) })" /></label>
                <label class="text-2xs">Offset Y<input type="number" min="-200" max="200" class="field-input !py-1 !text-xs mt-1" :value="qrData[`${position}LabelOffsetY`]" @change="updateQr({ [`${position}LabelOffsetY`]: Number($event.target.value) })" /></label>
              </div>
            </template>
          </div>
          <p class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">These settings belong to this template and override the event's general QR settings. Missing settings fall back to the event defaults.</p>
        </div>

        <div v-else-if="obj.type === 'image'" class="space-y-3">
          <p class="section-eyebrow">Crop & style</p>
          <div v-if="obj.get('data')?.sourceLayer?.convertedFromText" class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 text-2xs text-amber-800 dark:text-amber-200">
            <p class="font-bold">PSD text preserved as pixels</p>
            <p v-if="obj.get('data')?.sourceLayer?.convertedFromText?.fontFamily" class="mt-0.5">
              Original font: {{ obj.get('data').sourceLayer.convertedFromText.fontFamily }}
            </p>
            <p class="mt-0.5">The current appearance is exact. Convert it only when you need to edit the words.</p>
          </div>
          <button v-if="obj.get('data')?.sourceLayer?.convertedFromText"
                  class="btn-ghost !text-2xs !py-1.5 w-full"
                  title="Restore editable text; advanced Photoshop effects may look different"
                  @click="$emit('restore-text', obj)">
            Make PSD text editable
          </button>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('start-crop', obj)">Crop</button>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('perspective-warp', obj)">Perspective / four-corner warp…</button>
          <div>
            <p class="field-label mb-1">Straighten — {{ obj.angle?.toFixed(0) }}°</p>
            <input type="range" min="-45" max="45" class="w-full accent-brand-gold" :value="obj.angle || 0" @input="setProp('angle', Number($event.target.value))" />
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button v-for="p in STYLE_PRESETS" :key="p.id" class="btn-ghost !text-2xs !py-1" @click="applyStylePreset(p)">{{ p.label }}</button>
          </div>

          <p class="section-eyebrow pt-2">Adjustments</p>
          <div v-for="a in ADJUSTMENTS" :key="a.key">
            <p class="field-label mb-1">{{ a.label }} — {{ adjustments[a.key] }}</p>
            <input type="range" :min="a.min" :max="a.max" step="0.02" class="w-full accent-brand-gold"
                   :value="adjustments[a.key]" @input="setAdjustment(a.key, Number($event.target.value))" />
          </div>

          <p class="section-eyebrow pt-2">Filters</p>
          <div v-for="f in FILTER_GALLERY.filter((entry) => entry.panel !== false)" :key="f.id">
            <label class="flex items-center gap-2 text-2xs font-bold">
              <input type="checkbox" class="accent-brand-gold" :checked="!!galleryFilters[f.id]" @change="toggleFilter(f, $event.target.checked)" />
              {{ f.label }}
            </label>
            <input v-if="f.param && galleryFilters[f.id] !== undefined" type="range" :min="f.param.min" :max="f.param.max" step="0.01"
                   class="w-full accent-brand-gold mt-1" :value="galleryFilters[f.id]" @input="setFilterParam(f, Number($event.target.value))" />
          </div>

          <p class="section-eyebrow pt-2">Background</p>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" :disabled="removingBg" @click="removeBg">
            {{ removingBg ? `Removing… ${bgProgress}` : 'Remove background' }}
          </button>
          <p class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">Runs on this device. The first use downloads the model; later use works offline.</p>

          <p class="section-eyebrow pt-2">Smart object</p>
          <label class="flex items-center gap-2 text-2xs font-bold">
            <input type="checkbox" class="accent-brand-gold" :checked="isShared" @change="$emit('toggle-shared', obj, $event.target.checked)" />
            Shared across templates
          </label>
          <button class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('replace-source', obj)">Replace source file…</button>
          <button v-if="hasOriginalPixels" class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('restore-original-pixels', obj)">Reset pixels to original</button>
          <p v-if="obj.get('data')?.liveCanvas" class="text-[10px] leading-snug text-surface-slate dark:text-surface-ash">Brush, eraser, healing, clone, liquify and background-removal edits are stored on an editable fork. Each completed stroke can be undone from History.</p>
        </div>

        <p v-else class="text-2xs text-surface-slate dark:text-surface-ash">
          {{ obj.type }} — no type-specific controls yet.
        </p>

        <!-- Layer styles -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="section-eyebrow">Layer styles</p>
            <select class="field-input !py-1 !px-2 !text-[10px] w-28" value="" @change="addLayerEffect($event.target.value); $event.target.value = ''">
              <option value="">+ Add effect</option>
              <option v-for="definition in availableEffectTypes" :key="definition.type" :value="definition.type">{{ definition.name }}</option>
            </select>
          </div>
          <p v-if="!layerEffects.length" class="text-[10px] text-surface-slate dark:text-surface-ash">No effects. Add several effects and reorder them independently.</p>
          <div v-for="(effect, index) in layerEffects" :key="effect.id" class="rounded-xl border border-surface-mist dark:border-surface-fog p-2 space-y-2">
            <div class="flex items-center gap-1">
              <input type="checkbox" class="accent-brand-gold" :checked="effect.enabled" @change="updateLayerEffect(effect.id, { enabled: $event.target.checked })" />
              <strong class="text-2xs flex-1">{{ effect.name }}</strong>
              <button class="btn-ghost !p-1 !text-[10px]" :disabled="index === 0" title="Move effect up" @click="moveLayerEffect(index, -1)">↑</button>
              <button class="btn-ghost !p-1 !text-[10px]" :disabled="index === layerEffects.length - 1" title="Move effect down" @click="moveLayerEffect(index, 1)">↓</button>
              <button class="btn-ghost !p-1 !text-[10px] text-red-500" title="Remove effect" @click="removeLayerEffect(effect.id)">×</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <template v-if="effect.type === 'gradientOverlay'">
                <label class="text-[10px]">Start<input type="color" class="mt-1 w-full h-7 rounded" :value="effect.from" @input="updateLayerEffect(effect.id, { from: $event.target.value })" /></label>
                <label class="text-[10px]">End<input type="color" class="mt-1 w-full h-7 rounded" :value="effect.to" @input="updateLayerEffect(effect.id, { to: $event.target.value })" /></label>
                <label class="text-[10px] col-span-2">Opacity<input type="range" min="0" max="1" step="0.01" class="mt-2 w-full accent-brand-gold" :value="effect.opacity" @input="updateLayerEffect(effect.id, { opacity: Number($event.target.value) })" /></label>
                <label class="text-[10px] col-span-2">Angle — {{ effect.angle }}°<input type="range" min="-180" max="180" step="1" class="w-full accent-brand-gold" :value="effect.angle" @input="updateLayerEffect(effect.id, { angle: Number($event.target.value) })" /></label>
              </template>
              <template v-else>
                <label class="text-[10px]">{{ effect.type === 'bevelEmboss' ? 'Highlight' : 'Colour' }}<input type="color" class="mt-1 w-full h-7 rounded" :value="effect.color" @input="updateLayerEffect(effect.id, { color: $event.target.value })" /></label>
                <label class="text-[10px]">Opacity<input type="range" min="0" max="1" step="0.01" class="mt-2 w-full accent-brand-gold" :value="effect.opacity" @input="updateLayerEffect(effect.id, { opacity: Number($event.target.value) })" /></label>
              </template>
              <label v-if="effect.type === 'stroke'" class="text-[10px] col-span-2">Size — {{ effect.size }}<input type="range" min="1" max="100" class="w-full accent-brand-gold" :value="effect.size" @input="updateLayerEffect(effect.id, { size: Number($event.target.value) })" /></label>
              <template v-if="['dropShadow','outerGlow'].includes(effect.type)">
                <label class="text-[10px] col-span-2">Blur — {{ effect.blur }}<input type="range" min="0" max="160" class="w-full accent-brand-gold" :value="effect.blur" @input="updateLayerEffect(effect.id, { blur: Number($event.target.value) })" /></label>
                <label v-if="effect.type === 'dropShadow'" class="text-[10px]">Offset X<input type="number" min="-200" max="200" class="field-input !py-1 !text-xs mt-1" :value="effect.offsetX" @input="updateLayerEffect(effect.id, { offsetX: Number($event.target.value) })" /></label>
                <label v-if="effect.type === 'dropShadow'" class="text-[10px]">Offset Y<input type="number" min="-200" max="200" class="field-input !py-1 !text-xs mt-1" :value="effect.offsetY" @input="updateLayerEffect(effect.id, { offsetY: Number($event.target.value) })" /></label>
              </template>
              <label v-if="effect.type === 'innerShadow'" class="text-[10px] col-span-2">Inner edge — {{ effect.size }}<input type="range" min="1" max="100" class="w-full accent-brand-gold" :value="effect.size" @input="updateLayerEffect(effect.id, { size: Number($event.target.value) })" /></label>
              <template v-if="effect.type === 'bevelEmboss'">
                <label class="text-[10px]">Shadow<input type="color" class="mt-1 w-full h-7 rounded" :value="effect.shadowColor" @input="updateLayerEffect(effect.id, { shadowColor: $event.target.value })" /></label>
                <label class="text-[10px]">Shadow opacity<input type="range" min="0" max="1" step="0.01" class="mt-2 w-full accent-brand-gold" :value="effect.shadowOpacity" @input="updateLayerEffect(effect.id, { shadowOpacity: Number($event.target.value) })" /></label>
                <label class="text-[10px] col-span-2">Size — {{ effect.size }}<input type="range" min="1" max="100" class="w-full accent-brand-gold" :value="effect.size" @input="updateLayerEffect(effect.id, { size: Number($event.target.value) })" /></label>
                <label class="text-[10px] col-span-2">Light angle — {{ effect.angle }}°<input type="range" min="-180" max="180" step="1" class="w-full accent-brand-gold" :value="effect.angle" @input="updateLayerEffect(effect.id, { angle: Number($event.target.value) })" /></label>
              </template>
            </div>
          </div>
        </div>

        <!-- Masking (Batch 12) -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3">
          <p class="field-label mb-1">Masking</p>
          <div class="flex gap-1">
            <button class="btn-ghost !text-2xs !py-1.5 flex-1" @click="$emit('paint-mask', obj)">Refine mask with brush</button>
            <button v-if="obj.clipPath" class="btn-ghost !text-2xs !py-1.5 flex-1" @click="$emit('remove-mask', obj)">Remove mask</button>
          </div>
        </div>

        <!-- Common — every layer type -->
        <div class="border-t border-surface-mist dark:border-surface-fog pt-3 space-y-3">
          <div>
            <p class="field-label mb-1">Position &amp; size</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">X</span>
                <input type="number" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.left || 0)" @change="setProp('left', Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-4">Y</span>
                <input type="number" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.top || 0)" @change="setProp('top', Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-10">{{ textFrameOnly ? 'Frame W' : 'W' }}</span>
                <input type="number" min="1" class="field-input !py-1.5 !text-xs flex-1" :value="Math.round(obj.getScaledWidth())" @change="setWidthPx(Number($event.target.value))" />
              </label>
              <label class="flex items-center gap-1 text-2xs">
                <span class="text-surface-slate dark:text-surface-ash w-10">{{ textFrameOnly ? 'Auto H' : 'H' }}</span>
                <input type="number" min="1" class="field-input !py-1.5 !text-xs flex-1" :disabled="textFrameOnly" :title="textFrameOnly ? 'A text frame grows taller as its text wraps. Switch to Frame + text to scale height and glyphs together.' : ''" :value="Math.round(obj.getScaledHeight())" @change="setHeightPx(Number($event.target.value))" />
              </label>
            </div>
            <label class="flex items-center gap-1.5 text-2xs mt-2">
              <input type="checkbox" class="accent-brand-gold" v-model="lockAspect" />
              <span class="text-surface-slate dark:text-surface-ash">Lock aspect ratio (W/H fields)</span>
            </label>
          </div>
          <div>
            <p class="field-label mb-1">Rotation — {{ Math.round(obj.angle || 0) }}°</p>
            <input type="range" min="-180" max="180" class="w-full accent-brand-gold" :value="obj.angle || 0" @input="setProp('angle', Number($event.target.value))" />
            <button v-if="obj.angle" class="mt-1 text-2xs font-bold text-brand-primary" @click="setProp('angle', 0)">Reset rotation</button>
          </div>
          <div>
            <p class="field-label mb-1">Skew / distort</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-2xs">Horizontal
                <input type="number" min="-85" max="85" step="1" class="field-input !py-1.5 !text-xs mt-1" :value="Math.round(obj.skewX || 0)" @change="setProp('skewX', clampSkew($event.target.value))" />
              </label>
              <label class="text-2xs">Vertical
                <input type="number" min="-85" max="85" step="1" class="field-input !py-1.5 !text-xs mt-1" :value="Math.round(obj.skewY || 0)" @change="setProp('skewY', clampSkew($event.target.value))" />
              </label>
            </div>
            <button v-if="obj.skewX || obj.skewY" class="mt-1 text-2xs font-bold text-brand-primary" @click="resetSkew">Reset distortion</button>
          </div>
          <div class="grid grid-cols-2 gap-1">
            <button class="btn-ghost !text-2xs !py-1.5" @click="flip('x')">Flip horizontal</button>
            <button class="btn-ghost !text-2xs !py-1.5" @click="flip('y')">Flip vertical</button>
          </div>
          <div>
            <p class="field-label mb-1">Opacity — {{ Math.round((obj.opacity ?? 1) * 100) }}%</p>
            <input type="range" min="0" max="1" step="0.01" class="w-full accent-brand-gold"
                   :value="obj.opacity" @input="setProp('opacity', Number($event.target.value))" />
          </div>
          <div>
            <p class="field-label mb-1">Blend mode</p>
            <select class="field-input !py-1.5 !text-xs" :value="compositeToBlend(obj.globalCompositeOperation)" @change="setBlendMode($event.target.value)">
              <option v-for="m in Object.keys(BLEND_MODE_TO_COMPOSITE)" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-1">
            <button class="btn-ghost !text-2xs !py-1.5" @click="$emit('bring-forward', obj)">Bring forward</button>
            <button class="btn-ghost !text-2xs !py-1.5" @click="$emit('send-backward', obj)">Send backward</button>
          </div>
          <button v-if="obj.type !== 'image'" class="btn-ghost !text-2xs !py-1.5 w-full" @click="$emit('rasterize', obj)">Rasterize layer</button>
          <button class="btn-danger !text-2xs !py-1.5 w-full" @click="$emit('delete', obj)">Delete layer</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import * as fabric from 'fabric';
import {
  BoldIcon, ItalicIcon, Bars3BottomLeftIcon, Bars3Icon, Bars3BottomRightIcon,
  Bars3BottomLeftIcon as AlignLeftIcon, ArrowsRightLeftIcon as AlignCenterHIcon, Bars3BottomRightIcon as AlignRightIcon,
  ChevronDoubleUpIcon as AlignTopIcon, ArrowsUpDownIcon as AlignMiddleVIcon, ChevronDoubleDownIcon as AlignBottomIcon,
} from '@heroicons/vue/24/outline';
import FontPicker from './FontPicker.vue';
import FillPicker from './FillPicker.vue';
import { alignObjects, distributeObjects, BLEND_MODE_TO_COMPOSITE, setDropShadow, clearDropShadow, mutateTextPreservingLayout } from '@/utils/canvasEngine';
import { FILTER_GALLERY, toggleGalleryFilter, rebuildFilterStack } from '@/utils/filtersGallery';
import { STYLE_PRESETS } from '@/utils/cropTool';
import { BINDING_FIELDS } from '@/utils/bindingRegistry';
import { removeImageBackground } from '@/utils/backgroundRemoval';
import { applyLayerEffectStack, EFFECT_DEFAULTS, normalizeLayerEffects } from '@/utils/layerEffects';

const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1 },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1 },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1 },
  { key: 'hue', label: 'Hue', min: -1, max: 1 },
];

const props = defineProps({
  canvas: { type: Object, required: true },
  selected: { type: Array, default: () => [] },
});
const emit = defineEmits(['bring-forward', 'send-backward', 'delete', 'clip-mask', 'paint-mask', 'remove-mask', 'toggle-shared', 'replace-source', 'restore-original-pixels', 'start-crop', 'perspective-warp', 'rasterize', 'restore-text', 'update-qr', 'edit-path']);

// Fabric objects in `selected` are markRaw'd (see TemplateStudioView.vue's
// refreshLayersList comment) — Vue never tracks mutations to them, which
// is correct for the canvas itself (Fabric owns its own render loop) but
// means every `:value="obj.someProp"` binding in this panel goes stale
// the instant you edit that same still-selected object: the canvas
// updates correctly, but the panel's own inputs silently stop reflecting
// reality (a typed Width commits fine, but the Height field next to it —
// or the same field on next render — shows the old number, reading as
// "this didn't work" or "lock aspect ratio doesn't work" even though the
// underlying scale WAS applied correctly). `tick` is bumped on every
// object mutation and read (via `void tick.value`) inside `obj`, so
// Vue's dependency tracking treats every property read through `obj` as
// depending on it — one counter forces the whole panel to re-render
// instead of every single control needing its own workaround.
const tick = ref(0);
let detachTick = null;
watch(() => props.canvas, (canvas) => {
  detachTick?.();
  detachTick = null;
  if (!canvas) return;
  const bump = () => { tick.value++; };
  // A Textbox's normal side controls already resize its paragraph width, but
  // imported canvas JSON (and a few touch/trackpad gestures) can still reach
  // Fabric's generic scale path.  In frame mode that must *never* stretch the
  // glyphs.  Convert such a transform into a width change while it is being
  // performed, before Fabric paints the scaled text.
  const keepTextFrameUnscaled = ({ target }) => {
    if (target?.type !== 'textbox' || (target.get('data')?.textResizeMode || 'frame') !== 'frame') return;
    const scaleX = Math.abs(Number(target.scaleX) || 1);
    const scaleY = Math.abs(Number(target.scaleY) || 1);
    if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) return;
    target.set({
      width: Math.max(1, (Number(target.width) || 1) * scaleX),
      scaleX: 1,
      scaleY: 1,
    });
    target.initDimensions?.();
    target.setCoords();
    canvas.requestRenderAll();
  };
  const events = ['object:modified', 'object:scaling', 'object:moving', 'object:rotating', 'text:changed', 'text:selection:changed', 'text:editing:entered', 'text:editing:exited'];
  events.forEach((ev) => canvas.on(ev, bump));
  canvas.on('object:scaling', keepTextFrameUnscaled);
  detachTick = () => {
    events.forEach((ev) => canvas.off(ev, bump));
    canvas.off('object:scaling', keepTextFrameUnscaled);
  };
}, { immediate: true });
onBeforeUnmount(() => detachTick?.());

const obj = computed(() => { void tick.value; return props.selected[0]; });
const hasOriginalPixels = computed(() => {
  void tick.value;
  const data = obj.value?.get('data') || {};
  const hasOriginal = !!(data.originalAssetId || data.originalLocalAssetId);
  const currentlyOriginal = !data.liveCanvas
    && (!data.originalAssetId || data.assetId === data.originalAssetId)
    && (!data.originalLocalAssetId || data.localAssetId === data.originalLocalAssetId);
  return hasOriginal && !currentlyOriginal;
});
const ADJUSTMENT_LAYER_CONTROLS = {
  brightnessContrast: [
    { key: 'brightness', label: 'Brightness', min: -1, max: 1, default: 0 },
    { key: 'contrast', label: 'Contrast', min: -1, max: 1, default: 0 },
  ],
  hueSaturation: [
    { key: 'hue', label: 'Hue', min: -1, max: 1, default: 0 },
    { key: 'saturation', label: 'Saturation', min: -1, max: 1, default: 0 },
  ],
  levels: [
    { key: 'levelsBlack', label: 'Black point', min: 0, max: 254, step: 1, default: 0 },
    { key: 'levelsGamma', label: 'Gamma', min: 0.1, max: 3, step: 0.01, default: 1 },
    { key: 'levelsWhite', label: 'White point', min: 1, max: 255, step: 1, default: 255 },
  ],
  colorBalance: [
    { key: 'balanceRed', label: 'Cyan / Red', min: -1, max: 1, default: 0 },
    { key: 'balanceGreen', label: 'Magenta / Green', min: -1, max: 1, default: 0 },
    { key: 'balanceBlue', label: 'Yellow / Blue', min: -1, max: 1, default: 0 },
  ],
};
const adjustmentLayerValues = computed(() => obj.value?.get('data')?.adjustmentValues || {});
const adjustmentLayerControls = computed(() => ADJUSTMENT_LAYER_CONTROLS[obj.value?.get('data')?.adjustmentKind] || ADJUSTMENT_LAYER_CONTROLS.brightnessContrast);
function setAdjustmentLayerValue(key, value) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, adjustmentValues: { ...(data.adjustmentValues || {}), [key]: value } });
  props.canvas.fire('object:modified', { target: obj.value });
}
const qrData = computed(() => ({
  fg: '#111111', bg: '#FFFFFF', borderColor: '#111111', borderWidth: 0, borderRadius: 0, padding: 12,
  showTopLabel: true, showBottomLabel: true, topLabelColor: '#111111', bottomLabelColor: '#111111',
  topLabelFontFamily: 'Arial', bottomLabelFontFamily: 'Arial', topLabelFontWeight: 700, bottomLabelFontWeight: 700,
  topLabelFontStyle: 'normal', bottomLabelFontStyle: 'normal', topLabelLetterSpacing: 1, bottomLabelLetterSpacing: 1,
  topLabelFontSize: 28, bottomLabelFontSize: 28, topLabelOffsetX: 0, topLabelOffsetY: 0,
  bottomLabelOffsetX: 0, bottomLabelOffsetY: 0, ...(obj.value?.get('data') || {}),
}));
function updateQr(patch) { emit('update-qr', obj.value, patch); }
function isTextObject(o) { return ['textbox', 'text', 'i-text'].includes(o?.type); }
const originalPsdFont = computed(() => obj.value?.get('data')?.sourceLayer?.convertedFromText?.fontFamily
  || obj.value?.get('data')?.sourceLayer?.fontFamily
  || '');
const availableEffectTypes = Object.values(EFFECT_DEFAULTS);
const layerEffects = computed(() => normalizeLayerEffects(obj.value?.get('data')?.layerEffects || obj.value?.get('data')?.sourceLayer?.effects || []));

function commitLayerEffects(next) {
  applyLayerEffectStack(obj.value, next);
  if (obj.value.type === 'image') rebuildFilterStack(obj.value);
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
  tick.value++;
}
function addLayerEffect(type) {
  if (!EFFECT_DEFAULTS[type]) return;
  const effect = { ...EFFECT_DEFAULTS[type], id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  commitLayerEffects([...layerEffects.value, effect]);
}
function updateLayerEffect(id, patch) { commitLayerEffects(layerEffects.value.map((effect) => effect.id === id ? { ...effect, ...patch } : effect)); }
function removeLayerEffect(id) { commitLayerEffects(layerEffects.value.filter((effect) => effect.id !== id)); }
function moveLayerEffect(index, direction) {
  const next = [...layerEffects.value]; const destination = index + direction;
  if (destination < 0 || destination >= next.length) return;
  [next[index], next[destination]] = [next[destination], next[index]];
  commitLayerEffects(next);
}
const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const TEXT_STYLE_STORAGE_KEY = 'studio.textStyles.v1';
const selectedTextStyleId = ref('');
const textStyles = ref(loadTextStyles());

function loadTextStyles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEXT_STYLE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTextStyles() {
  localStorage.setItem(TEXT_STYLE_STORAGE_KEY, JSON.stringify(textStyles.value));
}

function fontWeightLabel(weight) {
  return ({ 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi bold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' })[weight] || 'Custom';
}

function dashKind(arr) {
  if (!arr) return null;
  return arr[0] <= 3 ? 'dotted' : 'dashed';
}

const ALIGN_MODES = [
  { value: 'left', label: 'Align left', icon: AlignLeftIcon },
  { value: 'center-h', label: 'Align center', icon: AlignCenterHIcon },
  { value: 'right', label: 'Align right', icon: AlignRightIcon },
  { value: 'top', label: 'Align top', icon: AlignTopIcon },
  { value: 'middle-v', label: 'Align middle', icon: AlignMiddleVIcon },
  { value: 'bottom', label: 'Align bottom', icon: AlignBottomIcon },
];

function toHex(v) {
  if (!v || typeof v !== 'string') return '#000000';
  return v.startsWith('#') ? v : '#000000';
}

function setProp(key, value) {
  obj.value.set(key, value);
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value }); // feeds the history stack (Batch 8)
}
function clampSkew(value) { return Math.max(-85, Math.min(85, Number(value) || 0)); }
function resetSkew() {
  obj.value.set({ skewX: 0, skewY: 0 });
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function flip(axis) {
  const key = axis === 'x' ? 'scaleX' : 'scaleY';
  setProp(key, -(obj.value[key] || 1));
}

// A text layer has two intentionally different resize behaviours. A
// paragraph frame changes wrapping without distorting glyphs; content scale
// changes the frame and glyphs together. Persist the choice on the layer and
// change the visible Fabric handles to match, so neither action is implicit.
const textResizeMode = computed(() => obj.value?.get('data')?.textResizeMode || 'frame');
const textFrameOnly = computed(() => obj.value?.type === 'textbox' && textResizeMode.value === 'frame');
function applyTextResizeControls(target) {
  if (target?.type !== 'textbox' || typeof target.setControlsVisibility !== 'function') return;
  const frame = (target.get('data')?.textResizeMode || 'frame') === 'frame';
  // Explicitly restore Fabric's Textbox width action.  This matters for PSD
  // imports where a serialized control set may otherwise retain the generic
  // object-scale handler even after the layer becomes a Textbox.
  if (frame) {
    if (target.controls?.ml) target.controls.ml.actionHandler = fabric.controlsUtils.changeWidth;
    if (target.controls?.mr) target.controls.mr.actionHandler = fabric.controlsUtils.changeWidth;
  }
  target.set({ lockScalingY: frame });
  target.setControlsVisibility({
    mt: false, mb: false,
    ml: frame, mr: frame,
    tl: !frame, tr: !frame, bl: !frame, br: !frame,
    mtr: true,
  });
  target.setCoords();
}
function setTextResizeMode(mode) {
  const target = obj.value;
  if (target?.type !== 'textbox') return;
  const data = target.get('data') || {};
  target.set('data', { ...data, textResizeMode: mode === 'content' ? 'content' : 'frame' });
  applyTextResizeControls(target);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target });
}
watch(obj, (target) => applyTextResizeControls(target), { immediate: true });

// ── Numeric W/H fields ───────────────────────────────────────────────────
// Fabric objects always expose their unscaled intrinsic width/height
// regardless of type (Rect, Ellipse, Textbox, Image, Path all support it),
// so resizing via scaleX/scaleY here works uniformly across every layer
// type instead of needing type-specific size logic.
const lockAspect = ref(false);
function setWidthPx(px) {
  if (!px || px <= 0) return;
  if (textFrameOnly.value) {
    // Textbox.width is its paragraph frame.  Clearing transform scale here
    // makes the numeric Frame W field obey exactly the same no-font-scaling
    // contract as the left/right canvas handles.
    obj.value.set({ width: px, scaleX: 1, scaleY: 1 });
    obj.value.initDimensions?.();
    obj.value.setCoords();
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: obj.value });
    return;
  }
  const scaleX = px / (obj.value.width || 1);
  if (lockAspect.value) {
    const ratio = obj.value.scaleY / (obj.value.scaleX || 1);
    obj.value.set({ scaleX, scaleY: scaleX * ratio });
  } else {
    obj.value.set('scaleX', scaleX);
  }
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setHeightPx(px) {
  if (!px || px <= 0) return;
  if (textFrameOnly.value) return;
  const scaleY = px / (obj.value.height || 1);
  if (lockAspect.value) {
    const ratio = obj.value.scaleX / (obj.value.scaleY || 1);
    obj.value.set({ scaleY, scaleX: scaleY * ratio });
  } else {
    obj.value.set('scaleY', scaleY);
  }
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// Clicking any control in this panel (a <select>, a color input, a number
// field) steals DOM focus away from the hidden <textarea> Fabric uses for
// text editing — which makes Fabric exit editing and clear
// isEditing/selectionStart/selectionEnd before the click handler even
// runs. Without caching, every one of these controls would silently no-op
// the instant you touched them. `cachedSelection` snapshots the live
// selection on the control's OWN mousedown (which fires before the
// resulting blur on the canvas), so the actual `change`/`click` handler
// still has something valid to act on afterward.
const cachedSelection = ref(null); // { obj, start, end }
function captureSelectionNow() {
  const o = obj.value;
  if (isTextObject(o) && o.isEditing && o.selectionStart !== o.selectionEnd) {
    cachedSelection.value = { obj: o, start: o.selectionStart, end: o.selectionEnd };
  }
}
watch(tick, captureSelectionNow);
function cacheSelectionForVariable() { captureSelectionNow(); }

// Range-based (only true once something is actually highlighted, live or cached).
function getEffectiveSelection() {
  const o = obj.value;
  if (!isTextObject(o)) return null;
  if (o.isEditing && o.selectionStart !== o.selectionEnd) return { obj: o, start: o.selectionStart, end: o.selectionEnd };
  if (cachedSelection.value?.obj === o) return cachedSelection.value;
  return null;
}
function hasCachedSelection() { return !!getEffectiveSelection(); }

// Position-based (works for a plain collapsed cursor too, not just a
// highlighted range) — this is what makes the Font/Size/Fill fields show
// what's actually AT the cursor as you click around a multi-styled text
// layer, instead of always showing the layer's one base style.
function getCursorPosition() {
  const o = obj.value;
  if (!isTextObject(o)) return null;
  if (o.isEditing) return { obj: o, at: o.selectionStart };
  if (cachedSelection.value?.obj === o) return { obj: o, at: cachedSelection.value.start };
  return null;
}
function readStyleAt(key, fallback) {
  // Fabric objects are markRaw'd (non-reactive), so mutating character
  // styles via setSelectionStyles() is invisible to Vue's dependency
  // tracking — nothing here would ever re-run without this. `tick` is
  // bumped on the canvas's own 'object:modified' et al. (see above); just
  // reading it pulls this computed into that reactivity, which is the
  // whole reason it exists elsewhere in this file. Without it, "FONT
  // (SELECTION)" kept showing whatever font was there before you picked a
  // new one — the picker's own change() had already applied correctly,
  // this readout just never refreshed to reflect it.
  void tick.value;
  const pos = getCursorPosition();
  if (!pos) return fallback;
  const len = (pos.obj.text || '').length;
  if (!len) return fallback;
  const idx = Math.max(0, Math.min(pos.at, len - 1));
  return pos.obj.getSelectionStyles(idx, idx + 1)[0]?.[key] ?? fallback;
}
const currentSelectionLabel = computed(() => (hasCachedSelection() ? ' (selection)' : ''));
const currentFontFamily = computed(() => readStyleAt('fontFamily', obj.value?.fontFamily));
const currentFontSize = computed(() => readStyleAt('fontSize', obj.value?.fontSize));
const currentFill = computed(() => readStyleAt('fill', obj.value?.fill));
const currentFontWeight = computed(() => Number(readStyleAt('fontWeight', obj.value?.fontWeight)) || 400);
const currentFontStyle = computed(() => readStyleAt('fontStyle', obj.value?.fontStyle || 'normal'));
const currentUnderline = computed(() => !!readStyleAt('underline', obj.value?.underline));
const currentLinethrough = computed(() => !!readStyleAt('linethrough', obj.value?.linethrough));
const currentBaselineShift = computed(() => Number(readStyleAt('deltaY', 0)) || 0);

// Applies to just the highlighted range when one exists (live or cached),
// or to the whole layer otherwise.
function setTextProp(key, value) {
  const sel = getEffectiveSelection();
  if (sel) {
    sel.obj.setSelectionStyles({ [key]: value }, sel.start, sel.end);
    sel.obj.dirty = true;
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: sel.obj });
  } else {
    setProp(key, value);
  }
}
function setFont(family) {
  const sel = getEffectiveSelection();
  const target = sel?.obj || obj.value;
  mutateTextPreservingLayout(target, () => {
    if (sel) target.setSelectionStyles({ fontFamily: family }, sel.start, sel.end);
    else target.set('fontFamily', family);
  });
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target });
}

function transformCase(value, mode) {
  if (mode === 'upper') return value.toLocaleUpperCase();
  if (mode === 'lower') return value.toLocaleLowerCase();
  if (mode === 'title') return value.toLocaleLowerCase().replace(/(^|[\s\-–—/([{])([\p{L}\p{N}])/gu, (_, prefix, char) => prefix + char.toLocaleUpperCase());
  if (mode === 'sentence') return value.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)([\p{L}\p{N}])/gu, (_, prefix, char) => prefix + char.toLocaleUpperCase());
  return value;
}

function transformTextCase(mode) {
  if (!mode) return;
  const target = obj.value;
  const sel = getEffectiveSelection();
  mutateTextPreservingLayout(target, () => {
    if (sel) {
      const original = target.text.slice(sel.start, sel.end);
      target.insertChars(transformCase(original, mode), undefined, sel.start, sel.end);
    } else {
      target.set('text', transformCase(target.text || '', mode));
    }
  });
  target.dirty = true;
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target });
}

function currentTextStyleSnapshot() {
  return {
    fontFamily: currentFontFamily.value,
    fontSize: Number(currentFontSize.value) || 40,
    fontWeight: currentFontWeight.value,
    fontStyle: currentFontStyle.value,
    fill: currentFill.value,
    underline: currentUnderline.value,
    linethrough: currentLinethrough.value,
    deltaY: currentBaselineShift.value,
    textAlign: obj.value?.textAlign || 'left',
    lineHeight: Number(obj.value?.lineHeight) || 1.16,
    charSpacing: Number(obj.value?.charSpacing) || 0,
  };
}

function saveTextStyle() {
  const defaultName = `${currentFontFamily.value || 'Text'} ${currentFontWeight.value}`;
  const name = window.prompt('Name this text style', defaultName)?.trim();
  if (!name) return;
  const style = { id: `text-style-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, ...currentTextStyleSnapshot() };
  textStyles.value = [...textStyles.value, style];
  selectedTextStyleId.value = style.id;
  persistTextStyles();
}

function applyTextStyle(id) {
  selectedTextStyleId.value = id;
  const style = textStyles.value.find((entry) => entry.id === id);
  if (!style) return;
  const { id: _id, name: _name, textAlign, lineHeight, charSpacing, ...characterStyle } = style;
  const sel = getEffectiveSelection();
  const target = sel?.obj || obj.value;
  mutateTextPreservingLayout(target, () => {
    if (sel) target.setSelectionStyles(characterStyle, sel.start, sel.end);
    else target.set({ ...characterStyle, textAlign, lineHeight, charSpacing });
  });
  target.dirty = true;
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target });
}

function deleteTextStyle() {
  if (!selectedTextStyleId.value) return;
  textStyles.value = textStyles.value.filter((entry) => entry.id !== selectedTextStyleId.value);
  selectedTextStyleId.value = '';
  persistTextStyles();
}

// ── Variable — one control for both whole-layer binding and inline tokens ──
// With a highlighted range: swaps just that text for a {{binding.key}}
// token (substituteBindings() on the server already replaces every
// {{...}} match in a string, so a layer can carry several of these with
// zero renderer changes). With nothing highlighted: binds the whole layer,
// same as before.
const currentBinding = computed(() => obj.value?.get('data')?.binding || '');
function chooseVariable(key) {
  if (!key) return;
  const sel = getEffectiveSelection();
  if (sel) {
    const token = `{{${key}}}`;
    sel.obj.insertChars(token, undefined, sel.start, sel.end);
    sel.obj.dirty = true;
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: sel.obj });
    cachedSelection.value = null;
    return;
  }
  setBinding(key === '__clear__' ? '' : key);
}
function setBinding(key) {
  const target = obj.value;
  // A variable placeholder is often much shorter than the text it replaces.
  // Preserve the exact rectangle the operator drew; a binding must change
  // content only, never turn a paragraph frame into a tiny glyph-sized box.
  mutateTextPreservingLayout(target, () => {
    const data = target.get('data') || {};
    target.set('data', { ...data, binding: key || null });
    // Bound layers show their literal {{key}} placeholder as the actual text
    // content — this is what the server-side renderer finds and substitutes.
    target.set('text', key ? `{{${key}}}` : 'Double-click to edit');
  });
  target.dirty = true;
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target });
}

// ── Layer style — drop shadow (Batch 14) ────────────────────────────────
const shadowHex = computed(() => {
  const c = obj.value?.shadow?.color;
  if (!c) return '#000000';
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#000000';
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
});
const styleStrokeEnabled = computed(() => !!obj.value?.stroke && Number(obj.value?.strokeWidth || 0) > 0);
const styleStrokeColor = computed(() => toHex(obj.value?.stroke) || '#000000');
function toggleStyleStroke(on) {
  obj.value.set({ stroke: on ? (obj.value.stroke || '#000000') : null, strokeWidth: on ? Math.max(1, Number(obj.value.strokeWidth || 2)) : 0 });
  obj.value.setCoords();
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setStyleStrokeColor(color) { obj.value.set({ stroke: color, strokeWidth: Math.max(1, Number(obj.value.strokeWidth || 2)) }); props.canvas.requestRenderAll(); props.canvas.fire('object:modified', { target: obj.value }); }
const isOuterGlow = computed(() => !!obj.value?.get('data')?.outerGlow);
function toggleShadow(on) {
  if (on) {
    obj.value.set('data', { ...(obj.value.get('data') || {}), outerGlow: false });
    setDropShadow(props.canvas, obj.value, {});
  }
  else clearDropShadow(props.canvas, obj.value);
}
function toggleOuterGlow(on) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, outerGlow: on });
  if (on) obj.value.set('shadow', new fabric.Shadow({ color: 'rgba(192,111,239,0.75)', blur: 24, offsetX: 0, offsetY: 0 }));
  else clearDropShadow(props.canvas, obj.value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setShadowProp(key, value) {
  obj.value.shadow.set(key, value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setShadowColor(hex) {
  const alpha = obj.value.shadow.color.match(/[\d.]+\)$/)?.[0]?.replace(')', '') || '0.6';
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  obj.value.shadow.set('color', `rgba(${r},${g},${b},${alpha})`);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Adjustments — image layers only (Batch 15) ──────────────────────────
const adjustments = computed(() => obj.value?.get('data')?.adjustments || { brightness: 0, contrast: 0, saturation: 0, hue: 0 });
function setAdjustment(key, value) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, adjustments: { ...adjustments.value, [key]: value } });
  rebuildFilterStack(obj.value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

function applyStylePreset(preset) {
  const data = obj.value.get('data') || {};
  obj.value.set('data', { ...data, adjustments: { ...preset.values } });
  rebuildFilterStack(obj.value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Filters gallery (Batch 16) ──────────────────────────────────────────
const galleryFilters = computed(() => obj.value?.get('data')?.galleryFilters || {});
function toggleFilter(f, on) {
  toggleGalleryFilter(obj.value, f.id, on ? (f.param ? f.param.default : true) : null);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}
function setFilterParam(f, value) {
  toggleGalleryFilter(obj.value, f.id, value);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

// ── Background removal (Batch 19) ───────────────────────────────────────
const removingBg = ref(false);
const bgProgress = ref('');
async function removeBg() {
  removingBg.value = true;
  bgProgress.value = '';
  try {
    await removeImageBackground(obj.value, {
      onProgress: ({ current, total }) => { bgProgress.value = total ? `${Math.round((current / total) * 100)}%` : ''; },
    });
    props.canvas.requestRenderAll();
    props.canvas.fire('object:modified', { target: obj.value });
  } finally {
    removingBg.value = false;
  }
}

// ── Smart objects (Batch 20) ────────────────────────────────────────────
const isShared = computed(() => !!obj.value?.get('data')?.assetShared);

function compositeToBlend(composite) {
  return Object.keys(BLEND_MODE_TO_COMPOSITE).find((k) => BLEND_MODE_TO_COMPOSITE[k] === composite) || 'normal';
}
function setBlendMode(mode) {
  obj.value.set('globalCompositeOperation', BLEND_MODE_TO_COMPOSITE[mode] || 'source-over');
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', { target: obj.value });
}

function selectionBounds() {
  const lefts = props.selected.map((o) => o.left);
  const tops = props.selected.map((o) => o.top);
  const rights = props.selected.map((o) => o.left + o.getScaledWidth());
  const bottoms = props.selected.map((o) => o.top + o.getScaledHeight());
  const left = Math.min(...lefts), top = Math.min(...tops);
  return { left, top, width: Math.max(...rights) - left, height: Math.max(...bottoms) - top };
}
function align(mode) {
  alignObjects(props.selected, selectionBounds(), mode);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', {});
}
function distribute(axis) {
  distributeObjects(props.selected, axis);
  props.canvas.requestRenderAll();
  props.canvas.fire('object:modified', {});
}
</script>
