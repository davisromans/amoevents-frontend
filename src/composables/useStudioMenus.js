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

  function renameSelected() {
    const o = one();
    const name = window.prompt('Layer name', o.get('data')?.name || o.type);
    if (name != null && name.trim()) ctx.onRenameLayer(o, name.trim());
  }
  function deleteSelected() { [...sel()].forEach((o) => ctx.onDeleteLayer(o, parentOf(o))); }
  function cutSelected() {
    const targets = [...sel()];
    ctx.copySelectedLayers().then(() => targets.forEach((o) => ctx.onDeleteLayer(o, parentOf(o))));
  }
  function toggleShadow() {
    const o = one();
    if (o.shadow) clearDropShadow(c(), o); else setDropShadow(c(), o, {});
    commit(o);
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
        SOON('Import Brushes (.abr)…'),
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
        SOON('Fill…', '⇧F5'),
        { label: 'Stroke / Outline', hint: 'Edit stroke in the Properties panel', disabled: notOne, action: () => ctx.toast('Use Stroke in the Properties panel on the right.') },
        SOON('Content-Aware Fill…'),
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
          { label: 'Perspective / Warp…', disabled: notImage, action: () => { ctx.setTool('liquify'); ctx.toast('Use Liquify push for freeform raster warping, or Skew / Distort for editable transforms.'); } },
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
          SOON('Posterize…'), SOON('Threshold…'), SOON('Gradient Map…'), SOON('Replace Color…'),
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
        SOON('Trim…'), SOON('Reveal All'),
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
          SOON('Pattern…'),
        ] },
        SOON('New Adjustment Layer'),
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
          SOON('Inner Shadow…'), SOON('Gradient Overlay…'), SOON('Bevel & Emboss…'),
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
        SOON('Merge Visible', '⇧⌘E'), SOON('Flatten Image'),
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
        SOON('Warp Text…'), SOON('Convert to Shape'), SOON('Spell Check'),
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
        SOON('Color Range…'),
        { label: 'Subject', disabled: notImage, action: () => ctx.onSelectSubject(one()) },
        { label: 'Select and Mask…', disabled: notImage, action: () => ctx.onPaintMask(one()) },
        SOON('Modify'),
        SOON('Transform Selection'), SOON('Save Selection…'),
      ],
    },
    {
      label: 'Filter',
      items: [
        { heading: 'Image layer must be selected' },
        { label: 'Blur', items: [
          { label: 'Gaussian Blur…', disabled: notImage, action: () => adjust('Gaussian Blur', ADJ.blur) },
          SOON('Motion Blur…'), SOON('Radial Blur…'), SOON('Lens Blur…'),
        ] },
        { label: 'Sharpen', items: [
          { label: 'Sharpen', disabled: notImage, checked: hasFilter('sharpen'), action: () => toggleFilter('sharpen') },
          SOON('Unsharp Mask…'), SOON('Smart Sharpen…'),
        ] },
        { label: 'Noise', items: [
          { label: 'Add Noise…', disabled: notImage, action: () => adjust('Add Noise', ADJ.noise) },
          SOON('Reduce Noise…'), SOON('Dust & Scratches…'),
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
          SOON('Ripple…'), SOON('Pinch…'), SOON('Spherize…'),
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
          SOON('Gradient Tool'),
          { label: 'Eyedropper', shortcut: 'I', action: () => ctx.setTool('eyedropper') },
          { label: 'Healing Brush', shortcut: 'J', action: () => ctx.setTool('healing') },
          { label: 'Paint Bucket', shortcut: 'G', action: () => ctx.setTool('bucket') },
        ] },
        { label: 'History Panel', checked: () => ctx.rightPanelTab.value === 'history', action: () => { ctx.rightPanelTab.value = 'history'; } },
        { label: 'Swatches', checked: () => ctx.rightPanelTab.value === 'swatches', action: () => { ctx.rightPanelTab.value = 'swatches'; } },
        { label: 'Character / Paragraph', checked: () => ctx.rightPanelTab.value === 'properties', action: () => { ctx.rightPanelTab.value = 'properties'; } },
        SOON('Brushes Panel'), SOON('Actions'),
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
