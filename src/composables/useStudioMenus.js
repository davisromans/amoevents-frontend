import * as fabric from 'fabric';
import { alignObjects, distributeObjects, bringToFront, sendToBack, setDropShadow, clearDropShadow } from '@/utils/canvasEngine';
import { toggleGalleryFilter } from '@/utils/filtersGallery';

// Photoshop-style menu bar for the Template Studio. The Studio passes in its
// state and existing actions (ctx); everything is plain config consumed by
// StudioMenuBar.vue. Items marked `soon` are on the roadmap and render
// disabled so the menu already shows the full Photoshop surface.
export function useStudioMenus(ctx) {
  const c = () => ctx.canvas();
  const sel = () => ctx.selected.value || [];
  const one = () => sel()[0] || null;
  const none = () => sel().length === 0;
  const notOne = () => sel().length !== 1;
  const notImage = () => one()?.type !== 'image' || sel().length !== 1;
  const notText = () => !['textbox', 'text', 'i-text'].includes(one()?.type);
  const doc = () => ctx.document.value;
  const parentOf = (o) => ctx.findParentGroup(o, c().getObjects());

  function commit(target) {
    c().requestRenderAll();
    ctx.refreshLayersList();
    c().fire('object:modified', { target: target || one() });
  }

  // ── Edit > Transform ───────────────────────────────────────────────
  function flip(axis) {
    for (const o of sel()) o.set(axis === 'h' ? 'flipX' : 'flipY', !o[axis === 'h' ? 'flipX' : 'flipY']);
    commit();
  }
  function rotateLayers(deg) {
    for (const o of sel()) { o.rotate(((o.angle || 0) + deg + 360) % 360); o.setCoords(); }
    commit();
  }

  // ── Image > Adjustments / Filter (non-destructive, saved + server-rendered)
  function adjust(title, controls) { ctx.openAdjust(title, controls); }
  function toggleFilter(id, value = true) {
    const o = one();
    const on = (o.get('data')?.galleryFilters || {})[id] !== undefined;
    toggleGalleryFilter(o, id, on ? null : value);
    commit(o);
    ctx.toast(`${on ? 'Removed' : 'Applied'}: ${id}`);
  }
  const hasFilter = (id) => () => one()?.type === 'image' && (one().get('data')?.galleryFilters || {})[id] !== undefined;
  function clearAllFilters() {
    const o = one();
    o.set('data', { ...(o.get('data') || {}), adjustments: {}, galleryFilters: {} });
    o.filters = []; o.applyFilters();
    commit(o);
  }

  // ── Image > Canvas Size / Image Size / Rotate Canvas ──────────────
  function anchorOffset(anchor, dw, dh) {
    const hz = anchor.includes('l') ? 0 : anchor.includes('r') ? 1 : 0.5;
    const vt = anchor.startsWith('t') ? 0 : anchor.startsWith('b') ? 1 : 0.5;
    return { dx: dw * hz, dy: dh * vt };
  }
  function resizeCanvas({ width, height, anchor }) {
    const d = doc();
    const { dx, dy } = anchorOffset(anchor, width - d.width, height - d.height);
    for (const o of c().getObjects()) { o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy }); o.setCoords(); }
    d.width = width; d.height = height;
    ctx.applyZoom();
    commit();
  }
  function resizeImage({ width, height }) {
    const d = doc();
    const sx = width / d.width, sy = height / d.height;
    for (const o of c().getObjects()) {
      const p = o.getCenterPoint();
      o.set({ scaleX: (o.scaleX || 1) * sx, scaleY: (o.scaleY || 1) * sy });
      o.setPositionByOrigin(new fabric.Point(p.x * sx, p.y * sy), 'center', 'center');
      o.setCoords();
    }
    d.width = width; d.height = height;
    ctx.applyZoom();
    commit();
  }
  function rotateCanvas(deg) {
    const d = doc();
    const swap = Math.abs(deg) % 180 === 90;
    const nw = swap ? d.height : d.width, nh = swap ? d.width : d.height;
    const pivot = new fabric.Point(d.width / 2, d.height / 2);
    const rad = fabric.util.degreesToRadians(deg);
    for (const o of c().getObjects()) {
      const p = fabric.util.rotatePoint(o.getCenterPoint(), pivot, rad);
      o.rotate(((o.angle || 0) + deg + 360) % 360);
      o.setPositionByOrigin(new fabric.Point(p.x - pivot.x + nw / 2, p.y - pivot.y + nh / 2), 'center', 'center');
      o.setCoords();
    }
    d.width = nw; d.height = nh;
    ctx.applyZoom();
    commit();
  }
  function flipCanvas(axis) {
    const d = doc();
    for (const o of c().getObjects()) {
      const p = o.getCenterPoint();
      o.set(axis === 'h' ? 'flipX' : 'flipY', !o[axis === 'h' ? 'flipX' : 'flipY']);
      if (o.angle) o.rotate((360 - o.angle) % 360);
      o.setPositionByOrigin(new fabric.Point(axis === 'h' ? d.width - p.x : p.x, axis === 'v' ? d.height - p.y : p.y), 'center', 'center');
      o.setCoords();
    }
    commit();
  }
  function fitCanvasToObjects({ includeCanvas = false } = {}) {
    const objects = c().getObjects().filter((o) => o.visible !== false);
    if (!objects.length) return;
    const rects = objects.map((o) => o.getBoundingRect());
    const left = Math.floor(Math.min(includeCanvas ? 0 : Infinity, ...rects.map((r) => r.left)));
    const top = Math.floor(Math.min(includeCanvas ? 0 : Infinity, ...rects.map((r) => r.top)));
    const right = Math.ceil(Math.max(includeCanvas ? doc().width : -Infinity, ...rects.map((r) => r.left + r.width)));
    const bottom = Math.ceil(Math.max(includeCanvas ? doc().height : -Infinity, ...rects.map((r) => r.top + r.height)));
    for (const o of objects) { o.set({ left: (o.left || 0) - left, top: (o.top || 0) - top }); o.setCoords(); }
    doc().width = Math.max(1, right - left); doc().height = Math.max(1, bottom - top); ctx.applyZoom(); commit();
  }

  // ── Layer > Align / Distribute / Arrange ──────────────────────────
  function align(mode) {
    const objs = sel();
    if (!objs.length) return;
    // One layer aligns to the canvas, several align to their combined
    // bounds — the same rule Photoshop's Align follows.
    const bounds = objs.length === 1
      ? { left: 0, top: 0, width: doc().width, height: doc().height }
      : (() => {
        const l = Math.min(...objs.map((o) => o.left)), t = Math.min(...objs.map((o) => o.top));
        const r = Math.max(...objs.map((o) => o.left + o.getScaledWidth())), b = Math.max(...objs.map((o) => o.top + o.getScaledHeight()));
        return { left: l, top: t, width: r - l, height: b - t };
      })();
    alignObjects(objs, bounds, mode);
    commit();
  }
  function distribute(axis) { distributeObjects(sel(), axis); commit(); }
  function arrange(where) {
    const o = one();
    const coll = parentOf(o);
    if (coll) { where === 'front' ? coll.bringObjectToFront(o) : coll.sendObjectToBack(o); coll.dirty = true; } else if (where === 'front') bringToFront(c(), o); else sendToBack(c(), o);
    commit(o);
  }

  // ── Layer > New Fill Layer ─────────────────────────────────────────
  function newFillLayer(kind) {
    const d = doc();
    const id = `layer_${Math.random().toString(36).slice(2, 10)}`;
    const fill = kind === 'gradient'
      ? new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: d.width, y2: 0 }, colorStops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }] })
      : '#D9B45E';
    const rect = new fabric.Rect({ left: 0, top: 0, width: d.width, height: d.height, fill, originX: 'left', originY: 'top' });
    rect.set('data', { layerId: id, name: kind === 'gradient' ? 'Gradient Fill' : 'Color Fill' });
    c().add(rect);
    c().setActiveObject(rect);
    commit(rect);
  }
  function applyGradientOverlay() {
    const target = one(); if (!target || target.type === 'image' || target.type === 'group') { ctx.toast('Select a text or shape layer for a gradient overlay.'); return; }
    const first = window.prompt('Gradient start colour', '#8B5CF6') || '#8B5CF6';
    const second = window.prompt('Gradient end colour', '#D9B45E') || '#D9B45E';
    target.set('fill', new fabric.Gradient({ type: 'linear', gradientUnits: 'pixels', coords: { x1: 0, y1: 0, x2: Math.max(1, target.width || target.getScaledWidth()), y2: 0 }, colorStops: [{ offset: 0, color: first }, { offset: 1, color: second }] }));
    target.setCoords(); commit(target);
  }
  function newPatternLayer() {
    const tile = window.document.createElement('canvas'); tile.width = 64; tile.height = 64; const g = tile.getContext('2d');
    const a = window.prompt('Pattern first colour', '#F3F4F6') || '#F3F4F6', b = window.prompt('Pattern second colour', '#D1D5DB') || '#D1D5DB';
    g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
    const full = window.document.createElement('canvas'); full.width = doc().width; full.height = doc().height; const fg = full.getContext('2d'); fg.fillStyle = fg.createPattern(tile, 'repeat'); fg.fillRect(0, 0, full.width, full.height);
    const image = new fabric.FabricImage(full, { left: 0, top: 0, originX: 'left', originY: 'top' });
    image.set('data', { layerId: `layer_${Math.random().toString(36).slice(2, 10)}`, name: 'Pattern Fill', sourceWidth: full.width, sourceHeight: full.height });
    c().add(image); c().setActiveObject(image); commit(image);
  }
  function spellCheckText() {
    const target = one(); if (!target) return;
    c().setActiveObject(target); target.enterEditing?.();
    if (target.hiddenTextarea) { target.hiddenTextarea.spellcheck = true; target.hiddenTextarea.focus(); }
    ctx.toast('Browser spell-check is active. Misspelled words are underlined while you edit.');
  }

  // ── Select ─────────────────────────────────────────────────────────
  function selectObjects(objs) {
    c().discardActiveObject();
    if (objs.length === 1) c().setActiveObject(objs[0]);
    else if (objs.length > 1) c().setActiveObject(new fabric.ActiveSelection(objs, { canvas: c() }));
    c().requestRenderAll();
  }
  const selectable = () => c().getObjects().filter((o) => !o.get('data')?.locked && o.visible !== false);
  function selectAll() { selectObjects(selectable()); }
  function deselect() { selectObjects([]); }
  function selectInverse() { const cur = new Set(sel()); selectObjects(selectable().filter((o) => !cur.has(o))); }
  function selectSimilar() { const t = one()?.type; selectObjects(selectable().filter((o) => o.type === t)); }
  function selectColorRange() {
    const source = one(); if (!source) return;
    const color = source.fill || source.stroke;
    if (!color || typeof color !== 'string') { ctx.toast('Select a solid-colour text or shape layer first.'); return; }
    selectObjects(selectable().filter((o) => o.fill === color || o.stroke === color));
  }

  function renameSelected() {
    const o = one();
    const name = window.prompt('Layer name', o.get('data')?.name || o.type);
    if (name != null && name.trim()) ctx.onRenameLayer(o, name.trim());
  }
  function deleteSelected() { [...sel()].forEach((o) => ctx.onDeleteLayer(o, parentOf(o))); }
  function fillSelected() {
    const color = window.prompt('Fill colour (hex, rgb, or CSS colour)', one()?.fill || '#D9B45E');
    if (!color) return;
    for (const target of sel()) target.set('fill', color);
    commit();
  }
  function cutSelected() {
    const targets = [...sel()];
    ctx.copySelectedLayers().then(() => targets.forEach((o) => ctx.onDeleteLayer(o, parentOf(o))));
  }
  function toggleShadow() {
    const o = one();
    if (o.shadow) clearDropShadow(c(), o); else setDropShadow(c(), o, {});
    commit(o);
  }
  function warpText() {
    const target = one();
    if (!target || target.type === 'textbox') { ctx.toast('Warp Text currently requires a point-text layer. Convert box text to point text first.'); return; }
    const bend = Number(window.prompt('Arc bend from -100 to 100 (0 removes warp)', target.get('data')?.textWarp?.bend || 30));
    if (!Number.isFinite(bend)) return;
    const clamped = Math.max(-100, Math.min(100, bend)), width = Math.max(40, target.getScaledWidth?.() || target.width || 200);
    target.set('data', { ...(target.get('data') || {}), textWarp: clamped ? { style: 'arc', bend: clamped, width } : null });
    target.set({ path: clamped ? new fabric.Path(`M 0 ${Math.abs(clamped / 100) * width * 0.25} Q ${width / 2} ${clamped < 0 ? width * 0.5 : 0} ${width} ${Math.abs(clamped / 100) * width * 0.25}`, { visible: false }) : undefined, pathAlign: 'center', pathSide: clamped < 0 ? 'right' : 'left' });
    target.initDimensions?.(); target.setCoords(); commit(target);
  }
  function walkObjects(objects, out = []) {
    for (const object of objects || []) { out.push(object); if (object.type === 'group') walkObjects(object.getObjects(), out); }
    return out;
  }
  function saveSelection() {
    if (!sel().length) return;
    const name = window.prompt('Selection name', `Selection ${(doc().savedSelections || []).length + 1}`)?.trim();
    if (!name) return;
    const ids = sel().map((o) => o.get('data')?.layerId).filter(Boolean);
    doc().savedSelections = [...(doc().savedSelections || []).filter((entry) => entry.name !== name), { name, layerIds: ids }];
    ctx.toast(`Saved selection “${name}”.`); commit();
  }
  function loadSavedSelection(entry) {
    const wanted = new Set(entry.layerIds || []);
    selectObjects(walkObjects(c().getObjects()).filter((o) => wanted.has(o.get('data')?.layerId)));
  }

  const ADJ = {
    brightnessContrast: [
      { key: 'brightness', label: 'Brightness', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'contrast', label: 'Contrast', kind: 'adj', min: -1, max: 1, default: 0 },
    ],
    hueSaturation: [
      { key: 'hue', label: 'Hue', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'saturation', label: 'Saturation', kind: 'adj', min: -1, max: 1, default: 0 },
    ],
    vibrance: [{ key: 'vibrance', label: 'Vibrance', kind: 'gallery', min: -1, max: 1, default: 0 }],
    exposure: [{ key: 'gamma', label: 'Gamma (exposure)', kind: 'gallery', min: 0.2, max: 2.2, default: 1, neutral: 1 }],
    blur: [{ key: 'blur', label: 'Radius', kind: 'gallery', min: 0, max: 1, default: 0.1 }],
    noise: [{ key: 'noise', label: 'Amount', kind: 'gallery', min: 0, max: 400, step: 1, default: 60 }],
    pixelate: [{ key: 'pixelate', label: 'Cell size', kind: 'gallery', min: 1, max: 40, step: 1, default: 8, neutral: 1 }],
    twirl: [{ key: 'twirl', label: 'Angle', kind: 'gallery', min: -6, max: 6, default: 2 }],
    posterize: [{ key: 'posterize', label: 'Levels', kind: 'gallery', min: 2, max: 32, step: 1, default: 6 }],
    threshold: [{ key: 'threshold', label: 'Threshold', kind: 'gallery', min: 0, max: 255, step: 1, default: 128 }],
    ripple: [{ key: 'ripple', label: 'Amount', kind: 'gallery', min: -1, max: 1, default: 0.25 }],
    pinch: [{ key: 'pinch', label: 'Amount', kind: 'gallery', min: -1, max: 1, default: 0.35 }],
    spherize: [{ key: 'spherize', label: 'Amount', kind: 'gallery', min: -1, max: 1, default: 0.35 }],
    reduceNoise: [{ key: 'blur', label: 'Smoothing', kind: 'gallery', min: 0, max: 0.18, default: 0.035 }],
    levels: [
      { key: 'levelsBlack', label: 'Black point', kind: 'adj', min: 0, max: 254, step: 1, default: 0, neutral: 0 },
      { key: 'levelsGamma', label: 'Midtone gamma', kind: 'adj', min: 0.1, max: 3, step: 0.01, default: 1, neutral: 1 },
      { key: 'levelsWhite', label: 'White point', kind: 'adj', min: 1, max: 255, step: 1, default: 255, neutral: 255 },
    ],
    curves: [
      { key: 'curvesShadows', label: 'Shadows', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'curvesMidtones', label: 'Midtones', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'curvesHighlights', label: 'Highlights', kind: 'adj', min: -1, max: 1, default: 0 },
    ],
    colorBalance: [
      { key: 'balanceRed', label: 'Cyan / Red', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'balanceGreen', label: 'Magenta / Green', kind: 'adj', min: -1, max: 1, default: 0 },
      { key: 'balanceBlue', label: 'Yellow / Blue', kind: 'adj', min: -1, max: 1, default: 0 },
    ],
  };
  const SOON = (label, shortcut) => ({ label, shortcut, soon: true });
  const SEP = { separator: true };

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Open PSD…', shortcut: '⌘O', action: ctx.openPsd },
        { label: 'Open AmoEditor Project…', action: ctx.openProject },
        { label: 'Place Image…', action: ctx.placeImage },
        { label: 'Place from Library…', action: ctx.openSharedAssets },
        { label: 'Import Fonts…', action: ctx.importFonts },
        { label: 'Import Brushes (.abr)…', action: ctx.importBrushes },
        SEP,
        { label: 'New Page', action: ctx.addPage },
        { label: 'Duplicate Page', action: () => ctx.duplicatePage(ctx.activePage.value) },
        { label: 'Delete Page', disabled: () => ctx.pages.value.length < 2, action: () => ctx.removePage(ctx.activePage.value) },
        SEP,
        { label: 'Save Locally', shortcut: '⌘S', action: () => ctx.saveLocalDraft({ notify: true }) },
        { label: 'Save to Cloud', shortcut: '⇧⌘S', disabled: () => !ctx.isOnline.value, action: ctx.save },
        SEP,
        { label: 'Export', items: [
          { label: 'Export as PNG', action: () => ctx.exportImage('png') },
          { label: 'Export as JPEG', action: () => ctx.exportImage('jpeg') },
          { label: 'Export Layered PSD', action: ctx.exportPsd },
          { label: 'Export as PDF', action: ctx.exportPdf },
          { label: 'Export Layers to Files', action: ctx.exportLayers },
          { label: 'Export Portable AmoEditor Project', action: ctx.exportProject },
        ] },
        SEP,
        { label: 'Close Studio', action: ctx.closeStudio },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: '⌘Z', disabled: () => !ctx.canUndo.value, action: ctx.undo },
        { label: 'Redo', shortcut: '⇧⌘Z', disabled: () => !ctx.canRedo.value, action: ctx.redo },
        SEP,
        { label: 'Cut', shortcut: '⌘X', disabled: none, action: cutSelected },
        { label: 'Copy', shortcut: '⌘C', disabled: none, action: () => ctx.copySelectedLayers() },
        { label: 'Paste', shortcut: '⌘V', disabled: () => !ctx.hasClipboard(), action: () => ctx.pasteSelectedLayers() },
        { label: 'Duplicate', shortcut: '⌘J', disabled: notOne, action: () => ctx.onDuplicateLayer(one(), parentOf(one())) },
        { label: 'Delete', shortcut: '⌫', disabled: none, action: deleteSelected },
        SEP,
        { label: 'Fill…', shortcut: '⇧F5', disabled: none, action: fillSelected },
        { label: 'Stroke / Outline', hint: 'Edit stroke in the Properties panel', disabled: notOne, action: () => ctx.toast('Use Stroke in the Properties panel on the right.') },
        { label: 'Content-Aware Fill…', disabled: notImage, action: () => ctx.onContentAwareFill(one()) },
        SEP,
        { label: 'Free Transform', shortcut: '⌘T', disabled: none, action: () => { ctx.setTool('select'); ctx.toast('Drag the handles to scale/rotate. Shift keeps proportions.'); } },
        { label: 'Transform', items: [
          { label: 'Rotate 180°', disabled: none, action: () => rotateLayers(180) },
          { label: 'Rotate 90° Clockwise', disabled: none, action: () => rotateLayers(90) },
          { label: 'Rotate 90° Counter Clockwise', disabled: none, action: () => rotateLayers(-90) },
          SEP,
          { label: 'Flip Horizontal', disabled: none, action: () => flip('h') },
          { label: 'Flip Vertical', disabled: none, action: () => flip('v') },
          SEP,
          { label: 'Skew / Distort…', disabled: none, action: () => { ctx.rightPanelTab.value = 'properties'; ctx.toast('Use the horizontal and vertical distortion controls in Properties.'); } },
          { label: 'Perspective / Warp…', disabled: notImage, action: () => ctx.openPerspectiveWarp(one()) },
        ] },
        SEP,
        { label: 'Keyboard Shortcuts…', shortcut: '?', action: () => { ctx.showShortcuts.value = true; } },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Adjustments', items: [
          { heading: 'Image layer must be selected' },
          { label: 'Brightness/Contrast…', disabled: notImage, action: () => adjust('Brightness/Contrast', ADJ.brightnessContrast) },
          { label: 'Hue/Saturation…', shortcut: '⌘U', disabled: notImage, action: () => adjust('Hue/Saturation', ADJ.hueSaturation) },
          { label: 'Vibrance…', disabled: notImage, action: () => adjust('Vibrance', ADJ.vibrance) },
          { label: 'Exposure (Gamma)…', disabled: notImage, action: () => adjust('Exposure', ADJ.exposure) },
          { label: 'Levels…', shortcut: '⌘L', disabled: notImage, action: () => adjust('Levels', ADJ.levels) },
          { label: 'Curves…', shortcut: '⌘M', disabled: notImage, action: () => adjust('Curves', ADJ.curves) },
          { label: 'Color Balance…', shortcut: '⌘B', disabled: notImage, action: () => adjust('Color Balance', ADJ.colorBalance) },
          SEP,
          { label: 'Black & White', disabled: notImage, checked: hasFilter('blackWhite'), action: () => toggleFilter('blackWhite') },
          { label: 'Desaturate', shortcut: '⇧⌘U', disabled: notImage, checked: hasFilter('grayscale'), action: () => toggleFilter('grayscale') },
          { label: 'Invert', shortcut: '⌘I', disabled: notImage, checked: hasFilter('invert'), action: () => toggleFilter('invert') },
          { label: 'Sepia', disabled: notImage, checked: hasFilter('sepia'), action: () => toggleFilter('sepia') },
          { label: 'Posterize…', disabled: notImage, action: () => adjust('Posterize', ADJ.posterize) },
          { label: 'Threshold…', disabled: notImage, action: () => adjust('Threshold', ADJ.threshold) },
          SOON('Gradient Map…'), SOON('Replace Color…'),
          SEP,
          { label: 'Clear All Adjustments', disabled: notImage, action: clearAllFilters },
        ] },
        SEP,
        { label: 'Image Size…', shortcut: '⌥⌘I', action: () => ctx.openDocSize('image') },
        { label: 'Canvas Size…', shortcut: '⌥⌘C', action: () => ctx.openDocSize('canvas') },
        { label: 'Image Rotation', items: [
          { label: '180°', action: () => rotateCanvas(180) },
          { label: '90° Clockwise', action: () => rotateCanvas(90) },
          { label: '90° Counter Clockwise', action: () => rotateCanvas(-90) },
          SEP,
          { label: 'Flip Canvas Horizontal', action: () => flipCanvas('h') },
          { label: 'Flip Canvas Vertical', action: () => flipCanvas('v') },
        ] },
        SEP,
        { label: 'Crop Layer', disabled: notImage, action: () => ctx.onStartCrop(one()) },
        { label: 'Trim to Visible Layers', action: () => fitCanvasToObjects() },
        { label: 'Reveal All', action: () => fitCanvasToObjects({ includeCanvas: true }) },
        SEP,
        { label: 'Remove Background', hint: 'Select an image layer, then use Remove background in Properties', disabled: notImage, action: () => ctx.toast('Use “Remove background” in the Properties panel for the selected image.') },
        { label: 'Replace Image…', disabled: notImage, action: () => ctx.onReplaceSource(one()) },
      ],
    },
    {
      label: 'Layer',
      items: [
        { label: 'New', items: [
          { label: 'Layer', shortcut: '⇧⌘N', action: ctx.insertEmptyLayer },
          { label: 'Group', action: ctx.createEmptyGroup },
          { label: 'Text Layer', action: ctx.insertTextLayer },
        ] },
        { label: 'New Fill Layer', items: [
          { label: 'Solid Color…', action: () => newFillLayer('solid') },
          { label: 'Gradient…', action: () => newFillLayer('gradient') },
          { label: 'Pattern…', action: newPatternLayer },
        ] },
        { label: 'New Adjustment Layer', items: [
          { label: 'Brightness / Contrast', action: () => ctx.insertAdjustmentLayer('brightnessContrast') },
          { label: 'Hue / Saturation', action: () => ctx.insertAdjustmentLayer('hueSaturation') },
          { label: 'Levels', action: () => ctx.insertAdjustmentLayer('levels') },
          { label: 'Color Balance', action: () => ctx.insertAdjustmentLayer('colorBalance') },
        ] },
        { label: 'Shape', items: [
          { label: 'Rectangle', action: ctx.insertRectLayer },
          { label: 'Ellipse', action: ctx.insertEllipseLayer },
          { label: 'Line', action: ctx.insertLineLayer },
          { label: 'Polygon', action: ctx.insertPolygonLayer },
        ] },
        { label: 'QR Code', action: ctx.insertQrLayer },
        SEP,
        { label: 'Duplicate Layer', shortcut: '⌘J', disabled: notOne, action: () => ctx.onDuplicateLayer(one(), parentOf(one())) },
        { label: 'Delete Layer', disabled: none, action: deleteSelected },
        { label: 'Rename Layer…', disabled: notOne, action: renameSelected },
        { label: 'Convert to Smart Object', disabled: notOne, action: () => ctx.onMakeSmartObject(one()) },
        { label: 'Edit Smart Object Contents', disabled: () => !one()?.get('data')?.smartObjectSource, action: () => ctx.onEditSmartObject(one()) },
        SEP,
        { label: 'Layer Style', items: [
          { label: 'Drop Shadow', disabled: notOne, checked: () => !!one()?.shadow, action: toggleShadow },
          { label: 'Stroke…', disabled: notOne, action: () => { ctx.rightPanelTab.value = 'properties'; ctx.toast('Stroke controls opened in Properties.'); } },
          { label: 'Outer Glow…', disabled: notOne, action: () => { ctx.rightPanelTab.value = 'properties'; ctx.toast('Outer glow controls opened in Properties.'); } },
          { label: 'Color Overlay…', disabled: notOne, action: () => { ctx.rightPanelTab.value = 'properties'; ctx.toast('Color overlay opened in Properties.'); } },
          SOON('Inner Shadow…'),
          { label: 'Gradient Overlay…', disabled: notOne, action: applyGradientOverlay },
          SOON('Bevel & Emboss…'),
        ] },
        SEP,
        { label: 'Create Clipping Mask', shortcut: '⌥⌘G', disabled: () => sel().length < 2, action: () => ctx.onClipMask(sel()) },
        { label: 'Layer Mask', items: [
          { label: 'Paint Mask', disabled: notOne, action: () => ctx.onPaintMask(one()) },
          { label: 'Remove Mask', disabled: notOne, action: () => ctx.onRemoveMask(one()) },
        ] },
        SEP,
        { label: 'Group Layers', shortcut: '⌘G', disabled: none, action: () => ctx.onGroupLayers(sel()) },
        { label: 'Ungroup Layers', shortcut: '⇧⌘G', disabled: () => one()?.type !== 'group', action: () => ctx.onUngroupLayer(one()) },
        { label: 'Hide / Show Layers', shortcut: '⌘,', disabled: none, action: () => sel().forEach((o) => ctx.onToggleVisible(o)) },
        SEP,
        { label: 'Arrange', items: [
          { label: 'Bring to Front', shortcut: '⇧⌘]', disabled: notOne, action: () => arrange('front') },
          { label: 'Bring Forward', shortcut: '⌘]', disabled: notOne, action: () => ctx.onBringForward(one()) },
          { label: 'Send Backward', shortcut: '⌘[', disabled: notOne, action: () => ctx.onSendBackward(one()) },
          { label: 'Send to Back', shortcut: '⇧⌘[', disabled: notOne, action: () => arrange('back') },
        ] },
        { label: 'Align', items: [
          { heading: '1 layer: to canvas · 2+: to selection' },
          { label: 'Top Edges', disabled: none, action: () => align('top') },
          { label: 'Vertical Centers', disabled: none, action: () => align('middle-v') },
          { label: 'Bottom Edges', disabled: none, action: () => align('bottom') },
          { label: 'Left Edges', disabled: none, action: () => align('left') },
          { label: 'Horizontal Centers', disabled: none, action: () => align('center-h') },
          { label: 'Right Edges', disabled: none, action: () => align('right') },
        ] },
        { label: 'Distribute', items: [
          { label: 'Horizontally', disabled: () => sel().length < 3, action: () => distribute('horizontal') },
          { label: 'Vertically', disabled: () => sel().length < 3, action: () => distribute('vertical') },
        ] },
        SEP,
        { label: 'Lock / Unlock Layers', shortcut: '⌘/', disabled: none, action: () => sel().forEach((o) => ctx.onToggleLock(o)) },
        SEP,
        { label: 'Merge Layers', shortcut: '⌘E', disabled: () => sel().length < 2, action: () => ctx.onMergeLayers(sel()) },
        { label: 'Merge Visible', shortcut: '⇧⌘E', action: ctx.mergeVisibleLayers },
        { label: 'Flatten Image', action: ctx.flattenImage },
        { label: 'Rasterize', disabled: notOne, action: () => ctx.onRasterizeLayer(one()) },
      ],
    },
    {
      label: 'Type',
      items: [
        { label: 'Add Text', action: ctx.insertTextLayer },
        { label: 'Import Fonts…', action: ctx.importFonts },
        SEP,
        { label: 'Bigger', shortcut: '⇧⌘.', disabled: notText, action: () => ctx.adjustFontSize(one(), 2) },
        { label: 'Smaller', shortcut: '⇧⌘,', disabled: notText, action: () => ctx.adjustFontSize(one(), -2) },
        SEP,
        { label: 'Restore Editable Text', disabled: notOne, action: () => ctx.onRestoreText(one()) },
        { label: 'Rasterize Type Layer', disabled: notText, action: () => ctx.onRasterizeLayer(one()) },
        SEP,
        { label: 'Warp Text…', disabled: notText, action: warpText }, SOON('Convert to Shape'),
        { label: 'Spell Check', disabled: notText, action: spellCheckText },
      ],
    },
    {
      label: 'Select',
      items: [
        { label: 'All Layers', shortcut: '⌘A', action: selectAll },
        { label: 'Deselect', shortcut: '⌘D', disabled: none, action: deselect },
        { label: 'Inverse', shortcut: '⇧⌘I', action: selectInverse },
        { label: 'Similar Layers', disabled: notOne, action: selectSimilar },
        SEP,
        { label: 'Color Range…', disabled: notOne, action: selectColorRange },
        { label: 'Subject', disabled: notImage, action: () => ctx.onSelectSubject(one()) },
        { label: 'Select and Mask…', disabled: notImage, action: () => ctx.onPaintMask(one()) },
        { label: 'Modify', hint: 'Use Select and Mask to paint, soften, or remove the active image mask.', disabled: notImage, action: () => ctx.onPaintMask(one()) },
        { label: 'Transform Selection', disabled: none, action: () => { ctx.setTool('select'); ctx.toast('Transform handles are active for this selection.'); } },
        { label: 'Save Selection…', disabled: none, action: saveSelection },
        { label: 'Load Selection', items: () => (doc().savedSelections || []).map((entry) => ({ label: entry.name, action: () => loadSavedSelection(entry) })) },
      ],
    },
    {
      label: 'Filter',
      items: [
        { heading: 'Image layer must be selected' },
        { label: 'Blur', items: [
          { label: 'Gaussian Blur…', disabled: notImage, action: () => adjust('Gaussian Blur', ADJ.blur) },
          { label: 'Motion Blur', disabled: notImage, checked: hasFilter('motionBlur'), action: () => toggleFilter('motionBlur') },
          SOON('Radial Blur…'),
          { label: 'Lens Blur…', disabled: notImage, action: () => adjust('Lens Blur', [{ key: 'lensBlur', label: 'Radius', kind: 'gallery', min: 0, max: 1, default: 0.18 }]) },
        ] },
        { label: 'Sharpen', items: [
          { label: 'Sharpen', disabled: notImage, checked: hasFilter('sharpen'), action: () => toggleFilter('sharpen') },
          { label: 'Unsharp Mask', disabled: notImage, checked: hasFilter('unsharpMask'), action: () => toggleFilter('unsharpMask') },
          { label: 'Smart Sharpen', disabled: notImage, checked: hasFilter('smartSharpen'), action: () => toggleFilter('smartSharpen') },
        ] },
        { label: 'Noise', items: [
          { label: 'Add Noise…', disabled: notImage, action: () => adjust('Add Noise', ADJ.noise) },
          { label: 'Reduce Noise…', disabled: notImage, action: () => adjust('Reduce Noise', ADJ.reduceNoise) },
          { label: 'Dust & Scratches…', disabled: notImage, action: () => adjust('Dust & Scratches', [{ key: 'blur', label: 'Radius', kind: 'gallery', min: 0, max: 0.35, default: 0.08 }]) },
        ] },
        { label: 'Pixelate', items: [
          { label: 'Mosaic…', disabled: notImage, action: () => adjust('Mosaic', ADJ.pixelate) },
        ] },
        { label: 'Stylize', items: [
          { label: 'Emboss', disabled: notImage, checked: hasFilter('emboss'), action: () => toggleFilter('emboss') },
          { label: 'Find Edges', disabled: notImage, checked: hasFilter('findEdges'), action: () => toggleFilter('findEdges') },
          SOON('Oil Paint…'),
        ] },
        { label: 'Distort', items: [
          { label: 'Twirl…', disabled: notImage, action: () => adjust('Twirl', ADJ.twirl) },
          { label: 'Ripple…', disabled: notImage, action: () => adjust('Ripple', ADJ.ripple) },
          { label: 'Pinch…', disabled: notImage, action: () => adjust('Pinch', ADJ.pinch) },
          { label: 'Spherize…', disabled: notImage, action: () => adjust('Spherize', ADJ.spherize) },
          { label: 'Liquify…', disabled: notImage, action: () => ctx.setTool('liquify') },
        ] },
        { label: 'Photo Looks', items: [
          ...['vintage', 'kodachrome', 'technicolor', 'polaroid', 'brownie'].map((id) => ({
            label: id[0].toUpperCase() + id.slice(1), disabled: notImage, checked: hasFilter(id), action: () => toggleFilter(id),
          })),
        ] },
        SEP,
        { label: 'Clear All Filters', disabled: notImage, action: clearAllFilters },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: '⌘+', action: () => ctx.zoomBy(5) },
        { label: 'Zoom Out', shortcut: '⌘−', action: () => ctx.zoomBy(-5) },
        { label: 'Fit on Screen', shortcut: '⌘0', action: ctx.fitZoom },
        { label: '100%', shortcut: '⌘1', action: ctx.resetZoom },
        SEP,
        { label: 'Rulers', shortcut: '⌘R', checked: () => ctx.showRulers.value, action: () => { ctx.showRulers.value = !ctx.showRulers.value; } },
        { label: 'Grid', shortcut: "⌘'", checked: () => ctx.showGrid.value, action: () => { ctx.showGrid.value = !ctx.showGrid.value; } },
        { label: 'Snap to Grid', shortcut: '⇧⌘;', checked: () => ctx.snapToGrid.value, action: () => { ctx.snapToGrid.value = !ctx.snapToGrid.value; } },
        { label: 'Smart Guides', checked: () => ctx.smartGuides.value, action: () => { ctx.smartGuides.value = !ctx.smartGuides.value; } },
        SEP,
        { label: 'Preview with Sample Data', checked: () => ctx.previewMode.value, action: ctx.togglePreview },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Tools', items: [
          { label: 'Move', shortcut: 'V', action: () => ctx.setTool('select') },
          { label: 'Pen', shortcut: 'P', action: () => ctx.setTool('pen') },
          { label: 'Brush', shortcut: 'B', action: () => ctx.setTool('brush') },
          { label: 'Eraser', shortcut: 'E', action: () => ctx.setTool('eraser') },
          { label: 'Clone Stamp', shortcut: 'S', action: () => ctx.setTool('clone') },
          { label: 'Dodge / Burn', shortcut: 'O', action: () => ctx.setTool('dodge') },
          { label: 'Magic Wand', shortcut: 'W', action: () => ctx.setTool('magic-wand') },
          { label: 'Lasso', shortcut: 'L', action: () => ctx.setTool('lasso') },
          { label: 'Marquee', shortcut: 'M', action: () => { ctx.setTool('select'); ctx.toast('Drag on empty canvas to select every enclosed layer.'); } },
          { label: 'Gradient Tool', disabled: notOne, action: applyGradientOverlay },
          { label: 'Eyedropper', shortcut: 'I', action: () => ctx.setTool('eyedropper') },
          { label: 'Healing Brush', shortcut: 'J', action: () => ctx.setTool('healing') },
          { label: 'Paint Bucket', shortcut: 'G', action: () => ctx.setTool('bucket') },
        ] },
        { label: 'History Panel', checked: () => ctx.rightPanelTab.value === 'history', action: () => { ctx.rightPanelTab.value = 'history'; } },
        { label: 'Swatches', checked: () => ctx.rightPanelTab.value === 'swatches', action: () => { ctx.rightPanelTab.value = 'swatches'; } },
        { label: 'Character / Paragraph', checked: () => ctx.rightPanelTab.value === 'properties', action: () => { ctx.rightPanelTab.value = 'properties'; } },
        { label: 'Brushes Panel', action: () => ctx.openUtilityPanel('brushes') },
        { label: 'Actions', action: () => ctx.openUtilityPanel('actions') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', action: () => { ctx.showShortcuts.value = true; } },
      ],
    },
  ];

  return { menus, resizeCanvas, resizeImage };
}
