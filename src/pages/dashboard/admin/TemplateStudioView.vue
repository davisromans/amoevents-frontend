<template>
  <div class="h-screen flex flex-col bg-surface-ivory dark:bg-surface-night overflow-hidden">
    <!-- Top bar -->
    <div class="h-14 shrink-0 flex items-center gap-2 px-4 border-b border-surface-mist dark:border-surface-fog surface-card !rounded-none">
      <button class="btn-ghost !px-2" title="Close studio" @click="closeStudio">
        <ArrowLeftIcon class="w-4 h-4" />
      </button>
      <input v-model="name" class="bg-transparent text-heading font-bold outline-none w-56 truncate"
             placeholder="Untitled template" />
      <span class="text-2xs text-surface-slate dark:text-surface-ash">
        {{ document ? `${document.width}×${document.height}px` : '' }}
      </span>

      <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="onImageFileChosen" />
      <input ref="psdInputRef" type="file" accept=".psd,image/vnd.adobe.photoshop" class="hidden" @change="onPsdFileChosen" />

      <!-- Preview toggle (Batch 22) — swaps every bound text layer between its {{binding}} placeholder and sample data -->
      <button class="btn-ghost !text-2xs !py-1.5 !px-3 ml-1" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': previewMode }" @click="togglePreview">
        {{ previewMode ? 'Editing sample data' : 'Preview with sample data' }}
      </button>


      <!-- Undo/redo -->
      <div class="flex items-center gap-1 ml-1">
        <button class="btn-ghost !p-1.5" :disabled="!historyCanUndo" title="Undo (Ctrl+Z)" @click="undo">
          <ArrowUturnLeftIcon class="w-4 h-4" :class="{ 'opacity-30': !historyCanUndo }" />
        </button>
        <button class="btn-ghost !p-1.5" :disabled="!historyCanRedo" title="Redo (Ctrl+Shift+Z)" @click="redo">
          <ArrowUturnRightIcon class="w-4 h-4" :class="{ 'opacity-30': !historyCanRedo }" />
        </button>
      </div>

      <div class="flex-1" />

      <!-- Zoom controls -->
      <div class="flex items-center gap-1 surface-inset rounded-lg p-1">
        <button class="btn-ghost !p-1.5" title="Zoom out 5% (Ctrl/Cmd −)" @click="zoomBy(-5)"><MinusIcon class="w-3.5 h-3.5" /></button>
        <button class="text-2xs font-bold w-12 text-center" title="Fit to screen (Ctrl/Cmd 0)" @click="fitZoomToViewport(); applyZoom()">{{ Math.round(zoom * 100) }}%</button>
        <button class="btn-ghost !p-1.5" title="Zoom in 5% (Ctrl/Cmd +)" @click="zoomBy(5)"><PlusIcon class="w-3.5 h-3.5" /></button>
      </div>
      <div class="relative flex items-center">
        <button class="btn-ghost !p-1.5" :class="{ 'text-brand-primary': showGrid }" @click="showGrid = !showGrid" title="Toggle grid">
          <Squares2X2Icon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !px-1 !py-1.5" title="Grid size" @click="gridMenuOpen = !gridMenuOpen">
          <ChevronDownIcon class="w-3 h-3" />
        </button>
        <div v-if="gridMenuOpen" class="absolute top-full right-0 mt-1 z-30 surface-card shadow-card p-1 rounded-lg flex flex-col gap-0.5 w-28">
          <button v-for="s in GRID_SIZES" :key="s" class="btn-ghost !text-2xs !py-1 !justify-start !px-2"
                  :class="{ 'bg-brand-primary-glow': gridSize === s }" @click="gridSize = s; gridMenuOpen = false">
            {{ s === 10 ? 'Small' : s === 20 ? 'Medium' : s === 40 ? 'Large' : 'X-Large' }} ({{ s }}px)
          </button>
          <label class="flex items-center gap-2 px-2 py-1 text-2xs font-bold">
            <input v-model="snapToGrid" type="checkbox" class="accent-brand-gold" /> Snap to grid
          </label>
        </div>
      </div>
      <button class="btn-ghost !p-1.5" :class="{ 'text-brand-primary': showRulers }" @click="showRulers = !showRulers" title="Toggle rulers">
        <ViewfinderCircleIcon class="w-4 h-4" />
      </button>
      <button class="btn-ghost !p-1.5" title="Keyboard shortcuts (?)" @click="showShortcuts = true">
        <QuestionMarkCircleIcon class="w-4 h-4" />
      </button>

      <span class="text-2xs mr-1" :class="isOnline ? 'text-emerald-600' : 'text-red-500'">
        {{ isOnline ? (autosaveStatus === 'pending' ? 'Saving local draft…' : autosaveStatus === 'cloud' ? 'Saved to cloud' : autosaveStatus === 'local' ? 'Saved locally' : 'Online') : 'Offline — edits stay on this device' }}
      </span>
      <div class="relative">
        <button class="btn-ghost !text-2xs !py-1.5 !px-3 flex items-center gap-1" :disabled="exporting" @click="exportMenuOpen = !exportMenuOpen">
          {{ exporting ? 'Exporting…' : 'Export' }}
          <ChevronDownIcon class="w-3 h-3" />
        </button>
        <div v-if="exportMenuOpen" class="absolute top-full right-0 mt-1 z-30 surface-card shadow-card p-1 rounded-lg flex flex-col gap-0.5 w-56">
          <button class="btn-ghost !text-2xs !py-1.5 !justify-start !px-2" @click="psdInputRef?.click(); exportMenuOpen = false">Open PSD from device</button>
          <p class="px-2 pb-1 text-[10px] leading-tight text-surface-slate dark:text-surface-ash">Opens on this device and works offline; publish only when you choose Save to cloud.</p>
          <div class="border-t border-surface-mist dark:border-surface-fog my-0.5" />
          <button class="btn-ghost !text-2xs !py-1.5 !justify-start !px-2" @click="exportImage('png')">Export as PNG</button>
          <button class="btn-ghost !text-2xs !py-1.5 !justify-start !px-2" @click="exportImage('jpeg')">Export as JPEG</button>
          <button class="btn-ghost !text-2xs !py-1.5 !justify-start !px-2" @click="exportPsd">Export layered PSD</button>
          <p class="px-2 pb-1 text-[10px] leading-tight text-surface-slate dark:text-surface-ash">PSD keeps layers and appearance; text is rasterized for reliable Photoshop fidelity.</p>
        </div>
      </div>
      <button class="btn-ghost !text-2xs !py-1.5 !px-3" @click="saveLocalDraft({ notify: true })">Save locally</button>
      <AppButton :loading="saving" :disabled="!isOnline" @click="save">Save to cloud</AppButton>
    </div>

    <!-- Page tabs — only shown once a document actually has more than one
         page (front/back, etc). No "+ Add page" entry point in the main
         UI; that space is Layers panel territory now. -->
    <div v-if="pages.length > 1" class="h-9 shrink-0 flex items-center gap-1 px-4 border-b border-surface-mist dark:border-surface-fog surface-card !rounded-none overflow-x-auto">
      <div v-for="(p, i) in pages" :key="i" class="group flex items-center rounded-md whitespace-nowrap"
           :class="i === activePage ? 'bg-brand-primary-glow text-brand-primary-deep' : 'text-surface-slate dark:text-surface-ash hover:text-surface-charcoal dark:hover:text-surface-bone'">
        <input v-if="renamingPage === i" v-model="pageNameDraft" class="w-20 bg-transparent text-2xs font-bold outline-none px-2 py-1"
               @keydown.enter="commitPageRename(i)" @keydown.esc="renamingPage = null" @blur="commitPageRename(i)" />
        <button v-else class="px-3 py-1 text-2xs font-bold" @click="switchPage(i)" @dblclick="startPageRename(i)">
          {{ p.name }}
        </button>
        <button class="hidden group-hover:block pr-1.5 opacity-60 hover:opacity-100" title="Duplicate page" @click.stop="duplicatePage(i)">
          <DocumentDuplicateIcon class="w-3 h-3" />
        </button>
        <button class="hidden group-hover:block pr-2 opacity-60 hover:opacity-100" title="Delete page" @click.stop="removePage(i)">
          <XMarkIcon class="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>

    <!-- Tool options bar — Photoshop convention: a full-width strip below
         the top bar showing controls for whichever tool is active. Was
         previously crammed into the 48px-wide vertical rail, where a
         select + color swatch + range slider had no room to be usable. -->
    <div v-if="['brush','clone','dodge','eraser'].includes(tool)" class="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-surface-mist dark:border-surface-fog surface-card !rounded-none">
      <span class="text-2xs font-bold uppercase tracking-widest text-surface-slate dark:text-surface-ash">
        {{ tool === 'brush' ? 'Brush' : tool === 'clone' ? 'Clone stamp' : tool === 'eraser' ? 'Eraser' : 'Dodge / Burn' }}
      </span>
      <label v-if="tool === 'brush'" class="flex items-center gap-1.5 text-2xs">
        Color <input type="color" v-model="brushColor" class="w-6 h-6 rounded cursor-pointer" />
      </label>
      <label class="flex items-center gap-1.5 text-2xs">
        Size <input type="range" min="2" max="1500" v-model.number="brushSize" class="w-32 accent-brand-gold" />
        <span class="w-8 text-right tabular-nums">{{ brushSize }}px</span>
      </label>
      <label v-if="['brush','eraser'].includes(tool)" class="flex items-center gap-1.5 text-2xs">
        Hardness <input type="range" min="0" max="1" step="0.05" v-model.number="brushHardness" class="w-24 accent-brand-gold" />
        <span class="w-9 text-right tabular-nums">{{ Math.round(brushHardness * 100) }}%</span>
      </label>
      <div v-if="tool === 'dodge'" class="flex gap-1">
        <button class="btn-ghost !text-2xs !py-1 !px-2" :class="{ 'bg-brand-primary-glow': dodgeMode === 'dodge' }" @click="dodgeMode = 'dodge'">Dodge</button>
        <button class="btn-ghost !text-2xs !py-1 !px-2" :class="{ 'bg-brand-primary-glow': dodgeMode === 'burn' }" @click="dodgeMode = 'burn'">Burn</button>
      </div>
      <span v-if="tool === 'clone' && !cloneReady" class="text-2xs text-brand-primary font-bold">Alt+click to set the clone source, then paint</span>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Tool rail — vertical, far left, Photoshop/Photopea-style. -->
      <div class="w-12 shrink-0 border-r border-surface-mist dark:border-surface-fog surface-card !rounded-none flex flex-col items-center gap-0.5 py-2 overflow-y-auto">
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'select' }" title="Select (V)" @click="setTool('select')">
          <CursorArrowRaysIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'pen' }" title="Pen tool (P)" @click="setTool('pen')">
          <PencilIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'brush' }" title="Brush (B)" @click="setTool('brush')">
          <PaintBrushIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'clone' }" title="Clone stamp (S) — Alt+click to set source" @click="setTool('clone')">
          <DocumentDuplicateIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'dodge' }" title="Dodge/Burn (O)" @click="setTool('dodge')">
          <SunIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" :class="{ 'bg-brand-primary-glow text-brand-primary-deep': tool === 'eraser' }" title="Eraser (E) — erases pixels of a rasterized layer" @click="setTool('eraser')">
          <BackspaceIcon class="w-4 h-4" />
        </button>

        <div class="w-6 border-t border-surface-mist dark:border-surface-fog my-1" />

        <!-- Shapes flyout — one button opens a popover with rect/ellipse/line/polygon,
             instead of 4 separate icons crowding the rail. Matches Photoshop's
             shape-tool grouping. Teleported to <body> and positioned via the
             button's own screen rect: the rail has overflow-y-auto for
             scrolling, and per the CSS spec setting only one of
             overflow-x/-y forces the other to 'auto' too — so an
             absolutely-positioned popover that opens outside the rail's own
             box (left-full) was being silently clipped by that same
             scroll container instead of floating over the canvas. -->
        <div ref="shapesMenuRef">
          <button class="btn-ghost !p-2" :title="`Shapes (${lastShape.label})`" @click="toggleShapesMenu">
            <component :is="lastShape.icon" v-if="lastShape.icon" class="w-4 h-4" />
            <span v-else class="block w-4 h-4" v-html="lastShape.svg" />
          </button>
        </div>
        <Teleport to="body">
          <div v-if="shapesMenuOpen" ref="shapesPopoverRef" class="fixed z-50 surface-card shadow-card p-1.5 flex flex-col gap-0.5 rounded-lg" :style="shapesMenuStyle">
            <button v-for="s in SHAPE_TOOLS" :key="s.id" class="btn-ghost !p-2 flex items-center gap-2 !justify-start !text-xs whitespace-nowrap" @click="chooseShape(s)">
              <component :is="s.icon" v-if="s.icon" class="w-4 h-4 shrink-0" />
              <span v-else class="block w-4 h-4 shrink-0" v-html="s.svg" />
              {{ s.label }}
            </button>
          </div>
        </Teleport>
        <button class="btn-ghost !p-2" title="Insert text" @click="insertTextLayer">
          <PlusCircleIcon class="w-4 h-4" />
        </button>

        <div class="w-6 border-t border-surface-mist dark:border-surface-fog my-1" />

        <button class="btn-ghost !p-2" title="Upload image" @click="imageInputRef?.click()">
          <PhotoIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" title="Insert shared asset" @click="openSharedAssets">
          <RectangleStackIcon class="w-4 h-4" />
        </button>
        <button class="btn-ghost !p-2" title="Insert QR code" @click="insertQrLayer">
          <QrCodeIcon class="w-4 h-4" />
        </button>

        <div class="w-6 border-t border-surface-mist dark:border-surface-fog my-1" />

        <label class="p-2 rounded-lg cursor-pointer hover:bg-surface-mist dark:hover:bg-surface-fog" title="Canvas background color">
          <input type="color" v-model="canvasBackground" class="w-4 h-4 rounded cursor-pointer block" @change="onBackgroundChanged" />
        </label>
      </div>

      <!-- Canvas viewport — pan/zoom/rulers/grid (Batch 5) -->
      <div ref="viewportRef" class="flex-1 relative overflow-auto bg-[#e5e5e5] dark:bg-[#1a1a1a]"
           :class="tool === 'pen' ? 'cursor-crosshair' : 'cursor-grab'"
           @wheel.prevent="onWheel" @mousedown="onPanStart">
        <!-- Rulers — real tick marks + labels in document units, redrawn
             whenever zoom or scroll changes so 0 always lines up with the
             document's actual top-left corner. -->
        <template v-if="showRulers">
          <canvas ref="hRulerRef" class="absolute left-6 h-6 z-10 pointer-events-none block" :style="{ top: rulerScrollTop + 'px', width: 'calc(100% - 24px)' }" />
          <canvas ref="vRulerRef" class="absolute top-0 w-6 z-10 pointer-events-none block" :style="{ left: rulerScrollLeft + 'px', height: 'calc(100% - 24px)', marginTop: '24px' }" />
          <div class="absolute w-6 h-6 z-20 bg-surface-ivory dark:bg-surface-coal border-r border-b border-surface-mist dark:border-surface-fog pointer-events-none"
               :style="{ top: rulerScrollTop + 'px', left: rulerScrollLeft + 'px' }" />
        </template>

        <!-- Photoshop-style stage: the document sits centered in the
             available space at every zoom level, not pinned to a corner —
             it only scrolls off-center once zoomed past what fits. -->
        <div class="min-w-full min-h-full flex items-center justify-center p-16 box-border">
          <div ref="canvasWrapperRef" class="shadow-2xl shrink-0 relative" :style="canvasWrapperStyle">
            <div v-if="showGrid" class="absolute inset-0 pointer-events-none z-10" :style="gridStyle" />
            <!-- Center-alignment guides — shown while dragging an object;
                 lines up with the document's true center on each axis. -->
            <div v-if="guideV" class="absolute top-0 bottom-0 w-px bg-brand-primary z-20 pointer-events-none" :style="{ left: guideV + 'px' }" />
            <div v-if="guideH" class="absolute left-0 right-0 h-px bg-brand-primary z-20 pointer-events-none" :style="{ top: guideH + 'px' }" />
            <canvas ref="canvasElRef" />
          </div>
        </div>

        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-[#e5e5e5]/70 dark:bg-[#1a1a1a]/70">
          <LoadingSpinner />
        </div>

        <!-- Brush/eraser/clone/dodge cursor preview — a circle at true
             brush size (scaled with zoom) so you can see how big a stroke
             will land before painting it, instead of finding out after. -->
        <div v-if="cursorPreview.visible" class="absolute rounded-full pointer-events-none z-30" :style="cursorPreviewStyle" />

        <!-- Mask-paint floating toolbar (Batch 12) -->
        <div v-if="maskPainter" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 surface-card shadow-card p-2 flex items-center gap-2">
          <button class="btn-ghost !text-2xs !py-1 !px-2" :class="{ 'bg-brand-primary-glow': maskBrushMode === 'hide' }" @click="maskBrushMode = 'hide'">Hide</button>
          <button class="btn-ghost !text-2xs !py-1 !px-2" :class="{ 'bg-brand-primary-glow': maskBrushMode === 'reveal' }" @click="maskBrushMode = 'reveal'">Reveal</button>
          <span class="text-2xs">Size</span>
          <input type="range" min="5" max="200" v-model.number="maskBrushSize" class="w-24 accent-brand-gold" />
          <span class="text-2xs">Softness</span>
          <input type="range" min="0" max="1" step="0.05" :value="1 - maskBrushHardness" @input="maskBrushHardness = 1 - Number($event.target.value)" class="w-20 accent-brand-gold" />
          <AppButton class="!text-2xs !py-1" @click="finishMaskPaint">Done</AppButton>
          <button class="btn-ghost !text-2xs !py-1" @click="cancelMaskPaint">Cancel</button>
        </div>

        <!-- Crop floating toolbar (Batch 21) -->
        <div v-if="cropSession" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 surface-card shadow-card p-2 flex items-center gap-2">
          <button v-for="p in ASPECT_PRESETS" :key="p.id" class="btn-ghost !text-2xs !py-1 !px-2"
                  :class="{ 'bg-brand-primary-glow': cropRatio === p.id }" @click="setCropRatio(p)">{{ p.label }}</button>
          <AppButton class="!text-2xs !py-1" @click="finishCrop">Apply</AppButton>
          <button class="btn-ghost !text-2xs !py-1" @click="cancelCrop">Cancel</button>
        </div>
      </div>

      <!-- Photoshop-style right dock: Layers and Properties share one
           resizable column, keeping the left side dedicated to tools. -->
      <aside class="shrink-0 border-l border-surface-mist dark:border-surface-fog surface-card !rounded-none relative flex flex-col"
             :style="{ width: layersPanelWidth + 'px' }">
        <div class="shrink-0 grid grid-cols-2 border-b border-surface-mist dark:border-surface-fog">
          <button class="px-3 py-2 text-xs font-bold" :class="rightPanelTab === 'layers' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-surface-slate dark:text-surface-ash'" @click="rightPanelTab = 'layers'">Layers</button>
          <button class="px-3 py-2 text-xs font-bold" :class="rightPanelTab === 'properties' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-surface-slate dark:text-surface-ash'" @click="rightPanelTab = 'properties'">Properties</button>
        </div>

        <template v-if="rightPanelTab === 'layers'">
          <div class="flex-1 overflow-y-auto px-3 py-2">
            <LayersPanel
              :layers="layersTopFirst"
              :selected="selectedObjects"
              @select="onSelectLayer"
              @toggle-lock="onToggleLock"
              @toggle-visible="onToggleVisible"
              @reorder="onReorder"
              @duplicate="onDuplicateLayer"
              @delete="onDeleteLayer"
              @rename="onRenameLayer"
              @move-to="onMoveLayerTo"
              @rasterize="onRasterizeLayer"
              @group="onGroupLayers"
              @ungroup="onUngroupLayer"
              @merge="onMergeLayers"
            />
          </div>
          <div class="shrink-0 border-t border-surface-mist dark:border-surface-fog flex items-center gap-1 px-2 py-1.5">
            <button class="btn-ghost !p-1.5" title="New paint layer (Shift+Ctrl/Cmd+N)" @click="insertEmptyLayer">
              <DocumentPlusIcon class="w-4 h-4" />
            </button>
            <button class="btn-ghost !p-1.5" title="New group (Ctrl/Cmd+G with selection)" @click="createEmptyGroup">
              <RectangleStackIcon class="w-4 h-4" />
            </button>
            <button class="btn-ghost !p-1.5" title="Duplicate selected layer (Ctrl/Cmd+J)" :disabled="!selectedObjects.length" @click="selectedObjects[0] && onDuplicateLayer(selectedObjects[0], selectedParent)">
              <DocumentDuplicateIcon class="w-4 h-4" />
            </button>
            <div class="flex-1" />
            <button class="btn-ghost !p-1.5" title="Delete selected layer" :disabled="!selectedObjects.length" @click="selectedObjects[0] && onDeleteLayer(selectedObjects[0], selectedParent)">
              <TrashIcon class="w-4 h-4" :class="{ 'text-red-500': selectedObjects.length }" />
            </button>
          </div>
        </template>

        <div v-else class="flex-1 overflow-y-auto p-3">
          <PropertiesPanel
            v-if="fabricCanvas"
            :canvas="fabricCanvas"
            :selected="selectedObjects"
            @bring-forward="onBringForward"
            @send-backward="onSendBackward"
            @delete="(obj) => onDeleteLayer(obj, selectedParent)"
            @rasterize="onRasterizeLayer"
            @restore-text="onRestoreText"
            @clip-mask="onClipMask"
            @paint-mask="onPaintMask"
            @remove-mask="onRemoveMask"
            @start-crop="onStartCrop"
            @toggle-shared="onToggleShared"
            @replace-source="onReplaceSource"
          />
        </div>
        <div class="absolute top-0 left-0 h-full w-1.5 cursor-col-resize hover:bg-brand-primary/40 active:bg-brand-primary/60"
             @mousedown="startLayersPanelResize" title="Drag to resize" />
      </aside>
    </div>

    <!-- Shared-asset picker (Batch 20) -->
    <AppModal v-model="sharedAssetsOpen" title="Insert shared asset" :maxWidth="480">
      <div class="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
        <button v-for="a in sharedAssets" :key="a._id" class="aspect-square rounded-lg overflow-hidden border border-surface-mist dark:border-surface-fog"
                @click="insertSharedAsset(a)">
          <img :src="a.url" class="w-full h-full object-cover" />
        </button>
      </div>
      <p v-if="!sharedAssets.length" class="text-subtext text-center py-6">
        No shared assets yet — mark an image layer "Shared across templates" in the Properties panel to add one.
      </p>
    </AppModal>
    <input ref="replaceInputRef" type="file" accept="image/*" class="hidden" @change="onReplaceFileChosen" />
    <AppModal v-model="showShortcuts" title="Studio keyboard shortcuts" :maxWidth="620">
      <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <template v-for="item in SHORTCUTS" :key="item.keys">
          <span class="text-surface-slate dark:text-surface-ash">{{ item.action }}</span>
          <kbd class="justify-self-end rounded border border-surface-mist dark:border-surface-fog px-2 py-0.5 font-mono text-2xs">{{ item.keys }}</kbd>
        </template>
      </div>
    </AppModal>
    <MissingFontsModal
      v-model="missingFontsOpen"
      :fonts="missingFonts"
      @uploaded="onMissingFontUploaded"
      @imported="onFontsImported"
      @use-default="onMissingFontUseDefault"
    />
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { askConfirm } from '@/composables/useConfirm';
import {
  ArrowLeftIcon, MinusIcon, PlusIcon, Squares2X2Icon, ViewfinderCircleIcon, ChevronDownIcon, BackspaceIcon, DocumentPlusIcon, TrashIcon,
  CursorArrowRaysIcon, PencilIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon,
  PaintBrushIcon, DocumentDuplicateIcon, SunIcon, RectangleStackIcon, QrCodeIcon, PlusCircleIcon,
  StopIcon, PhotoIcon, XMarkIcon, QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline';
import * as templateApi from '@/services/cardTemplates.service';
import * as variantApi from '@/services/cardVariants.service';
import { getFontsByFamilies } from '@/services/fonts.service';
import { loadFont } from '@/utils/fontLoader';
import { resolveAssetUrl, listSharedAssets, setAssetShared, replaceAsset, uploadAsset, cacheLocalTemplateAsset, getCachedTemplateAssetBlob } from '@/services/templateAssets.service';
import { getTemplateProject, putTemplateProject } from '@/services/offline.store';
import {
  createEngineCanvas, loadDocument, serializeDocument,
  bringForward, sendBackward, setLayerLocked, setLayerVisible, rasterizeObject, restoreConvertedText,
  refreshTextMetricsPreservingLayout, mutateTextPreservingLayout,
} from '@/utils/canvasEngine';
import { HistoryStack } from '@/utils/historyStack';
import { PenTool } from '@/utils/penTool';
import { applyClipMask, removeMask, MaskPainter } from '@/utils/maskTool';
import { CloneStampController, dodgeBurnAt, eraseAt, paintBrushAt, refreshAfterRetouch, ensureLiveCanvas } from '@/utils/retouchTools';
import { CropSession, ASPECT_PRESETS } from '@/utils/cropTool';
import { renderQrImage } from '@/utils/qrLayerRenderer';
import { exportCanvasAsPsd } from '@/utils/psdExport';
import { importPsdLocally } from '@/utils/localPsdImport';
import { BINDING_FIELDS, sampleValueFor } from '@/utils/bindingRegistry';
import * as fabric from 'fabric';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import AppButton from '@/components/common/AppButton.vue';
import AppModal from '@/components/common/AppModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import LayersPanel from '@/components/studio/LayersPanel.vue';
import PropertiesPanel from '@/components/studio/PropertiesPanel.vue';
import MissingFontsModal from '@/components/studio/MissingFontsModal.vue';

const route = useRoute();
const router = useRouter();

// Dual mode: super-admin editing a shared CardTemplate (/studio/templates/:id)
// vs. a tenant editing their own event's CardVariant
// (/studio/variants/:eventId/:id) — same editor, same document schema,
// different backend collection + auth scope. Everything downstream reads
// through this `api` adapter instead of importing either service directly,
// so the rest of the file never has to branch on mode.
const isVariantMode = computed(() => route.meta?.docType === 'variant');
const variantEventId = computed(() => route.params.eventId);
const api = {
  adminGet: (id) => (isVariantMode.value ? variantApi.getVariant(variantEventId.value, id) : templateApi.adminGet(id)),
  adminUpdate: (id, payload) => (isVariantMode.value ? variantApi.updateVariant(variantEventId.value, id, payload) : templateApi.adminUpdate(id, payload)),
  adminCreateBlank: (meta) => (isVariantMode.value ? variantApi.createBlankVariant(variantEventId.value, meta) : templateApi.adminCreateBlank(meta)),
};
const toast = useToast();
const showShortcuts = ref(false);
const SHORTCUTS = [
  { action: 'Save a local offline draft', keys: 'Ctrl/Cmd + S' },
  { action: 'Save to cloud', keys: 'Ctrl/Cmd + Shift + S' },
  { action: 'Undo / redo', keys: 'Ctrl/Cmd + Z / Shift + Z' },
  { action: 'Duplicate layer', keys: 'Ctrl/Cmd + J' },
  { action: 'Copy / cut / paste layers', keys: 'Ctrl/Cmd + C / X / V' },
  { action: 'Group / ungroup', keys: 'Ctrl/Cmd + G / Shift + G' },
  { action: 'Bring forward / send backward', keys: 'Ctrl/Cmd + ] / [' },
  { action: 'Select all / deselect', keys: 'Ctrl/Cmd + A / D' },
  { action: 'Brush size', keys: '[ / ]' },
  { action: 'Brush hardness', keys: 'Shift + [ / ]' },
  { action: 'Nudge / large nudge', keys: 'Arrows / Shift + arrows' },
  { action: 'Select, Pen, Brush, Clone, Dodge, Eraser', keys: 'V P B S O E' },
  { action: 'Actual size / fit', keys: 'Ctrl/Cmd + 1 / 0' },
  { action: 'Zoom in / out by 5%', keys: 'Ctrl/Cmd + / −' },
  { action: 'Toggle snap to grid', keys: 'Ctrl/Cmd + Shift + ;' },
  { action: 'Cancel tool or close selection', keys: 'Esc' },
  { action: 'Shortcut reference', keys: '?' },
];

// Studio opens in its own tab (window.open from the library grid), so
// "back" closes that tab rather than navigating within it. window.close()
// only succeeds on script-opened tabs — falls back to the library route
// for the case someone loaded this URL directly (bookmark, refresh, etc).
function closeStudio() {
  window.close();
  setTimeout(() => {
    if (window.closed) return;
    router.push(isVariantMode.value
      ? `/app/events/${variantEventId.value}/cards/variants`
      : '/app/admin/templates');
  }, 200);
}

const loading = ref(true);
const saving = ref(false);
const autosaveStatus = ref(''); // '' | 'pending' | 'local' | 'cloud'
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const localProjectId = computed(() => `${isVariantMode.value ? `variant:${variantEventId.value}` : 'template'}:${route.params.id || 'new'}`);
let autosaveTimer = null;
function onNetworkOnline() { isOnline.value = true; toast.success('Back online. Your next save can sync to the cloud.'); }
function onNetworkOffline() { isOnline.value = false; toast.error('You are offline. Studio edits will stay on this device.'); }
// Guards against a real incident: loadDocument()'s own canvas.add() calls
// during the INITIAL population of a page fire the same 'object:added'
// events a genuine user edit does. If autosave were armed at that point,
// any load-time hiccup (an image that hasn't resolved yet, a bug in the
// render path) gets immediately persisted over a correct, previously-saved
// document — silently destroying real content within seconds of opening
// the editor, before anyone touched anything. Autosave only arms after
// boot() fully settles.
let readyForAutosave = false;
const name = ref('Untitled template');
watch(name, () => scheduleAutosave());
const document = ref(null);
const template = ref(null);
const pages = ref([]); // [{name, document}] — Batch 23
const activePage = ref(0);

const canvasElRef = ref(null);
const viewportRef = ref(null);
const canvasWrapperRef = ref(null);
const hRulerRef = ref(null);
const vRulerRef = ref(null);
const guideV = ref(null); // px, relative to canvasWrapperRef — vertical center-alignment guide line
const guideH = ref(null);
// Rulers are `absolute` (not `sticky`) so they can never add to normal
// document flow height — a `sticky` ruler with a computed `calc(100%...)`
// height previously did exactly that, and its full height silently pushed
// the actual canvas hundreds of pixels down the page below the fold. Since
// `absolute` children scroll WITH the container by default, these two
// track scrollTop/scrollLeft manually to stay pinned to the visible edge,
// which is what `sticky` would have given us for free if it were safe to use.
const rulerScrollTop = ref(0);
const rulerScrollLeft = ref(0);
let fabricCanvasRaw = null;
const fabricCanvas = ref(null); // reactive wrapper so PropertiesPanel/LayersPanel re-render on selection/layer changes

const zoom = ref(1);
const showGrid = ref(false);
const showRulers = ref(false);
const GRID_SIZES = [10, 20, 40, 80];
const gridSize = ref(Number(localStorage.getItem('studio.gridSize')) || 20);
const snapToGrid = ref(localStorage.getItem('studio.snapToGrid') === 'true');
watch(gridSize, (v) => localStorage.setItem('studio.gridSize', String(v)));
watch(snapToGrid, (v) => localStorage.setItem('studio.snapToGrid', String(v)));
watch(showRulers, (v) => { if (v) nextTick(onViewportScroll); });
const gridMenuOpen = ref(false);

const layersPanelWidth = ref(Math.max(260, Number(localStorage.getItem('studio.layersPanelWidth')) || 320));
const rightPanelTab = ref(localStorage.getItem('studio.rightPanelTab') || 'layers');
watch(rightPanelTab, (v) => localStorage.setItem('studio.rightPanelTab', v));
function startLayersPanelResize(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = layersPanelWidth.value;
  function onMove(ev) {
    layersPanelWidth.value = Math.min(520, Math.max(260, startWidth - (ev.clientX - startX)));
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    localStorage.setItem('studio.layersPanelWidth', String(layersPanelWidth.value));
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
const tool = ref('select');
const selectedObjects = ref([]);
const selectedParent = ref(null); // set only when the selection is a layer nested inside a group
const layersTopFirst = ref([]); // display order — reverse of Fabric's bottom-first stacking array
let history = null;
const historyRevision = ref(0);
const historyCanUndo = computed(() => { void historyRevision.value; return !!history?.canUndo; });
const historyCanRedo = computed(() => { void historyRevision.value; return !!history?.canRedo; });
function resetHistory() {
  history?.detach();
  history = new HistoryStack(fabricCanvasRaw, { onChange: () => { historyRevision.value += 1; } });
  history.init();
  history.attach();
}
let penTool = null;
let studioClipboard = null;

const canvasWrapperStyle = computed(() => document.value
  ? { width: `${document.value.width * zoom.value}px`, height: `${document.value.height * zoom.value}px` }
  : {});

const gridStyle = computed(() => {
  const size = gridSize.value * zoom.value;
  return {
    backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.15) 1px, transparent 1px)',
    backgroundSize: `${size}px ${size}px`,
  };
});

// markRaw is load-bearing here, not an optimization: without it, Vue's
// ref() wraps every Fabric object in a reactive Proxy the moment it's read
// into layersTopFirst/selectedObjects. Property edits (obj.set(...)) still
// worked because proxies transparently forward reads/writes to the target,
// but anything relying on REFERENCE IDENTITY silently broke — Fabric's
// canvas.remove(obj) does a strict `===` filter against its own internal
// object list, and a Vue-proxied `obj` is never `===` the raw instance
// Fabric actually stored via canvas.add(). Same failure mode would hit
// moveObjectTo/indexOf-based reordering. markRaw() tells Vue to never wrap
// this object, so every reference to it (canvas-internal or component
// state) stays the exact same object.
function refreshLayersList() {
  layersTopFirst.value = fabricCanvasRaw ? [...fabricCanvasRaw.getObjects()].reverse().map(markRaw) : [];
}

// Additive (not multiplicative) steps — a fixed ×1.25/×0.8 jump feels huge
// at low zoom (10% → 12.5%) and barely-there at high zoom (300% → 240%).
// A flat 5% step per click feels the same at every zoom level.
function zoomBy(deltaPercent) {
  zoom.value = Math.round(Math.min(400, Math.max(2, (zoom.value * 100) + deltaPercent))) / 100;
  applyZoom();
}
function resetZoom() { zoom.value = 1; applyZoom(); }

// Fits the document into the visible viewport on first load — without this
// a 1080×1920 canvas at zoom=1 overflows any normal screen and the admin
// sees nothing but a corner of white, which reads as "the editor is broken"
// even though everything loaded correctly off-screen.
function fitZoomToViewport() {
  if (!viewportRef.value || !document.value) return;
  // The canvas stage wrapper uses `p-16` (64px), which CSS applies on
  // EACH side — 128px total per axis, not 64. Only subtracting it once
  // under-shrinks the fit zoom, leaving the document too large for the
  // viewport: it overflows the centered flexbox (which does NOT stay
  // centered once its content overflows — the browser anchors overflowing
  // flex content to the start edge), so the page renders off-center and
  // cut off instead of centered and fully visible.
  const padding = 64 * 2;
  const availW = viewportRef.value.clientWidth - padding;
  const availH = viewportRef.value.clientHeight - padding;
  if (availW <= 0 || availH <= 0) return;
  const fit = Math.min(availW / document.value.width, availH / document.value.height, 1);
  zoom.value = Math.max(0.05, fit);
}

function applyZoom() {
  if (!fabricCanvasRaw) return;
  fabricCanvasRaw.setZoom(zoom.value);
  fabricCanvasRaw.setDimensions({ width: document.value.width * zoom.value, height: document.value.height * zoom.value });
  nextTick(drawRulers);
}

// ── Rulers ────────────────────────────────────────────────────────────────
// Real tick marks in document units (not just blank strips) — a "major"
// tick every 100 doc-units gets a number label, minor ticks every 20,
// spacing adapts so ticks never get so dense they blur together at low
// zoom or so sparse they're useless at high zoom.
function pickRulerStep(z) {
  const raw = 100 / z; // doc-units per ~100 screen px, before rounding to a "nice" step
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return steps.find((s) => s >= raw) || steps[steps.length - 1];
}
function drawOneRuler(canvasEl, { vertical, offset, length, z }) {
  if (!canvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  const thickness = vertical ? 24 : 24;
  canvasEl.width = (vertical ? thickness : length) * dpr;
  canvasEl.height = (vertical ? length : thickness) * dpr;
  const ctx = canvasEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  // NOTE: `document` in this component's scope is the template-document
  // ref, not the DOM global — must go through `window.document` explicitly.
  const isDark = window.document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDark ? '#e8e6df' : '#3a3630';
  ctx.strokeStyle = isDark ? '#e8e6df' : '#3a3630';
  ctx.font = '9px sans-serif';
  ctx.textBaseline = 'top';
  const major = pickRulerStep(z);
  const minor = major / 5;
  // Screen position (px, in this ruler's own coordinate space) of doc-unit `docPx`.
  const toScreen = (docPx) => offset + docPx * z;
  const startDoc = Math.floor(-offset / z / minor) * minor;
  const endDoc = startDoc + (length / z) + minor * 2;
  for (let d = startDoc; d <= endDoc; d += minor) {
    const p = toScreen(d);
    if (p < 0 || p > length) continue;
    const isMajor = Math.round(d / major) * major === Math.round(d);
    const tickLen = isMajor ? 8 : 4;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(thickness - tickLen, p + 0.5);
      ctx.lineTo(thickness, p + 0.5);
    } else {
      ctx.moveTo(p + 0.5, thickness - tickLen);
      ctx.lineTo(p + 0.5, thickness);
    }
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isMajor) {
      if (vertical) {
        ctx.save();
        ctx.translate(2, p + 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(Math.round(d)), 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(String(Math.round(d)), p + 2, 1);
      }
    }
  }
}
function drawRulers() {
  if (!showRulers.value || !viewportRef.value || !canvasWrapperRef.value) return;
  const viewportRect = viewportRef.value.getBoundingClientRect();
  const wrapperRect = canvasWrapperRef.value.getBoundingClientRect();
  const offsetX = wrapperRect.left - viewportRect.left;
  const offsetY = wrapperRect.top - viewportRect.top;
  drawOneRuler(hRulerRef.value, { vertical: false, offset: offsetX, length: viewportRect.width - 24, z: zoom.value });
  drawOneRuler(vRulerRef.value, { vertical: true, offset: offsetY, length: viewportRect.height - 24, z: zoom.value });
}
function onViewportScroll() {
  if (viewportRef.value) {
    rulerScrollTop.value = viewportRef.value.scrollTop;
    rulerScrollLeft.value = viewportRef.value.scrollLeft;
  }
  drawRulers();
}

function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    zoomBy(e.deltaY < 0 ? 2 : -2);
  } else if (viewportRef.value) {
    viewportRef.value.scrollLeft += e.deltaX;
    viewportRef.value.scrollTop += e.deltaY;
  }
}

let panState = null;
function onPanStart(e) {
  if (e.button !== 1 && !e.spaceHeld) return;
  panState = { x: e.clientX, y: e.clientY, scrollLeft: viewportRef.value.scrollLeft, scrollTop: viewportRef.value.scrollTop };
  window.addEventListener('mousemove', onPanMove);
  window.addEventListener('mouseup', onPanEnd);
}
function onPanMove(e) {
  if (!panState || !viewportRef.value) return;
  viewportRef.value.scrollLeft = panState.scrollLeft - (e.clientX - panState.x);
  viewportRef.value.scrollTop = panState.scrollTop - (e.clientY - panState.y);
}
function onPanEnd() {
  panState = null;
  window.removeEventListener('mousemove', onPanMove);
  window.removeEventListener('mouseup', onPanEnd);
}

// ── Tools (Batches 9/17/18) ──────────────────────────────────────────────
const brushColor = ref('#111827');
const brushSize = ref(20);
const dodgeMode = ref('dodge');
const brushHardness = ref(0.7); // 0 = soft falloff from center, 1 = hard edge — used by both the brush's shadow blur and the eraser

// ── Brush cursor preview ─────────────────────────────────────────────────
// A circle that follows the pointer showing the ACTUAL brush size (and,
// via a soft vs hard edge, the current hardness) — previously there was no
// visual feedback at all for how big a stroke would land until you'd
// already painted it.
const BRUSH_CURSOR_TOOLS = ['brush', 'eraser', 'clone', 'dodge'];
const cursorPreview = ref({ visible: false, x: 0, y: 0 });
function updateBrushCursor(opt) {
  if (!BRUSH_CURSOR_TOOLS.includes(tool.value) || !viewportRef.value) { cursorPreview.value = { ...cursorPreview.value, visible: false }; return; }
  const rect = viewportRef.value.getBoundingClientRect();
  // The preview div is `absolute` inside a `position:relative; overflow:auto`
  // container — its top/left are relative to the scrollable CONTENT origin,
  // not the currently-visible viewport edge, so the container's own scroll
  // offset has to be added back in (same fix the rulers needed).
  cursorPreview.value = {
    visible: true,
    x: opt.e.clientX - rect.left + viewportRef.value.scrollLeft,
    y: opt.e.clientY - rect.top + viewportRef.value.scrollTop,
  };
}
function hideBrushCursor() { cursorPreview.value = { ...cursorPreview.value, visible: false }; }
const cursorPreviewStyle = computed(() => {
  const size = Math.max(4, brushSize.value * zoom.value);
  const hard = brushHardness.value >= 0.9;
  return {
    left: cursorPreview.value.x + 'px',
    top: cursorPreview.value.y + 'px',
    width: size + 'px',
    height: size + 'px',
    transform: 'translate(-50%, -50%)',
    border: hard ? '1.5px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.5)',
    boxShadow: hard ? '0 0 0 1px rgba(0,0,0,0.6)' : `0 0 0 1px rgba(0,0,0,0.4), inset 0 0 ${size * (1 - brushHardness.value) * 0.4}px rgba(255,255,255,0.3)`,
  };
});
const cloneReady = ref(false);
let cloneController = null;

// Clone/dodge/eraser paint DIRECTLY onto whatever image is under the
// cursor (found via findTarget in retouchMouseDown, independent of Fabric's
// normal selection state) — but `canvas.selection = false` only turns off
// RUBBER-BAND selecting on empty canvas. Every object stays individually
// draggable via Fabric's own default per-object mouse handling, which
// fires from the exact same mousedown and wins the drag before any
// painting logic gets a look in — that's why a paint stroke was actually
// moving the layer instead of erasing/painting it. Temporarily marking
// every object non-selectable turns that default dragging off for the
// duration of the tool, without touching `evented` (which findTarget
// itself depends on to hit-test in the first place).
// Lock movement (not selection) so layers can still be clicked-to-select
// while paint tools are active — the user needs to pick the target layer
// first. Purely blocking selection made the "paint on active layer"
// workflow impossible; leaving movement on made drags move the layer
// instead of painting.
let savedMovementStates = null;
function disableObjectDragging() {
  savedMovementStates = fabricCanvasRaw.getObjects().map((o) => ({ o, x: o.lockMovementX, y: o.lockMovementY }));
  fabricCanvasRaw.getObjects().forEach((o) => o.set({ lockMovementX: true, lockMovementY: true }));
}
function restoreObjectDragging() {
  savedMovementStates?.forEach(({ o, x, y }) => o.set({ lockMovementX: x, lockMovementY: y }));
  savedMovementStates = null;
}

function teardownActiveTool() {
  if (tool.value === 'pen' && penTool?.active) penTool.cancel();
  if (['brush', 'clone', 'dodge', 'eraser'].includes(tool.value)) {
    fabricCanvasRaw.off('mouse:down', retouchMouseDown);
    fabricCanvasRaw.off('mouse:move', retouchMouseMove);
    fabricCanvasRaw.off('mouse:up', retouchMouseUp);
    fabricCanvasRaw.selection = true;
    restoreObjectDragging();
    cloneController = null;
    cloneReady.value = false;
  }
}

function setTool(next) {
  if (maskPainter.value) cancelMaskPaint();
  if (cropSession.value) cancelCrop();
  teardownActiveTool();
  tool.value = next;
  if (next === 'pen') {
    penTool = new PenTool(fabricCanvasRaw, { stroke: '#111827', strokeWidth: 2 });
    penTool.onComplete = () => { tool.value = 'select'; refreshLayersList(); };
    penTool.start();
  } else if (['brush', 'clone', 'dodge', 'eraser'].includes(next)) {
    // Brush paints directly onto a raster layer's own pixels (same as the
    // eraser, clone stamp, and dodge/burn) instead of drawing a separate
    // vector stroke object on top — this is also what makes "soft" a real
    // alpha falloff across the brush instead of Fabric's PencilBrush +
    // shadow-blur, which only ever put a faint halo around a still-solid
    // stroke core. It's also why brush now needs an actual image layer
    // under the cursor to paint on, same as every other tool here.
    fabricCanvasRaw.selection = false;
    // Keep the active layer selected. Empty transparent paint layers have
    // no hit-testable pixels yet, so discarding them here made the first
    // brush stroke impossible to place on the layer just created.
    disableObjectDragging();
    fabricCanvasRaw.on('mouse:down', retouchMouseDown);
    fabricCanvasRaw.on('mouse:move', retouchMouseMove);
    fabricCanvasRaw.on('mouse:up', retouchMouseUp);
  }
}
function retouchMouseUp() { retouchPainting = false; strokeTarget = null; lastStrokePoint = null; }

// A stroke targets the CURRENTLY SELECTED image layer (like Photoshop —
// active layer wins, regardless of what the cursor is over), falling back
// to whatever's under the cursor only when nothing is selected. This
// prevents the earlier "paint bleeds onto whatever layer happens to be
// under the pointer" behaviour; a brush stroke ended in an area that
// happened to overlap two layers used to jump between them mid-stroke.
let retouchPainting = false;
let strokeTarget = null;  // the ONE image layer this stroke paints on — locked in at mousedown
let lastStrokePoint = null;
function pickStrokeTarget(opt) {
  const active = fabricCanvasRaw.getActiveObject();
  if (active?.type === 'image') return active;
  const selected = selectedObjects.value[0];
  if (selected?.type === 'image') return selected;
  const { target } = fabricCanvasRaw.findTarget(opt.e) || {};
  return target?.type === 'image' ? target : null;
}
// A single mousedown/mousemove event fires infrequently while dragging
// fast — one stamp per event leaves large gaps between stamps and reads
// as "the tool is reducing opacity" instead of a continuous stroke. Real
// paint apps solve this by laying additional stamps along the LINE
// between the previous point and the current one, spaced closely enough
// that the soft edges overlap into a continuous stroke.
function stampAlongTo(p) {
  const spacing = Math.max(1, brushSize.value * 0.15); // 15% of brush size — tight enough that stamps fully overlap
  if (!lastStrokePoint) { doStamp(p); lastStrokePoint = p; return; }
  const dx = p.x - lastStrokePoint.x;
  const dy = p.y - lastStrokePoint.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(dist / spacing));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    doStamp({ x: lastStrokePoint.x + dx * t, y: lastStrokePoint.y + dy * t });
  }
  lastStrokePoint = p;
}
function doStamp(p) {
  if (!strokeTarget) return;
  if (tool.value === 'brush') paintBrushAt(strokeTarget, p, { brushSize: brushSize.value, hardness: brushHardness.value, color: brushColor.value });
  else if (tool.value === 'eraser') eraseAt(strokeTarget, p, { brushSize: brushSize.value, hardness: brushHardness.value });
  else if (tool.value === 'dodge') dodgeBurnAt(strokeTarget, p, { mode: dodgeMode.value, brushSize: brushSize.value });
}
function retouchMouseDown(opt) {
  const p = fabricCanvasRaw.getScenePoint(opt.e);

  // Clone stamp keeps its own flow — alt-click sets source, then paint —
  // it doesn't use the stamp-along interpolation (source offset already
  // shifts continuously with the cursor, so gaps read differently).
  if (tool.value === 'clone') {
    const img = pickStrokeTarget(opt);
    if (!img) return;
    if (opt.e.altKey || !cloneController) {
      ensureLiveCanvas(img);
      cloneController = new CloneStampController(img, { brushSize: brushSize.value });
      cloneController.setSource(p);
      cloneReady.value = true;
      return;
    }
    cloneController.paint(p);
    refreshAfterRetouch(fabricCanvasRaw, img);
    strokeTarget = img;
    retouchPainting = true;
    return;
  }

  strokeTarget = pickStrokeTarget(opt);
  if (!strokeTarget) {
    toast.error('Select an image layer first (or use "New empty layer" in the Layers panel) — paint tools work on the currently selected raster layer.');
    return;
  }
  lastStrokePoint = null;
  stampAlongTo(p);
  refreshAfterRetouch(fabricCanvasRaw, strokeTarget);
  retouchPainting = true;
}
function retouchMouseMove(opt) {
  if (!retouchPainting) return;
  const p = fabricCanvasRaw.getScenePoint(opt.e);
  if (tool.value === 'clone' && cloneController) {
    cloneController.paint(p);
    refreshAfterRetouch(fabricCanvasRaw, strokeTarget);
    return;
  }
  stampAlongTo(p);
  refreshAfterRetouch(fabricCanvasRaw, strokeTarget);
}

function onKeyDown(e) {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const active = fabricCanvasRaw?.getActiveObject();
  const activeText = ['textbox', 'text', 'i-text'].includes(active?.type) ? active : null;
  if (mod && key === 's') {
    e.preventDefault();
    if (e.shiftKey) save(); else saveLocalDraft({ notify: true });
    return;
  }
  if (mod && e.shiftKey && (e.key === ';' || e.key === ':')) {
    e.preventDefault();
    snapToGrid.value = !snapToGrid.value;
    toast.success(`Snap to grid ${snapToGrid.value ? 'enabled' : 'disabled'}`);
    return;
  }
  if (mod && ['+', '=', '-', '_'].includes(e.key)) {
    e.preventDefault();
    zoomBy(e.key === '+' || e.key === '=' ? 5 : -5);
    return;
  }
  // Font size — Ctrl/Cmd+Shift+. to grow, Ctrl/Cmd+Shift+, to shrink,
  // matching Illustrator/Figma's convention. Checked BEFORE the generic
  // "typing in a field" bail-out below, because Fabric's own text-editing
  // mode works by focusing a hidden native <textarea> — the same tag that
  // guard exists to ignore keystrokes from. When a Textbox is actively
  // being edited with an active text selection, only that selected range
  // resizes; otherwise the whole layer's font size changes.
  if (mod && e.shiftKey && (e.key === '.' || e.key === ',')) {
    const obj = activeText;
    if (obj) {
      e.preventDefault();
      adjustFontSize(obj, e.key === '.' ? 2 : -2);
      return;
    }
  }
  const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
  const fabricTextInput = inInput && activeText?.isEditing;
  if (inInput && !fabricTextInput) return;
  if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
  if (mod && activeText && ['b', 'i', 'u'].includes(key)) {
    e.preventDefault();
    const prop = key === 'b' ? 'fontWeight' : key === 'i' ? 'fontStyle' : 'underline';
    const value = key === 'b' ? (Number(activeText.fontWeight) >= 600 ? 400 : 700)
      : key === 'i' ? (activeText.fontStyle === 'italic' ? 'normal' : 'italic')
        : !activeText.underline;
    if (activeText.isEditing && activeText.selectionStart !== activeText.selectionEnd) {
      activeText.setSelectionStyles({ [prop]: value }, activeText.selectionStart, activeText.selectionEnd);
    } else {
      activeText.set(prop, value);
    }
    activeText.dirty = true;
    fabricCanvasRaw.requestRenderAll();
    fabricCanvasRaw.fire('object:modified', { target: activeText });
    return;
  }
  if (fabricTextInput) return;
  if (mod && key === 'j' && selectedObjects.value[0]) {
    e.preventDefault();
    onDuplicateLayer(selectedObjects.value[0], findParentGroup(selectedObjects.value[0], fabricCanvasRaw.getObjects()));
    return;
  }
  if (mod && ['c', 'x'].includes(key) && selectedObjects.value.length) {
    e.preventDefault();
    const cutting = key === 'x';
    const targets = [...selectedObjects.value];
    copySelectedLayers().then(() => {
      if (cutting) targets.forEach((obj) => onDeleteLayer(obj, findParentGroup(obj, fabricCanvasRaw.getObjects())));
    });
    return;
  }
  if (mod && key === 'v' && studioClipboard) {
    e.preventDefault();
    pasteSelectedLayers();
    return;
  }
  if (mod && key === 'g') {
    e.preventDefault();
    if (e.shiftKey) onUngroupLayer(selectedObjects.value[0]);
    else onGroupLayers(selectedObjects.value);
    return;
  }
  if (mod && key === 'a') {
    e.preventDefault();
    const all = fabricCanvasRaw.getObjects().filter((o) => !o.get('data')?.locked);
    if (all.length) fabricCanvasRaw.setActiveObject(new fabric.ActiveSelection(all, { canvas: fabricCanvasRaw }));
    fabricCanvasRaw.requestRenderAll();
    return;
  }
  if (mod && key === 'd') {
    e.preventDefault();
    fabricCanvasRaw.discardActiveObject();
    fabricCanvasRaw.requestRenderAll();
    return;
  }
  if (mod && (e.key === ']' || e.key === '[') && selectedObjects.value[0]) {
    e.preventDefault();
    if (e.key === ']') onBringForward(selectedObjects.value[0]); else onSendBackward(selectedObjects.value[0]);
    fabricCanvasRaw.fire('object:modified', { target: selectedObjects.value[0] });
    return;
  }
  if (mod && (e.key === '0' || e.key === '1')) {
    e.preventDefault();
    if (e.key === '0') { fitZoomToViewport(); applyZoom(); } else resetZoom();
    return;
  }
  if (!mod && ['+', '-', '_'].includes(e.key)) {
    e.preventDefault();
    zoomBy(e.key === '+' ? 5 : -5);
    return;
  }
  if (e.key === '[' || e.key === ']') {
    e.preventDefault();
    if (e.shiftKey) brushHardness.value = Math.min(1, Math.max(0, brushHardness.value + (e.key === ']' ? 0.05 : -0.05)));
    else brushSize.value = Math.min(1500, Math.max(1, brushSize.value + (e.key === ']' ? Math.max(1, Math.round(brushSize.value * 0.1)) : -Math.max(1, Math.round(brushSize.value * 0.1)))));
    return;
  }
  if (e.key === '?' ) { showShortcuts.value = true; return; }
  if (e.key === 'Escape') {
    if (maskPainter.value) cancelMaskPaint();
    else if (cropSession.value) cancelCrop();
    else { teardownActiveTool(); tool.value = 'select'; fabricCanvasRaw.discardActiveObject(); fabricCanvasRaw.requestRenderAll(); }
    return;
  }
  if (e.key === 'v' || e.key === 'V') setTool('select');
  if (e.key === 'p' || e.key === 'P') setTool('pen');
  if (e.key === 'b' || e.key === 'B') setTool('brush');
  if (e.key === 's' || e.key === 'S') setTool('clone');
  if (e.key === 'o' || e.key === 'O') setTool('dodge');
  if (e.key === 'e' || e.key === 'E') setTool('eraser');
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Was fabricCanvasRaw.remove(o) directly — a no-op for any object
    // nested inside a Fabric Group (true for virtually every PSD-imported
    // layer), since removing from the canvas does nothing when the object
    // was never the canvas's own direct child. onDeleteLayer already knows
    // to remove from the object's actual parent group when it has one —
    // route every selected object through it instead of duplicating (and
    // getting wrong) that logic here.
    if (selectedObjects.value.length) {
      selectedObjects.value.forEach((o) => onDeleteLayer(o, findParentGroup(o, fabricCanvasRaw.getObjects())));
    }
  }
  // Arrow-key nudge — shift for a bigger jump, matches Photoshop's 1px/10px convention.
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedObjects.value.length) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    selectedObjects.value.forEach((o) => { o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy }); o.setCoords(); });
    fabricCanvasRaw.requestRenderAll();
    fabricCanvasRaw.fire('object:modified', {});
  }
}

async function copySelectedLayers() {
  const parent = selectedObjects.value.length === 1 ? findParentGroup(selectedObjects.value[0], fabricCanvasRaw.getObjects()) : null;
  studioClipboard = {
    objects: await Promise.all(selectedObjects.value.map((obj) => obj.clone(['data']))),
    parent,
  };
}

async function pasteSelectedLayers() {
  if (!studioClipboard?.objects?.length) return;
  const clones = await Promise.all(studioClipboard.objects.map((obj) => obj.clone(['data'])));
  clones.forEach((clone) => {
    const data = clone.get('data') || {};
    clone.set({
      left: (clone.left || 0) + 20,
      top: (clone.top || 0) + 20,
      data: { ...data, layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: `${data.name || clone.type} copy` },
    });
    if (studioClipboard.parent && walkFabricObjects(fabricCanvasRaw.getObjects()).includes(studioClipboard.parent)) studioClipboard.parent.add(clone);
    else fabricCanvasRaw.add(clone);
  });
  if (clones.length > 1 && clones.every((clone) => fabricCanvasRaw.getObjects().includes(clone))) {
    fabricCanvasRaw.setActiveObject(new fabric.ActiveSelection(clones, { canvas: fabricCanvasRaw }));
  } else if (clones.length === 1 && fabricCanvasRaw.getObjects().includes(clones[0])) {
    fabricCanvasRaw.setActiveObject(clones[0]);
  } else {
    selectedObjects.value = clones.map(markRaw);
  }
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: clones[0] });
}

function adjustFontSize(obj, delta) {
  if (obj.isEditing && obj.selectionStart !== obj.selectionEnd) {
    const start = obj.selectionStart, end = obj.selectionEnd;
    const base = obj.getSelectionStyles(start, start + 1)[0]?.fontSize ?? obj.fontSize ?? 16;
    obj.setSelectionStyles({ fontSize: Math.max(4, base + delta) }, start, end);
    obj.dirty = true;
  } else {
    obj.set('fontSize', Math.max(4, (obj.fontSize || 16) + delta));
  }
  fabricCanvasRaw.requestRenderAll();
  fabricCanvasRaw.fire('object:modified', { target: obj });
}

// Alt-drag duplicate — mousedown with Alt held while a selection exists
// clones it in place, then lets the normal drag continue moving the clone
// (the original stays put), matching Photoshop/Illustrator muscle memory.
function onMouseDownAltDuplicate(opt) {
  if (!opt.e.altKey || tool.value !== 'select') return;
  const active = fabricCanvasRaw.getActiveObject();
  if (!active) return;
  const targets = active.type === 'activeselection' ? active.getObjects() : [active];
  Promise.all(targets.map((o) => o.clone())).then((clones) => {
    clones.forEach((clone, i) => {
      clone.set({ data: { ...(targets[i].get('data') || {}), layerId: `layer_${Math.random().toString(36).slice(2, 10)}` } });
      fabricCanvasRaw.add(clone);
    });
    if (clones.length > 1) {
      const sel = new fabric.ActiveSelection(clones, { canvas: fabricCanvasRaw });
      fabricCanvasRaw.setActiveObject(sel);
    } else {
      fabricCanvasRaw.setActiveObject(clones[0]);
    }
    refreshLayersList();
    fabricCanvasRaw.fire('object:modified', {});
  });
}

// Click-through selection for PSD-imported nested groups. Groups stay
// non-interactive (dragging one moves every child together, which is
// correct — a PSD "FLOWER" folder should move as a unit) but a plain CLICK
// on a child — text especially — should land you directly on that child,
// not on the outer group, so a tap on a headline selects/edits the
// headline immediately instead of requiring an extra "Ungroup" step.
// Implemented on mouse:up (not mouse:down) so it never fights Fabric's own
// already-in-flight group-drag transform: if the pointer actually moved,
// this is a drag, leave the group selected and moving as normal; only a
// near-zero-movement click drills down to the deepest subTarget under it.
// Resolves which object a click/dblclick event actually landed on, reading
// straight off that event's own target/subTargets (Fabric populates both
// on every mouse:up and mouse:dblclick, not just mouse:down) instead of
// caching state from a prior event — caching was the earlier bug: the
// mouseup of the FIRST click in a double-click already consumed/cleared
// it, so by the time 'mouse:dblclick' fired there was nothing left to
// read and it silently fell back to the outer group every time.
// subTargets is innermost-first (index 0 = the actual leaf under the
// cursor; Fabric's _searchPossibleTargets pushes each level only after
// recursing past it, so the outermost group ends up last, not first).
function resolveClickLeaf(opt) {
  if (opt.target?.type === 'group' && opt.subTargets?.length) return opt.subTargets[0];
  return opt.target || null;
}
let groupClickDownPos = null;
function onMouseDownTrackGroupClick(opt) {
  groupClickDownPos = tool.value === 'select' ? fabricCanvasRaw.getScenePoint(opt.e) : null;
}
function onMouseUpDrillIntoGroup(opt) {
  if (tool.value !== 'select' || opt.target?.type !== 'group' || !opt.subTargets?.length) return;
  const p = fabricCanvasRaw.getScenePoint(opt.e);
  const moved = groupClickDownPos && Math.hypot(p.x - groupClickDownPos.x, p.y - groupClickDownPos.y) > 3;
  if (moved) return; // a real drag on the group — leave it selected and moving as a unit
  fabricCanvasRaw.setActiveObject(resolveClickLeaf(opt), opt.e);
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
}
async function onDblClickDrillIntoGroup(opt) {
  const leaf = resolveClickLeaf(opt);
  if (!leaf) return;
  if (leaf.type === 'image') {
    const converted = leaf.get('data')?.sourceLayer?.convertedFromText;
    if (!converted) return;
    const unresolved = missingFonts.value.find((item) => canonicalTextUsesFamily(converted, item.family));
    if (unresolved) {
      pendingTextEditObject = leaf;
      missingFontsOpen.value = true;
      return;
    }
    const restored = await onRestoreText(leaf, { notify: false });
    if (!restored) return;
    fabricCanvasRaw.setActiveObject(restored);
    restored.enterEditing();
    restored.selectAll();
    fabricCanvasRaw.requestRenderAll();
    return;
  }
  if (!(leaf.type === 'textbox' || leaf.type === 'text' || leaf.type === 'i-text')) return;
  const unresolved = missingFonts.value.find((item) => fabricTextUsesFamily(leaf, item.family));
  if (unresolved) {
    pendingTextEditObject = leaf;
    missingFontsOpen.value = true;
    return;
  }
  fabricCanvasRaw.setActiveObject(leaf);
  leaf.enterEditing();
  leaf.selectAll();
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
}

// ── Shared assets (Batch 20) ─────────────────────────────────────────────
const sharedAssetsOpen = ref(false);
const sharedAssets = ref([]);
const replaceInputRef = ref(null);
let replaceTargetObj = null;

async function openSharedAssets() {
  sharedAssets.value = await listSharedAssets();
  sharedAssetsOpen.value = true;
}
async function insertSharedAsset(asset) {
  const img = await fabric.FabricImage.fromURL(asset.url, { crossOrigin: 'anonymous' });
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  img.set({
    left: (document.value.width - img.width * scale) / 2,
    top: (document.value.height - img.height * scale) / 2,
    scaleX: scale, scaleY: scale,
    originX: 'left', originY: 'top',
  });
  img.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: asset.name || 'Shared asset', assetId: asset._id, assetShared: true });
  fabricCanvasRaw.add(img);
  fabricCanvasRaw.setActiveObject(img);
  refreshLayersList();
  sharedAssetsOpen.value = false;
}

// ── Insert tools + binding preview (Batch 22) ───────────────────────────
async function insertQrLayer() {
  const size = Math.min(document.value.width, document.value.height) * 0.25;
  const qr = await renderQrImage({});
  qr.set({
    left: (document.value.width - size) / 2, top: (document.value.height - size) / 2,
    scaleX: size / qr.width, scaleY: size / qr.height,
    originX: 'left', originY: 'top',
  });
  qr.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'QR code', isQr: true, fg: '#000000', bg: '#FFFFFF' });
  fabricCanvasRaw.add(qr);
  fabricCanvasRaw.setActiveObject(qr);
  refreshLayersList();
}

// Photoshop's "New Layer" — a fully transparent, full-canvas-size raster
// layer with nothing on it yet, ready to paint or erase on directly. Every
// other "insert" tool here creates something with visible content
// (a shape, text, an image); this is the one that creates nothing but a
// paintable surface, which brush/eraser need since neither can paint onto
// empty canvas space — only onto an actual image layer's own pixels.
function insertEmptyLayer() {
  const w = document.value.width, h = document.value.height;
  const blank = window.document.createElement('canvas');
  blank.width = w;
  blank.height = h;
  const img = new fabric.FabricImage(blank, {
    left: 0, top: 0, originX: 'left', originY: 'top',
    // This layer starts fully transparent and covers the whole canvas —
    // without perPixelTargetFind, Fabric's hit-test only checks its
    // (full-canvas) bounding box, so it silently becomes a click-blocking
    // sheet in front of every other layer the instant it's added, and
    // every subsequent click/tap anywhere just "does nothing" or reselects
    // this invisible layer instead of whatever's actually underneath.
    // Per-pixel hit-testing lets clicks pass through the transparent areas
    // straight to the real content below, and only catches clicks once the
    // user has actually painted something on it.
    perPixelTargetFind: true,
  });
  img.set('objectCaching', false);
  img.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'New layer', liveCanvas: true });
  fabricCanvasRaw.add(img);
  fabricCanvasRaw.setActiveObject(img);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}

function insertTextLayer() {
  beginDrawTool('text');
}

// ── Draw-first creation ──────────────────────────────────────────────────
// Photoshop convention: picking a shape/text tool arms it, then you drag
// out the size on canvas — it doesn't insert a fixed-size default the
// instant you click the tool icon. Implemented generically for rect,
// ellipse and text (the three where live-resizing the Fabric object during
// the drag is simple and robust: width/height, rx/ry, and text-wrap-width
// respectively). Line and polygon are NOT drag-drawn — a Fabric Path's
// point data can't be safely rebuilt on every mousemove without real risk
// of producing a broken path mid-drag — so those insert at the clicked
// point instead of a live drag-to-size.
let drawState = null;
function beginDrawTool(kind) {
  if (!fabricCanvasRaw) return;
  tool.value = 'draw';
  fabricCanvasRaw.discardActiveObject();
  fabricCanvasRaw.selection = false;
  fabricCanvasRaw.defaultCursor = 'crosshair';
  drawState = { kind };
  fabricCanvasRaw.on('mouse:down', onDrawDown);
  fabricCanvasRaw.on('mouse:move', onDrawMove);
  fabricCanvasRaw.on('mouse:up', onDrawUp);
}
function createDrawObject(kind, x, y) {
  const base = { left: x, top: y, originX: 'left', originY: 'top' };
  if (kind === 'rect') return new fabric.Rect({ ...base, width: 0, height: 0, fill: '#D9B45E' });
  if (kind === 'ellipse') return new fabric.Ellipse({ ...base, rx: 0, ry: 0, fill: '#D9B45E' });
  if (kind === 'text') return new fabric.Textbox('', { ...base, width: 0, fontSize: 32, fontFamily: 'Inter', fill: '#111827' });
  return null;
}
function updateDrawObject(kind, obj, x1, y1, x2, y2) {
  const left = Math.min(x1, x2), top = Math.min(y1, y2);
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  if (kind === 'rect') obj.set({ left, top, width: w, height: h });
  else if (kind === 'ellipse') obj.set({ left, top, rx: w / 2, ry: h / 2 });
  else if (kind === 'text') obj.set({ left, top: y1, width: Math.max(30, w) });
  obj.setCoords();
}
function onDrawDown(opt) {
  const p = fabricCanvasRaw.getScenePoint(opt.e);
  drawState.startX = p.x;
  drawState.startY = p.y;
  const obj = createDrawObject(drawState.kind, p.x, p.y);
  const name = drawState.kind === 'rect' ? 'Rectangle' : drawState.kind === 'ellipse' ? 'Ellipse' : 'Text';
  obj.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name });
  fabricCanvasRaw.add(obj);
  drawState.obj = obj;
}
function onDrawMove(opt) {
  if (!drawState?.obj) return;
  const p = fabricCanvasRaw.getScenePoint(opt.e);
  updateDrawObject(drawState.kind, drawState.obj, drawState.startX, drawState.startY, p.x, p.y);
  fabricCanvasRaw.requestRenderAll();
}
function onDrawUp() {
  const { kind, obj } = drawState || {};
  if (obj) {
    // A plain click (no real drag) — fall back to a sensible default size
    // rather than leaving a 0×0, invisible, unselectable layer behind.
    const w = kind === 'ellipse' ? obj.rx * 2 : obj.width;
    const h = kind === 'ellipse' ? obj.ry * 2 : obj.height;
    if (w < 4 && h < 4) {
      if (kind === 'rect') obj.set({ width: document.value.width * 0.3, height: document.value.height * 0.15 });
      else if (kind === 'ellipse') obj.set({ rx: document.value.width * 0.1, ry: document.value.height * 0.06 });
      else if (kind === 'text') obj.set({ width: 300 });
      obj.setCoords();
    }
    fabricCanvasRaw.setActiveObject(obj);
    refreshLayersList();
    fabricCanvasRaw.fire('object:modified', {});
    if (kind === 'text') {
      obj.enterEditing();
      obj.selectAll();
    }
  }
  endDrawTool();
}
function endDrawTool() {
  fabricCanvasRaw.off('mouse:down', onDrawDown);
  fabricCanvasRaw.off('mouse:move', onDrawMove);
  fabricCanvasRaw.off('mouse:up', onDrawUp);
  fabricCanvasRaw.selection = true;
  fabricCanvasRaw.defaultCursor = 'default';
  tool.value = 'select';
  drawState = null;
}

// ── Shape tools ──────────────────────────────────────────────────────────
// Grouped behind one flyout button (Photoshop's shape-tool convention)
// instead of four separate icons crowding the rail. The button itself
// always shows whichever shape was used last, so the common case (reuse
// the same shape repeatedly) is one click, not two.
const shapesMenuOpen = ref(false);
const shapesMenuRef = ref(null);
const shapesPopoverRef = ref(null);
const shapesMenuStyle = ref({});
function toggleShapesMenu() {
  if (shapesMenuOpen.value) { shapesMenuOpen.value = false; return; }
  const rect = shapesMenuRef.value?.getBoundingClientRect();
  if (rect) shapesMenuStyle.value = { left: `${rect.right + 4}px`, top: `${rect.top}px` };
  shapesMenuOpen.value = true;
}
const SHAPE_TOOLS = [
  { id: 'rect', label: 'Rectangle', icon: StopIcon, run: () => insertRectLayer() },
  { id: 'ellipse', label: 'Ellipse', svg: '<span class="block w-4 h-4 rounded-full border-2 border-current"></span>', run: () => insertEllipseLayer() },
  { id: 'line', label: 'Line', icon: MinusIcon, run: () => insertLineLayer() },
  { id: 'polygon', label: 'Polygon', svg: '<span class="block w-4 h-4" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: currentColor;"></span>', run: () => insertPolygonLayer() },
];
const lastShapeId = ref('rect');
const lastShape = computed(() => SHAPE_TOOLS.find((s) => s.id === lastShapeId.value) || SHAPE_TOOLS[0]);
function chooseShape(s) {
  lastShapeId.value = s.id;
  shapesMenuOpen.value = false;
  s.run();
}
function onWindowClickCloseShapesMenu(e) {
  if (shapesMenuOpen.value) {
    if (shapesMenuRef.value?.contains(e.target)) return; // clicked the toggle button itself
    if (shapesPopoverRef.value?.contains(e.target)) return; // clicked inside the teleported popover
    shapesMenuOpen.value = false;
  }
  if (gridMenuOpen.value && !e.target.closest('[title="Grid size"]') && !e.target.closest('[title="Toggle grid"]')) {
    gridMenuOpen.value = false;
  }
}
// ── Smart center-alignment guides ────────────────────────────────────────
// While dragging an object, snap + show a guide line when its center lines
// up with the document's own center on either axis — the same "smart
// guide" behavior Photoshop/Figma give for free, which this canvas didn't
// have at all before.
const GUIDE_SNAP_SCREEN_PX = 6; // threshold in screen pixels, independent of zoom
function onObjectMovingShowGuides(opt) {
  const obj = opt.target;
  if (!obj || !document.value) { clearGuides(); return; }
  const snapDocPx = GUIDE_SNAP_SCREEN_PX / zoom.value;
  const center = obj.getCenterPoint();
  const docCenterX = document.value.width / 2;
  const docCenterY = document.value.height / 2;

  if (Math.abs(center.x - docCenterX) <= snapDocPx) {
    obj.setPositionByOrigin({ x: docCenterX, y: center.y }, 'center', 'center');
    obj.setCoords();
    guideV.value = docCenterX * zoom.value;
  } else {
    guideV.value = null;
    if (snapToGrid.value) obj.set('left', Math.round((obj.left || 0) / gridSize.value) * gridSize.value);
  }

  const newCenter = obj.getCenterPoint(); // re-read in case X-snap already moved it
  if (Math.abs(newCenter.y - docCenterY) <= snapDocPx) {
    obj.setPositionByOrigin({ x: newCenter.x, y: docCenterY }, 'center', 'center');
    obj.setCoords();
    guideH.value = docCenterY * zoom.value;
  } else {
    guideH.value = null;
    if (snapToGrid.value) obj.set('top', Math.round((obj.top || 0) / gridSize.value) * gridSize.value);
  }
  obj.setCoords();
}
function clearGuides() {
  guideV.value = null;
  guideH.value = null;
}

function insertRectLayer() {
  beginDrawTool('rect');
}
function insertEllipseLayer() {
  beginDrawTool('ellipse');
}

// Line and polygon reuse the canonical 'path' layer type (SVG path data) so
// they round-trip through save/load and the server renderer with zero
// schema changes — no new layer type needs to be taught to the backend.
// Not drag-to-size like rect/ellipse/text (see beginDrawTool's comment) —
// these place at the next click point instead of always dead-center.
function insertLineLayer() {
  armClickToPlace((x, y) => {
    const w = document.value.width * 0.3;
    const line = new fabric.Path(`M 0 0 L ${w} 0`, {
      left: x - w / 2, top: y, fill: '', stroke: '#111827', strokeWidth: 4, originX: 'left', originY: 'top',
    });
    line.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'Line' });
    return line;
  });
}
function insertPolygonLayer() {
  armClickToPlace((x, y) => {
    const r = Math.min(document.value.width, document.value.height) * 0.1;
    const sides = 6;
    const pts = Array.from({ length: sides }, (_, i) => {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
      return [r + r * Math.cos(a), r + r * Math.sin(a)];
    });
    const d = `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`;
    const poly = new fabric.Path(d, { left: x - r, top: y - r, fill: '#D9B45E', originX: 'left', originY: 'top' });
    poly.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'Polygon' });
    return poly;
  });
}
// One click on canvas places the object centered on the click point, then
// hands control back to the select tool — used by line/polygon, which
// can't be safely live-resized during a drag (see beginDrawTool's comment).
function armClickToPlace(factory) {
  tool.value = 'draw';
  fabricCanvasRaw.discardActiveObject();
  fabricCanvasRaw.defaultCursor = 'crosshair';
  const onClick = (opt) => {
    const p = fabricCanvasRaw.getScenePoint(opt.e);
    const obj = factory(p.x, p.y);
    fabricCanvasRaw.add(obj);
    fabricCanvasRaw.setActiveObject(obj);
    refreshLayersList();
    fabricCanvasRaw.fire('object:modified', {});
    fabricCanvasRaw.off('mouse:down', onClick);
    fabricCanvasRaw.defaultCursor = 'default';
    tool.value = 'select';
  };
  fabricCanvasRaw.on('mouse:down', onClick);
}
// ── Direct image upload (as opposed to picking from the shared library) ──
const imageInputRef = ref(null);
async function onImageFileChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const localAssetId = `local:${localProjectId.value}:upload:${crypto.randomUUID()}`;
    const url = await cacheLocalTemplateAsset(localAssetId, file);
    const img = await fabric.FabricImage.fromURL(url);
    const maxDim = Math.min(document.value.width, document.value.height) * 0.6;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    img.set({
      left: (document.value.width - img.width * scale) / 2,
      top: (document.value.height - img.height * scale) / 2,
      scaleX: scale, scaleY: scale,
    });
    img.set('data', {
      layerId: `layer_${Math.random().toString(36).slice(2, 10)}`,
      name: file.name,
      assetId: null,
      localAssetId,
      sourceWidth: img.width,
      sourceHeight: img.height,
    });
    fabricCanvasRaw.add(img);
    fabricCanvasRaw.setActiveObject(img);
    refreshLayersList();
  } catch (err) {
    toast.error(apiErrorMessage(err));
  }
}

// ── Canvas background color ─────────────────────────────────────────────
const canvasBackground = ref('#FFFFFF');
function onBackgroundChanged() {
  document.value.background = canvasBackground.value;
  fabricCanvasRaw.backgroundColor = canvasBackground.value;
  fabricCanvasRaw.requestRenderAll();
  scheduleAutosave();
}

// Preview mode swaps every bound text layer's displayed content between
// its literal `{{binding.key}}` placeholder (so the admin can see at a
// glance which layers are dynamic while editing) and realistic sample
// data (so they can judge how it'll actually look once populated) —
// toggling never touches the binding itself, only what's shown.
const previewMode = ref(false);
function togglePreview() {
  previewMode.value = !previewMode.value;
  for (const obj of fabricCanvasRaw.getObjects()) {
    if (obj.type !== 'textbox') continue;
    const data = obj.get('data') || {};
    if (!data.binding) continue;
    obj.set('text', previewMode.value ? sampleValueFor(data.binding) : `{{${data.binding}}}`);
  }
  fabricCanvasRaw.requestRenderAll();
}

async function onToggleShared(obj, shared) {
  const assetId = obj.get('data')?.assetId;
  if (!assetId) {
    toast.error('This image isn\'t backed by a saved asset yet — save the template once first.');
    return;
  }
  await setAssetShared(assetId, shared);
  obj.set('data', { ...(obj.get('data') || {}), assetShared: shared });
  toast.success(shared ? 'Now shared across templates' : 'No longer shared');
}
function onReplaceSource(obj) {
  replaceTargetObj = obj;
  replaceInputRef.value?.click();
}
async function onReplaceFileChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !replaceTargetObj) return;
  const data = replaceTargetObj.get('data') || {};
  const displayWidth = replaceTargetObj.getScaledWidth();
  const displayHeight = replaceTargetObj.getScaledHeight();
  const localAssetId = data.localAssetId || `local:${localProjectId.value}:replace:${data.layerId || crypto.randomUUID()}`;
  const url = await cacheLocalTemplateAsset(localAssetId, file);
  const img = await fabric.FabricImage.fromURL(url);
  replaceTargetObj.setElement(img.getElement());
  replaceTargetObj.set({
    width: img.width,
    height: img.height,
    cropX: 0,
    cropY: 0,
    scaleX: displayWidth / (img.width || 1),
    scaleY: displayHeight / (img.height || 1),
  });
  replaceTargetObj.set('data', {
    ...data,
    localAssetId,
    sourceWidth: img.width,
    sourceHeight: img.height,
  });
  replaceTargetObj.dirty = true;
  fabricCanvasRaw.requestRenderAll();
  fabricCanvasRaw.fire('object:modified', { target: replaceTargetObj });
  toast.success('Source replaced locally. Save to cloud to publish it.');
}

// ── Crop (Batch 21) ──────────────────────────────────────────────────────
const cropSession = ref(null);
const cropRatio = ref('free');
function onStartCrop(obj) {
  fabricCanvasRaw.discardActiveObject();
  cropSession.value = new CropSession(fabricCanvasRaw, obj);
  cropRatio.value = 'free';
}
function setCropRatio(preset) {
  cropRatio.value = preset.id;
  cropSession.value?.setRatio(preset.ratio);
}
function finishCrop() {
  cropSession.value?.apply();
  cropSession.value = null;
  refreshLayersList();
}
function cancelCrop() {
  cropSession.value?.cancel();
  cropSession.value = null;
}

// ── History (Batch 8) ───────────────────────────────────────────────────
async function undo() { await history?.undo(); refreshLayersList(); }
async function redo() { await history?.redo(); refreshLayersList(); }

// ── Layers panel event handlers (Batch 6) ──────────────────────────────
function onSelectLayer(obj, event) {
  // Shift/Cmd-click extends the current selection like Photoshop's Layers
  // panel — combined with the canvas's ActiveSelection, this gives a real
  // multi-select users can then Group/Delete/Merge from the context menu.
  const additive = event && (event.shiftKey || event.metaKey || event.ctrlKey);
  const isTopLevel = fabricCanvasRaw.getObjects().includes(obj);

  if (additive && isTopLevel && selectedObjects.value.length) {
    const current = selectedObjects.value.filter((o) => fabricCanvasRaw.getObjects().includes(o));
    const combined = current.includes(obj) ? current.filter((o) => o !== obj) : [...current, obj];
    fabricCanvasRaw.discardActiveObject();
    if (combined.length > 1) {
      const sel = new fabric.ActiveSelection(combined, { canvas: fabricCanvasRaw });
      fabricCanvasRaw.setActiveObject(sel);
    } else if (combined.length === 1) {
      fabricCanvasRaw.setActiveObject(combined[0]);
    }
    fabricCanvasRaw.requestRenderAll();
    selectedParent.value = null;
    return;
  }

  // A direct canvas child gets real interactive selection (drag handles,
  // rotate, etc). A layer nested inside a group isn't a direct canvas
  // child — it's selected for the Properties panel only.
  if (isTopLevel) {
    fabricCanvasRaw.setActiveObject(obj);
    fabricCanvasRaw.requestRenderAll();
    selectedParent.value = null;
  } else {
    fabricCanvasRaw.discardActiveObject();
    fabricCanvasRaw.requestRenderAll();
    selectedObjects.value = [obj];
    selectedParent.value = findParentGroup(obj, fabricCanvasRaw.getObjects());
  }
}
// Finds the immediate Fabric Group a nested object lives in, by walking
// the same tree the Layers panel displays — needed so "Delete" from the
// Properties panel (which only ever gets the raw object, not the
// LayersPanel's { obj, parent } row) still removes a nested layer
// correctly instead of silently no-op'ing against the top-level canvas.
function findParentGroup(target, objs) {
  for (const obj of objs) {
    if (obj.type !== 'group') continue;
    const children = obj.getObjects();
    if (children.includes(target)) return obj;
    const found = findParentGroup(target, children);
    if (found) return found;
  }
  return null;
}
function onToggleLock(obj) {
  const locked = !(obj.get('data') || {}).locked;
  setLayerLocked(obj, locked);
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: obj });
}
function onToggleVisible(obj) {
  setLayerVisible(fabricCanvasRaw, obj, obj.visible === false);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: obj });
}
function onReorder(displayIndex, direction) {
  // layersTopFirst is reversed vs Fabric's internal stacking order.
  const obj = layersTopFirst.value[displayIndex];
  if (direction === 'up') bringForward(fabricCanvasRaw, obj);
  else sendBackward(fabricCanvasRaw, obj);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}
function onBringForward(obj) {
  const collection = findParentGroup(obj, fabricCanvasRaw.getObjects()) || fabricCanvasRaw;
  collection.bringObjectForward(obj);
  collection.dirty = true;
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: obj });
}
function onSendBackward(obj) {
  const collection = findParentGroup(obj, fabricCanvasRaw.getObjects()) || fabricCanvasRaw;
  collection.sendObjectBackwards(obj);
  collection.dirty = true;
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: obj });
}
async function onDuplicateLayer(obj, parent) {
  const clone = await obj.clone();
  clone.set({
    left: (obj.left || 0) + 20,
    top: (obj.top || 0) + 20,
    data: { ...(obj.get('data') || {}), layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: `${(obj.get('data') || {}).name || obj.type} copy` },
  });
  if (parent) {
    parent.add(clone);
    parent.dirty = true;
  } else {
    fabricCanvasRaw.add(clone);
    fabricCanvasRaw.setActiveObject(clone);
  }
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}
function onRenameLayer(obj, name) {
  obj.set('data', { ...(obj.get('data') || {}), name });
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}
function onMoveLayerTo(fromRow, toRow) {
  if (!fromRow?.obj || !toRow?.obj || fromRow.obj === toRow.obj) return;
  const source = fromRow.parent || fabricCanvasRaw;
  const destination = toRow.obj.type === 'group' ? toRow.obj : (toRow.parent || fabricCanvasRaw);
  if (destination === fromRow.obj || destination?.isDescendantOf?.(fromRow.obj)) return;

  if (source === destination && toRow.obj.type !== 'group') {
    const targetZ = destination.getObjects().indexOf(toRow.obj);
    if (targetZ < 0 || destination.getObjects().indexOf(fromRow.obj) < 0) return;
    if (destination === fabricCanvasRaw) fabricCanvasRaw.moveObjectTo(fromRow.obj, targetZ);
    else {
      destination.remove(fromRow.obj);
      destination.insertAt(Math.min(targetZ, destination.getObjects().length), fromRow.obj);
      destination.dirty = true;
      destination.setCoords();
    }
  } else {
    // Fabric's Group.remove() sends a child back to canvas coordinates;
    // Group.add()/insertAt() then converts it into the destination group's
    // plane. Using those APIs preserves the layer's visible position.
    source.remove(fromRow.obj);
    if (destination === fabricCanvasRaw) {
      const targetZ = toRow.obj.type === 'group'
        ? fabricCanvasRaw.getObjects().indexOf(toRow.obj) + 1
        : fabricCanvasRaw.getObjects().indexOf(toRow.obj);
      fabricCanvasRaw.insertAt(Math.max(0, targetZ), fromRow.obj);
    } else {
      const targetZ = toRow.obj.type === 'group'
        ? destination.getObjects().length
        : destination.getObjects().indexOf(toRow.obj);
      destination.insertAt(Math.max(0, targetZ), fromRow.obj);
      destination.dirty = true;
      destination.setCoords();
    }
  }
  if (destination === fabricCanvasRaw) {
    fabricCanvasRaw.setActiveObject(fromRow.obj);
    selectedParent.value = null;
  } else {
    fabricCanvasRaw.discardActiveObject();
    selectedObjects.value = [markRaw(fromRow.obj)];
    selectedParent.value = destination;
  }
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: fromRow.obj });
}
function onDeleteLayer(obj, parent) {
  if (parent) parent.remove(obj);
  else fabricCanvasRaw.remove(obj);
  fabricCanvasRaw.discardActiveObject();
  if (selectedObjects.value.includes(obj)) selectedObjects.value = [];
  fabricCanvasRaw.requestRenderAll();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}

async function onRasterizeLayer(obj) {
  if (!fabricCanvasRaw) return;
  const parent = findParentGroup(obj, fabricCanvasRaw.getObjects());
  const rasterized = await rasterizeObject(fabricCanvasRaw, obj);
  if (rasterized) {
    selectedObjects.value = [markRaw(rasterized)];
    selectedParent.value = parent;
  }
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}

async function onRestoreText(obj, { notify = true } = {}) {
  if (!fabricCanvasRaw) return;
  const restored = await restoreConvertedText(fabricCanvasRaw, obj);
  if (!restored) {
    if (notify) toast.error('This layer does not contain restorable PSD text metadata.');
    return null;
  }
  selectedObjects.value = [markRaw(restored)];
  refreshLayersList();
  if (notify) toast.success('Text restored. Its original Photoshop effects may differ while editing.');
  return restored;
}

// ── Grouping / merging ─────────────────────────────────────────────────
// Group: wraps N selected top-level layers in a Fabric Group at their
// current shared bounding box. Ungroup: dissolves a Group back into its
// individual children with their absolute positions preserved. Merge:
// flattens N layers into a single rasterized image at their combined
// bounding box — same idea as Photoshop's "Merge Layers" (Cmd+E).
function onGroupLayers(layers) {
  const targets = layers.filter((o) => fabricCanvasRaw.getObjects().includes(o));
  if (targets.length < 2) return;
  const group = new fabric.Group(targets, { originX: 'left', originY: 'top' });
  group.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'Group' });
  targets.forEach((o) => fabricCanvasRaw.remove(o));
  fabricCanvasRaw.add(group);
  fabricCanvasRaw.setActiveObject(group);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}
function createEmptyGroup() {
  if (selectedObjects.value.length > 1) {
    onGroupLayers(selectedObjects.value);
    return;
  }
  const group = new fabric.Group([], {
    left: document.value.width / 2,
    top: document.value.height / 2,
    originX: 'left', originY: 'top',
    subTargetCheck: true,
  });
  group.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'New group' });
  fabricCanvasRaw.add(group);
  fabricCanvasRaw.setActiveObject(group);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', { target: group });
}
function onUngroupLayer(group) {
  if (!group || group.type !== 'group') return;
  const groupTransform = group.calcTransformMatrix();
  const children = [...group.getObjects()];
  // Move each child from group coordinates to canvas coordinates before
  // removing the group. This preserves its exact apparent position,
  // rotation and scale instead of making ungrouped layers jump.
  children.forEach((child) => fabric.util.sendObjectToPlane(child, groupTransform));
  group.removeAll();
  const index = fabricCanvasRaw.getObjects().indexOf(group);
  fabricCanvasRaw.remove(group);
  children.forEach((child, i) => {
    fabricCanvasRaw.insertAt(index + i, child);
    child.setCoords();
  });
  fabricCanvasRaw.discardActiveObject();
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}
async function onMergeLayers(layers) {
  const targets = layers.filter((o) => fabricCanvasRaw.getObjects().includes(o));
  if (targets.length < 2) return;
  // Wrap in a temporary group just to get an accurate combined bounding
  // box, rasterize the whole thing, then swap the individual layers for
  // the single flattened image at the same z-order as the topmost one.
  const tmp = new fabric.Group(targets.slice(), { originX: 'left', originY: 'top' });
  const topZ = Math.max(...targets.map((o) => fabricCanvasRaw.getObjects().indexOf(o)));
  const dataUrl = tmp.toDataURL({ format: 'png' });
  const bounds = tmp.getBoundingRect();
  tmp.removeAll(); // release the children so we can re-remove them from the canvas cleanly
  targets.forEach((o) => fabricCanvasRaw.remove(o));
  const img = await fabric.FabricImage.fromURL(dataUrl);
  img.set({ left: bounds.left, top: bounds.top, originX: 'left', originY: 'top', scaleX: bounds.width / img.width, scaleY: bounds.height / img.height });
  img.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'Merged', liveCanvas: true });
  fabricCanvasRaw.insertAt(topZ, img);
  fabricCanvasRaw.setActiveObject(img);
  refreshLayersList();
  fabricCanvasRaw.fire('object:modified', {});
}

// ── Masking (Batch 12) ──────────────────────────────────────────────────
async function onClipMask(selected) {
  if (selected.length !== 2) return;
  // Whichever of the two sits higher in the stack becomes the clip shape;
  // the other keeps its content and gains the mask.
  const [a, b] = selected;
  const aIndex = fabricCanvasRaw.getObjects().indexOf(a);
  const bIndex = fabricCanvasRaw.getObjects().indexOf(b);
  const [top, bottom] = aIndex > bIndex ? [a, b] : [b, a];
  await applyClipMask(fabricCanvasRaw, bottom, top);
  fabricCanvasRaw.setActiveObject(bottom);
  refreshLayersList();
}
function onRemoveMask(obj) {
  removeMask(fabricCanvasRaw, obj);
}

const maskPainter = ref(null);
const maskBrushMode = ref('hide');
const maskBrushSize = ref(40);
const maskBrushHardness = ref(0.7);
let maskPreviewImage = null;
let previousMask = null;
let disposeMaskMouseDown = null;
let disposeMaskMouseMove = null;
let disposeMaskMouseUp = null;

function onPaintMask(obj) {
  if (maskPainter.value) cleanupMaskPaint();
  tool.value = 'mask-paint';
  fabricCanvasRaw.discardActiveObject();
  fabricCanvasRaw.selection = false;
  // Freeze the target so clicks paint instead of dragging/selecting it —
  // restored in cleanupMaskPaint().
  obj.set('data', { ...(obj.get('data') || {}), _wasSelectable: obj.selectable, _wasEvented: obj.evented });
  obj.set({ selectable: false, evented: false });

  previousMask = obj.clipPath || null;
  maskPainter.value = new MaskPainter(obj, {
    brushSize: maskBrushSize.value,
    hardness: maskBrushHardness.value,
    initialCanvas: previousMask?.getElement?.(),
  });

  // Live preview: wrap the painter's own canvas element as a Fabric image
  // assigned as clipPath right away, with caching off so every stroke's
  // pixel changes show up on the very next render — no re-wrapping needed
  // per stroke.
  maskPreviewImage = new fabric.FabricImage(maskPainter.value.canvas, {
    left: maskPainter.value.bounds.left, top: maskPainter.value.bounds.top,
    absolutePositioned: true, selectable: false, evented: false, objectCaching: false,
  });
  obj.set('clipPath', maskPreviewImage);
  fabricCanvasRaw.requestRenderAll();

  const paintAt = (opt) => {
    const p = fabricCanvasRaw.getScenePoint(opt.e);
    maskPainter.value.brushSize = maskBrushSize.value;
    maskPainter.value.hardness = maskBrushHardness.value;
    maskPainter.value.paint(p, maskBrushMode.value);
    fabricCanvasRaw.requestRenderAll();
  };
  let painting = false;
  disposeMaskMouseDown = fabricCanvasRaw.on('mouse:down', (opt) => { painting = true; paintAt(opt); });
  disposeMaskMouseMove = fabricCanvasRaw.on('mouse:move', (opt) => { if (painting) paintAt(opt); });
  disposeMaskMouseUp = fabricCanvasRaw.on('mouse:up', () => { painting = false; });
  fabricCanvasRaw._maskPaintTarget = obj;
}

async function finishMaskPaint() {
  const obj = fabricCanvasRaw._maskPaintTarget;
  await maskPainter.value?.apply(fabricCanvasRaw);
  cleanupMaskPaint();
  fabricCanvasRaw.setActiveObject(obj);
  refreshLayersList();
}
function cancelMaskPaint() {
  const obj = fabricCanvasRaw._maskPaintTarget;
  if (obj) obj.set('clipPath', previousMask || undefined);
  cleanupMaskPaint();
}
function cleanupMaskPaint() {
  const obj = fabricCanvasRaw._maskPaintTarget;
  if (obj) {
    const data = { ...(obj.get('data') || {}) };
    const wasSelectable = data._wasSelectable ?? true;
    const wasEvented = data._wasEvented ?? wasSelectable;
    delete data._wasSelectable;
    delete data._wasEvented;
    obj.set({ selectable: wasSelectable, evented: wasEvented, data });
  }
  disposeMaskMouseDown?.();
  disposeMaskMouseMove?.();
  disposeMaskMouseUp?.();
  disposeMaskMouseDown = disposeMaskMouseMove = disposeMaskMouseUp = null;
  fabricCanvasRaw.selection = true;
  fabricCanvasRaw._maskPaintTarget = null;
  maskPainter.value = null;
  maskPreviewImage = null;
  previousMask = null;
  tool.value = 'select';
  fabricCanvasRaw.requestRenderAll();
}

// Resolves and loads whichever fonts a document's own text layers actually
// use, independent of the FontPicker's roster (which is paginated/searched
// now that the roster holds 1,500+ fonts after the bulk import — a
// template's font isn't guaranteed to be on the picker's default page).
// Best-effort: a family with no matching Font doc (a generic fallback like
// Arial/Inter) is simply left alone, the browser's own font covers it.
async function preloadDocumentFonts(doc) {
  const families = doc?.fontFamilies;
  if (!families?.length) return;
  try {
    const rows = await getFontsByFamilies(families);
    // A font host can be slow or blocked while the rest of Amo Events is
    // healthy. Never hold the entire Studio behind an unbounded FontFace or
    // Google stylesheet request; paint with a fallback, then the missing-font
    // workflow can resolve the family explicitly.
    const matchesFamily = (font, family) => {
      const wanted = family.toLowerCase();
      return font.family?.toLowerCase() === wanted
        || (font.aliases || []).some((alias) => alias.toLowerCase() === wanted);
    };
    await Promise.allSettled(families.map((family) => {
      const font = rows.find((row) => matchesFamily(row, family));
      if (!font) return Promise.resolve();
      // Do not cancel a slow font after the five-second paint budget. Let it
      // finish in the background and explicitly refresh Fabric's text metrics
      // when it arrives; otherwise a successful late BellMTBold download
      // remained visually stuck in the fallback face until another edit.
      const eventualLoad = loadFont(font, family).then(() => {
        if (fabricCanvasRaw) refreshTextMetricsPreservingLayout(
          fabricCanvasRaw,
          (obj) => fabricTextUsesFamily(obj, family),
        );
      });
      return Promise.race([
      eventualLoad,
      new Promise((resolve) => window.setTimeout(resolve, 5000)),
      ]);
    }));
  } catch { /* rendering falls back to the browser default font; not worth surfacing */ }
}

// PSD files only store font names; they do not embed the font files. Keep a
// document-level, durable list of unresolved families and explain it in one
// place instead of silently falling back or turning the words into pixels.
const SYSTEM_FONT_FAMILIES = new Set([
  'arial', 'helvetica', 'times new roman', 'georgia', 'courier new',
  'verdana', 'trebuchet ms', 'system-ui', 'sans-serif', 'serif',
  'monospace', 'inter',
]);
const missingFontsOpen = ref(false);
const missingFonts = ref([]);
let pendingTextEditObject = null;

function addCanonicalFontUsage(target, family, layer) {
  if (!family) return;
  const key = String(family).trim();
  if (!key) return;
  const current = target.get(key) || {
    family: key,
    layerCount: 0,
    layerIds: new Set(),
    weight: Number(layer?.fontWeight) || 400,
    style: layer?.fontStyle || 'normal',
  };
  const layerKey = layer?.id || `${layer?.name || 'text'}:${key}`;
  if (!current.layerIds.has(layerKey)) {
    current.layerIds.add(layerKey);
    current.layerCount += 1;
  }
  target.set(key, current);
}

function collectCanonicalFontUsage(layers, target = new Map()) {
  for (const layer of layers || []) {
    const text = layer.type === 'text' ? layer : layer.convertedFromText;
    if (text) {
      const textLayer = { ...layer, ...text, id: layer.id };
      addCanonicalFontUsage(target, text.fontFamily, textLayer);
      for (const run of text.charStyles || []) addCanonicalFontUsage(target, run.fontFamily, { ...textLayer, ...run });
    }
    if (layer.children) collectCanonicalFontUsage(layer.children, target);
  }
  return target;
}

async function refreshMissingFonts(doc, { open = true } = {}) {
  const usage = collectCanonicalFontUsage(doc?.layers);
  for (const family of doc?.missingFontFamilies || []) {
    if (!usage.has(family)) addCanonicalFontUsage(usage, family, { name: family });
  }
  const candidates = [...usage.keys()].filter((family) => !SYSTEM_FONT_FAMILIES.has(family.toLowerCase()));
  if (!candidates.length) {
    missingFonts.value = [];
    if (doc) doc.missingFontFamilies = [];
    missingFontsOpen.value = false;
    return;
  }

  let available = new Set();
  try {
    const rows = await getFontsByFamilies(candidates);
    available = new Set(rows.flatMap((row) => [row.family, ...(row.aliases || [])])
      .map((family) => family?.toLowerCase()).filter(Boolean));
  } catch {
    // Offline: retain the importer's explicit list, but do not accuse every
    // historical document font of being missing without an exact lookup.
    const explicit = new Set((doc?.missingFontFamilies || []).map((family) => family.toLowerCase()));
    missingFonts.value = [...usage.values()].filter((item) => explicit.has(item.family.toLowerCase()));
    if (open && missingFonts.value.length) missingFontsOpen.value = true;
    return;
  }

  missingFonts.value = [...usage.values()]
    .filter((item) => !available.has(item.family.toLowerCase()))
    .map(({ layerIds, ...item }) => item);
  if (doc) doc.missingFontFamilies = missingFonts.value.map((item) => item.family);
  if (open) missingFontsOpen.value = missingFonts.value.length > 0;
}

function canonicalTextUsesFamily(text, family) {
  const wanted = family.toLowerCase();
  return text?.fontFamily?.toLowerCase() === wanted
    || (text?.charStyles || []).some((run) => run.fontFamily?.toLowerCase() === wanted);
}

function replaceCanonicalTextFamily(text, family, replacement) {
  if (!text) return;
  const wanted = family.toLowerCase();
  if (text.fontFamily?.toLowerCase() === wanted) text.fontFamily = replacement;
  for (const run of text.charStyles || []) {
    if (run.fontFamily?.toLowerCase() === wanted) run.fontFamily = replacement;
  }
}

function replaceFabricStyleFamilies(styles, family, replacement) {
  const wanted = family.toLowerCase();
  for (const line of Object.values(styles || {})) {
    for (const style of Object.values(line || {})) {
      if (style?.fontFamily?.toLowerCase() === wanted) style.fontFamily = replacement;
    }
  }
}

function fabricTextUsesFamily(obj, family) {
  const wanted = family.toLowerCase();
  if (obj?.fontFamily?.toLowerCase() === wanted) return true;
  return Object.values(obj?.styles || {}).some((line) =>
    Object.values(line || {}).some((style) => style?.fontFamily?.toLowerCase() === wanted));
}

async function resolveMissingFont(family, replacement) {
  if (!fabricCanvasRaw) return;
  let pendingRestored = null;
  const changedTextObjects = [];
  async function walk(objects) {
    for (const obj of [...objects]) {
      if (obj.type === 'group') {
        await walk(obj.getObjects());
        continue;
      }
      if (['textbox', 'text', 'i-text'].includes(obj.type)) {
        mutateTextPreservingLayout(obj, () => {
          if (obj.fontFamily?.toLowerCase() === family.toLowerCase()) obj.set('fontFamily', replacement);
          replaceFabricStyleFamilies(obj.styles, family, replacement);
        });
        changedTextObjects.push(obj);
        continue;
      }
      if (obj.type !== 'image') continue;
      const data = obj.get('data') || {};
      const converted = data.sourceLayer?.convertedFromText;
      if (!canonicalTextUsesFamily(converted, family)) continue;
      const sourceLayer = structuredClone(data.sourceLayer);
      replaceCanonicalTextFamily(sourceLayer.convertedFromText, family, replacement);
      obj.set('data', { ...data, sourceLayer });
      const restored = await restoreConvertedText(fabricCanvasRaw, obj);
      if (obj === pendingTextEditObject) pendingRestored = restored;
    }
  }

  await walk(fabricCanvasRaw.getObjects());
  // The mutation above already remeasured each object against its pre-change
  // rectangle; this call also refreshes any nested group coordinate caches.
  refreshTextMetricsPreservingLayout(changedTextObjects);
  missingFonts.value = missingFonts.value.filter((item) => item.family.toLowerCase() !== family.toLowerCase());
  document.value.missingFontFamilies = missingFonts.value.map((item) => item.family);
  if (!missingFonts.value.length) missingFontsOpen.value = false;
  refreshLayersList();
  fabricCanvasRaw.requestRenderAll();
  fabricCanvasRaw.fire('object:modified', { target: pendingRestored || undefined });

  if (pendingTextEditObject) {
    const editTarget = pendingRestored || pendingTextEditObject;
    pendingTextEditObject = null;
    if (['textbox', 'text', 'i-text'].includes(editTarget?.type)) {
      fabricCanvasRaw.setActiveObject(editTarget);
      editTarget.enterEditing();
      editTarget.selectAll();
      fabricCanvasRaw.requestRenderAll();
    }
  }
}

async function onMissingFontUploaded(family) {
  await resolveMissingFont(family, family);
  toast.success(`“${family}” uploaded. Its PSD text is editable now.`);
}

async function onFontsImported() {
  await preloadDocumentFonts(document.value);
  await refreshMissingFonts(document.value, { open: true });
  fabricCanvasRaw?.requestRenderAll();
  toast.success('Font pack imported. Matching PSD text has been refreshed.');
}

async function onMissingFontUseDefault(family) {
  await resolveMissingFont(family, 'Inter');
  toast.success(`Replaced “${family}” with Inter.`);
}

async function boot() {
  loading.value = true;
  try {
    const id = route.params.id;
    const blank = () => ({ version: 1, width: 1080, height: 1920, background: '#FFFFFF', fontFamilies: [], layers: [] });
    const localDraft = await getTemplateProject(localProjectId.value);
    let localDraftNeedsSync = false;
    if (id) {
      try {
        if (!isOnline.value) throw new Error('offline');
        const tpl = await api.adminGet(id);
        template.value = tpl;
        const cloudPages = tpl.pages?.length ? tpl.pages : [{ name: 'Page 1', document: tpl.document || blank() }];
        const legacyUnsyncedDraft = localDraft?.dirty == null
          && localDraft?.savedLocallyAt > (new Date(tpl.updatedAt || 0).getTime() + 1000)
          && JSON.stringify(localDraft.pages) !== JSON.stringify(cloudPages);
        const localIsNewer = localDraft?.pages?.length && (localDraft.dirty === true || legacyUnsyncedDraft);
        if (localIsNewer) {
          name.value = localDraft.name || tpl.name;
          pages.value = localDraft.pages;
          localDraftNeedsSync = true;
          toast.success('Restored newer edits from this device. Use Save to cloud when ready.');
        } else {
          name.value = tpl.name;
          pages.value = cloudPages;
        }
      } catch (err) {
        if (!localDraft) throw err;
        template.value = localDraft.template || { _id: id };
        name.value = localDraft.name || 'Untitled template';
        pages.value = localDraft.pages?.length ? localDraft.pages : [{ name: 'Page 1', document: localDraft.document || blank() }];
        localDraftNeedsSync = localDraft.dirty !== false;
        toast.success('Opened the local offline draft.');
      }
    } else {
      template.value = localDraft?.template || null;
      name.value = localDraft?.name || name.value;
      pages.value = localDraft?.pages?.length ? localDraft.pages : [{ name: 'Page 1', document: localDraft?.document || blank() }];
      localDraftNeedsSync = !!localDraft && localDraft.dirty !== false;
    }
    document.value = pages.value[0].document;
    canvasBackground.value = document.value.background || '#FFFFFF';

    fabricCanvasRaw = createEngineCanvas(canvasElRef.value, { width: document.value.width, height: document.value.height, background: canvasBackground.value });
    fabricCanvas.value = fabricCanvasRaw;

    // Isolated on purpose: a document with one bad layer (dead asset,
    // network hiccup) must not skip tool/event wiring below it — that was
    // the actual cause of "no layers AND nothing works", since a thrown
    // error here used to abort the rest of boot() entirely, leaving the
    // canvas with no selection tracking, no autosave, no keyboard
    // shortcuts, and no history — a half-initialized editor that looked
    // broken everywhere, not just missing the layer that actually failed.
    try {
      await preloadDocumentFonts(document.value);
      const { failures } = await loadDocument(fabricCanvasRaw, document.value, { resolveAssetUrl });
      await refreshMissingFonts(document.value);
      if (failures?.length) {
        toast.error(`${failures.length} layer${failures.length > 1 ? 's' : ''} failed to load and ${failures.length > 1 ? 'were' : 'was'} skipped — check the console for details.`);
      }
    } catch (err) {
      toast.error(`Couldn't load this document: ${apiErrorMessage(err)}`);
    }
    fitZoomToViewport();
    applyZoom();
    refreshLayersList();

    // A direct canvas click on a layer nested inside a group (true for
    // virtually every PSD-imported layer, which all live several groups
    // deep) resolves through Fabric's own subTargetCheck and fires these
    // two events with the nested object as the selection target — same as
    // clicking its row in the Layers panel. Unconditionally nulling
    // selectedParent here silently broke that: Delete (button AND
    // keyboard) would then call fabricCanvasRaw.remove(obj) on an object
    // that was never the canvas's own child, a guaranteed no-op, on
    // anything selected by clicking the canvas directly rather than the
    // Layers panel row.
    const syncSelectedParent = (e) => {
      const sel = e.selected || [];
      selectedParent.value = sel.length === 1 ? findParentGroup(sel[0], fabricCanvasRaw.getObjects()) : null;
    };
    fabricCanvasRaw.on('selection:created', (e) => { selectedObjects.value = (e.selected || []).map(markRaw); syncSelectedParent(e); });
    fabricCanvasRaw.on('selection:updated', (e) => { selectedObjects.value = (e.selected || []).map(markRaw); syncSelectedParent(e); });
    fabricCanvasRaw.on('selection:cleared', () => { selectedObjects.value = []; selectedParent.value = null; });
    fabricCanvasRaw.on('object:added', refreshLayersList);
    fabricCanvasRaw.on('object:removed', refreshLayersList);
    fabricCanvasRaw.on('object:modified', refreshLayersList);
    fabricCanvasRaw.on('object:modified', scheduleAutosave);
    fabricCanvasRaw.on('object:added', scheduleAutosave);
    fabricCanvasRaw.on('object:removed', scheduleAutosave);
    fabricCanvasRaw.on('mouse:down', onMouseDownAltDuplicate);
    fabricCanvasRaw.on('mouse:down', onMouseDownTrackGroupClick);
    fabricCanvasRaw.on('mouse:up', onMouseUpDrillIntoGroup);
    fabricCanvasRaw.on('mouse:dblclick', onDblClickDrillIntoGroup);
    fabricCanvasRaw.on('mouse:move', updateBrushCursor);
    fabricCanvasRaw.on('mouse:out', hideBrushCursor);
    fabricCanvasRaw.on('object:moving', onObjectMovingShowGuides);
    fabricCanvasRaw.on('mouse:up', clearGuides);

    resetHistory();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onWindowClickCloseShapesMenu);
    window.addEventListener('resize', onViewportScroll);
    viewportRef.value?.addEventListener('scroll', onViewportScroll);
    nextTick(onViewportScroll);
    readyForAutosave = true;
    await saveLocalDraft({ notify: false, dirty: localDraftNeedsSync });
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

// ── Pages (Batch 23) ─────────────────────────────────────────────────────
// A "New empty layer", a rasterized shape, or anything touched by
// brush/eraser/clone/dodge lives ONLY as an in-browser <canvas> element
// (see retouchTools.js's ensureLiveCanvas) — it was never uploaded to the
// backend as a real Asset. serializeDocument() has no choice but to save
// whatever assetId that layer currently has, which for these is null.
// loadDocument() then silently drops any image layer with no assetId (by
// design — nothing to fetch) on the NEXT load. That combination is why
// content that was never even touched could look like it "disappeared":
// a fresh empty layer or a rasterize/erase edit saved fine in the moment,
// then vanished the next time the document was opened. This uploads every
// live-canvas layer's current pixels as a real Asset before every save,
// so there's always something on the server to load back.
let persistingLiveCanvases = false;
function walkFabricObjects(objects, out = []) {
  for (const obj of objects || []) {
    out.push(obj);
    if (obj.type === 'group') walkFabricObjects(obj.getObjects(), out);
  }
  return out;
}
async function elementPngBlob(element) {
  if (!element) return null;
  if (typeof element.toBlob === 'function') return new Promise((resolve) => element.toBlob(resolve, 'image/png'));
  const canvas = window.document.createElement('canvas');
  canvas.width = element.naturalWidth || element.width || 1;
  canvas.height = element.naturalHeight || element.height || 1;
  canvas.getContext('2d').drawImage(element, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
async function persistLiveCanvasLayers({ cloud = false } = {}) {
  if (!fabricCanvasRaw || persistingLiveCanvases) return;
  const targets = walkFabricObjects(fabricCanvasRaw.getObjects()).filter((o) => o.type === 'image');
  if (!targets.length) return;
  persistingLiveCanvases = true;
  try {
    for (const img of targets) {
      let data = img.get('data') || {};
      if (data.liveCanvas) {
        const blob = await elementPngBlob(img.getElement());
        if (blob) {
          const localAssetId = data.localAssetId || `local:${localProjectId.value}:layer:${data.layerId || crypto.randomUUID()}`;
          await cacheLocalTemplateAsset(localAssetId, blob);
          data = { ...data, localAssetId };
          if (cloud) {
            const file = new File([blob], `${data.name || 'layer'}.png`, { type: 'image/png' });
            // Fork on the first pixel edit so painting a shared/library
            // image never overwrites other templates that use its source.
            // Later saves in this session can safely update the fork.
            const hasCloudAsset = data.liveCanvasCloudAssetId && data.assetId === data.liveCanvasCloudAssetId;
            const asset = hasCloudAsset ? await replaceAsset(data.assetId, file) : await uploadAsset(file, { name: data.name || 'Layer' });
            await cacheLocalTemplateAsset(asset._id, blob);
            data = { ...data, assetId: asset._id, localAssetId: null, liveCanvasCloudAssetId: asset._id };
          }
          img.set('data', data);
        }
      }

      const maskElement = img.clipPath?.getElement?.();
      if (maskElement) {
        const maskBlob = await elementPngBlob(maskElement);
        if (maskBlob) {
          const localMaskAssetId = data.localMaskAssetId || `local:${localProjectId.value}:mask:${data.layerId || crypto.randomUUID()}`;
          await cacheLocalTemplateAsset(localMaskAssetId, maskBlob);
          data = { ...data, localMaskAssetId };
          if (cloud) {
            const maskFile = new File([maskBlob], `${data.name || 'layer'}-mask.png`, { type: 'image/png' });
            const hasCloudMask = data.maskAssetId && !String(data.maskAssetId).startsWith('local:');
            const asset = hasCloudMask ? await replaceAsset(data.maskAssetId, maskFile) : await uploadAsset(maskFile, { name: `${data.name || 'Layer'} mask` });
            await cacheLocalTemplateAsset(asset._id, maskBlob);
            data = { ...data, maskAssetId: asset._id, localMaskAssetId: null };
          }
          img.set('data', data);
        }
      }
    }
  } finally {
    persistingLiveCanvases = false;
  }
}

function captureActivePage() {
  if (!fabricCanvasRaw) return;
  pages.value[activePage.value].document = serializeDocument(fabricCanvasRaw, { previousDocument: pages.value[activePage.value].document });
}
async function switchPage(index) {
  if (index === activePage.value) return;
  await persistLiveCanvasLayers({ cloud: false });
  captureActivePage();
  activePage.value = index;
  document.value = pages.value[index].document;
  readyForAutosave = false; // re-armed once this page's loadDocument settles, same reasoning as boot()
  try {
    await preloadDocumentFonts(document.value);
    const { failures } = await loadDocument(fabricCanvasRaw, document.value, { resolveAssetUrl });
    await refreshMissingFonts(document.value);
    if (failures?.length) toast.error(`${failures.length} layer${failures.length > 1 ? 's' : ''} failed to load and ${failures.length > 1 ? 'were' : 'was'} skipped.`);
  } catch (err) {
    toast.error(`Couldn't load this page: ${apiErrorMessage(err)}`);
  }
  applyZoom();
  refreshLayersList();
  readyForAutosave = true;
  resetHistory();
}
function addPage() {
  captureActivePage();
  pages.value.push({ name: `Page ${pages.value.length + 1}`, document: { version: 1, width: document.value.width, height: document.value.height, background: '#FFFFFF', fontFamilies: [], layers: [] } });
  switchPage(pages.value.length - 1);
}
async function duplicatePage(index) {
  if (index === activePage.value) {
    await persistLiveCanvasLayers({ cloud: false });
    captureActivePage();
  }
  const source = pages.value[index];
  pages.value.splice(index + 1, 0, { name: `${source.name} copy`, document: JSON.parse(JSON.stringify(source.document)) });
  switchPage(index + 1);
}
async function removePage(index) {
  if (pages.value.length <= 1) return;
  if (!(await askConfirm(`Delete "${pages.value[index].name}"? This can't be undone.`))) return;
  pages.value.splice(index, 1);
  const nextActive = Math.min(activePage.value, pages.value.length - 1);
  if (index === activePage.value) {
    // The active page was removed outright — load whatever now sits at
    // that slot instead of re-serializing a page that no longer exists.
    activePage.value = nextActive;
    document.value = pages.value[nextActive].document;
    readyForAutosave = false;
    try {
      await preloadDocumentFonts(document.value);
      const { failures } = await loadDocument(fabricCanvasRaw, document.value, { resolveAssetUrl });
      await refreshMissingFonts(document.value);
      if (failures?.length) toast.error(`${failures.length} layer${failures.length > 1 ? 's' : ''} failed to load and ${failures.length > 1 ? 'were' : 'was'} skipped.`);
    } catch (err) {
      toast.error(`Couldn't load this page: ${apiErrorMessage(err)}`);
    }
    applyZoom();
    refreshLayersList();
    readyForAutosave = true;
    resetHistory();
  } else if (index < activePage.value) {
    activePage.value -= 1;
  }
  scheduleAutosave();
}

const renamingPage = ref(null);
const pageNameDraft = ref('');
function startPageRename(i) {
  renamingPage.value = i;
  pageNameDraft.value = pages.value[i].name;
}
function commitPageRename(i) {
  if (renamingPage.value === null) return;
  const name = pageNameDraft.value.trim();
  if (name) pages.value[i].name = name;
  renamingPage.value = null;
  scheduleAutosave();
}

// ── Autosave (Batch 27) ──────────────────────────────────────────────────
// A burst of edits collapses into one IndexedDB save. Cloud persistence is
// deliberately explicit so offline work remains fast and never publishes by
// accident.
function scheduleAutosave() {
  if (!readyForAutosave) return;
  autosaveStatus.value = 'pending';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    try {
      await saveLocalDraft({ notify: false });
    } catch {
      autosaveStatus.value = '';
    }
  }, 800);
}

async function saveLocalDraft({ notify = false, dirty = true } = {}) {
  if (!fabricCanvasRaw) return;
  await persistLiveCanvasLayers({ cloud: false });
  captureActivePage();
  const saved = await putTemplateProject(localProjectId.value, {
    name: name.value,
    template: template.value ? { ...template.value, name: name.value } : null,
    document: pages.value[0]?.document,
    pages: pages.value,
    dirty,
  });
  if (!saved) {
    const message = 'This browser could not store the local template draft. Check available storage and try again.';
    if (notify) toast.error(message);
    throw new Error(message);
  }
  autosaveStatus.value = 'local';
  if (notify) toast.success('Saved locally. This draft is available offline on this device.');
}

async function materializeDocumentAssetsForCloud(doc) {
  const visit = async (layers) => {
    for (const layer of layers || []) {
      if (layer.children) await visit(layer.children);
      if (layer.type !== 'image') continue;
      if (layer.localAssetId) {
        const blob = await getCachedTemplateAssetBlob(layer.localAssetId);
        if (!blob) throw new Error(`The local pixels for “${layer.name || 'Layer'}” are unavailable on this device.`);
        const file = new File([blob], `${layer.name || 'layer'}.png`, { type: 'image/png' });
        const hasCloudAsset = layer.assetId && !String(layer.assetId).startsWith('local:');
        const asset = hasCloudAsset ? await replaceAsset(layer.assetId, file) : await uploadAsset(file, { name: layer.name || 'Layer' });
        await cacheLocalTemplateAsset(asset._id, blob);
        layer.assetId = asset._id;
        delete layer.localAssetId;
      }
      if (layer.mask?.localAssetId) {
        const blob = await getCachedTemplateAssetBlob(layer.mask.localAssetId);
        if (!blob) throw new Error(`The local mask for “${layer.name || 'Layer'}” is unavailable on this device.`);
        const file = new File([blob], `${layer.name || 'layer'}-mask.png`, { type: 'image/png' });
        const hasCloudAsset = layer.mask.assetId && !String(layer.mask.assetId).startsWith('local:');
        const asset = hasCloudAsset ? await replaceAsset(layer.mask.assetId, file) : await uploadAsset(file, { name: `${layer.name || 'Layer'} mask` });
        await cacheLocalTemplateAsset(asset._id, blob);
        layer.mask.assetId = asset._id;
        delete layer.mask.localAssetId;
      }
      if (!layer.localAssetId) delete layer.localAssetId;
      if (layer.mask && !layer.mask.localAssetId) delete layer.mask.localAssetId;
    }
  };
  await visit(doc?.layers);
}

async function save() {
  if (!fabricCanvasRaw) return;
  if (!isOnline.value) {
    await saveLocalDraft({ notify: true });
    return;
  }
  saving.value = true;
  try {
    await persistLiveCanvasLayers({ cloud: true });
    captureActivePage();
    for (const page of pages.value) await materializeDocumentAssetsForCloud(page.document);
    const primaryDoc = pages.value[0].document;
    const payload = {
      name: name.value, sourceType: 'document',
      document: primaryDoc, fontFamilies: primaryDoc.fontFamilies,
      pages: pages.value.length > 1 ? pages.value : [],
    };
    if (template.value?._id) {
      await api.adminUpdate(template.value._id, payload);
    } else {
      // Shouldn't normally happen — "New from scratch" creates the template
      // row up front — but self-heal instead of blocking the save if the
      // studio was somehow opened without one.
      const created = await api.adminCreateBlank({ name: name.value, category: 'wedding', width: primaryDoc.width, height: primaryDoc.height });
      await api.adminUpdate(created._id, payload);
      template.value = created;
    }
    const destination = isVariantMode.value
      ? `/studio/variants/${variantEventId.value}/${template.value._id}`
      : `/studio/templates/${template.value._id}`;
    await router.replace(destination);
    // Save under the final route-derived project key. This matters for a
    // brand-new template, whose draft initially lives under `template:new`.
    try {
      await saveLocalDraft({ notify: false, dirty: false });
    } catch {
      // The cloud write already succeeded. A browser storage/quota problem
      // must not misreport the entire save as failed.
      toast.error('Saved to cloud, but this browser could not refresh its offline draft.');
    }
    autosaveStatus.value = 'cloud';
    toast.success('Saved to cloud');
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    saving.value = false;
  }
}

const exportMenuOpen = ref(false);
const exporting = ref(false);
const psdInputRef = ref(null);

async function onPsdFileChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !fabricCanvasRaw) return;
  if (document.value?.layers?.length && !(await askConfirm('Replace the current canvas with this PSD? Your existing local draft will be replaced.'))) return;

  loading.value = true;
  readyForAutosave = false;
  clearTimeout(autosaveTimer);
  history?.detach();
  try {
    teardownActiveTool();
    if (maskPainter.value) cancelMaskPaint();
    if (cropSession.value) cancelCrop();
    const imported = await importPsdLocally(file, localProjectId.value);
    const opened = imported.document;
    name.value = file.name.replace(/\.psd$/i, '') || 'Untitled template';
    pages.value = [{ name: 'Page 1', document: opened }];
    activePage.value = 0;
    document.value = opened;
    canvasBackground.value = opened.background || '#FFFFFF';
    const { failures } = await loadDocument(fabricCanvasRaw, opened, { resolveAssetUrl });
    await refreshMissingFonts(opened);
    selectedObjects.value = [];
    selectedParent.value = null;
    fitZoomToViewport();
    applyZoom();
    refreshLayersList();
    resetHistory();
    readyForAutosave = true;
    await saveLocalDraft({ notify: false, dirty: true });
    const issueCount = imported.warnings.length + (failures?.length || 0);
    if (issueCount) toast.error(`PSD opened locally with ${issueCount} compatibility warning${issueCount === 1 ? '' : 's'}. Advanced Photoshop effects may need the online importer.`);
    else toast.success('PSD opened locally. Your edits are saved on this device until you publish them.');
  } catch (err) {
    toast.error(`Could not open this PSD: ${apiErrorMessage(err)}`);
  } finally {
    readyForAutosave = true;
    loading.value = false;
  }
}

// Client-side raster export straight off the live Fabric canvas — separate
// from the server-rendered guest-card exports (cardVariants.service.js),
// which only exist once a template is attached to an event's guest list.
// This lets a designer grab a flat preview of the template itself, in
// whichever font weights are currently loaded in the browser, without
// having to publish it first.
async function exportImage(format) {
  if (!fabricCanvasRaw || exporting.value) return;
  exporting.value = true;
  exportMenuOpen.value = false;
  try {
    fabricCanvasRaw.discardActiveObject();
    fabricCanvasRaw.requestRenderAll();
    const dataUrl = fabricCanvasRaw.toDataURL({
      format: format === 'jpeg' ? 'jpeg' : 'png',
      quality: 0.92,
      multiplier: 1 / (fabricCanvasRaw.getZoom() || 1),
    });
    const link = window.document.createElement('a');
    link.href = dataUrl;
    link.download = `${(name.value || 'template').trim() || 'template'}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    toast.error('Export failed. Please try again.');
  } finally {
    exporting.value = false;
  }
}

async function exportPsd() {
  if (!fabricCanvasRaw || exporting.value) return;
  exporting.value = true;
  exportMenuOpen.value = false;
  try {
    fabricCanvasRaw.discardActiveObject();
    fabricCanvasRaw.requestRenderAll();
    const buffer = await exportCanvasAsPsd(fabricCanvasRaw, {
      width: document.value.width,
      height: document.value.height,
    });
    const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${(name.value || 'template').trim() || 'template'}.psd`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    toast.error('PSD export failed. Try PNG if the document is too large for this device.');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  window.addEventListener('online', onNetworkOnline);
  window.addEventListener('offline', onNetworkOffline);
  boot();
});
onBeforeUnmount(() => {
  clearTimeout(autosaveTimer);
  history?.detach();
  penTool?.stop();
  fabricCanvasRaw?.dispose();
  window.removeEventListener('mousemove', onPanMove);
  window.removeEventListener('mouseup', onPanEnd);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('click', onWindowClickCloseShapesMenu);
  window.removeEventListener('resize', onViewportScroll);
  window.removeEventListener('online', onNetworkOnline);
  window.removeEventListener('offline', onNetworkOffline);
  viewportRef.value?.removeEventListener('scroll', onViewportScroll);
});
</script>

<style>
/* Fabric replaces the <canvas ref="canvasElRef"> with its own
   lower-canvas/upper-canvas pair at init time, so an inline `style` on the
   original element doesn't reliably survive onto the interactive
   upper-canvas Fabric actually generates — target its own class instead.
   Without this, a touch press-drag (drawing a text box or shape, painting
   a brush stroke) can get eaten by the browser as a page-scroll gesture
   before Fabric's pointer handlers ever see the move. */
.upper-canvas { touch-action: none; }
</style>
