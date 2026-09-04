// Batch 2 — the Fabric.js rendering engine core. Reads/writes the
// canonical template-document schema (see amoevents-backend's
// docs/template-document-schema.md) as Fabric.js objects. This is the ONE
// place that schema-to-Fabric mapping lives — every later batch (masks,
// blend modes, layer styles, filters...) extends `layerToFabric` /
// `fabricToLayer` rather than duplicating the mapping elsewhere, which is
// what keeps the editor and the eventual server-side renderer able to
// share the exact same document shape.
import * as fabric from 'fabric';

const BLEND_MODE_TO_COMPOSITE = {
  normal: 'source-over', multiply: 'multiply', screen: 'screen',
  overlay: 'overlay', darken: 'darken', lighten: 'lighten',
  'color-dodge': 'color-dodge', 'color-burn': 'color-burn',
  'hard-light': 'hard-light', 'soft-light': 'soft-light',
  difference: 'difference', exclusion: 'exclusion',
  hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity',
};

// Fabric's own findTarget() has a built-in bypass that lets a click stay on
// the currently-active object instead of re-resolving through the full
// canvas (which is exactly what you want while editing text nested inside
// a group — a drag inside the text should extend the selection, not grab
// the group). But that bypass is gated on `!preserveObjectStacking` (or
// the Alt key), and preserveObjectStacking is deliberately ON here so
// clicking a layer never jumps its z-order. The result: every mousedown
// while editing a nested text layer re-resolves through the OUTER GROUP
// (subTargetCheck can't rescue this — Fabric's own bypass runs first and
// loses), Fabric reassigns the active object to that group mid-edit, and
// what should have been a text-selection drag becomes a layer-move drag
// instead. Patching findTarget to keep hit-testing on the actively-editing
// object — but ONLY while it's genuinely being edited, and ONLY within its
// own bounds — fixes the drag without touching preserveObjectStacking's
// real job everywhere else.
function patchTextEditingHitTest(canvas) {
  const original = canvas.findTarget.bind(canvas);
  canvas.findTarget = function findTargetKeepEditingTextOnTop(e) {
    const active = this._activeObject;
    if (active?.isEditing) {
      const pointer = this.getScenePoint(e);
      if (this._pointIsInObjectSelectionArea(active, pointer)) {
        return { target: active, subTargets: [] };
      }
    }
    return original(e);
  };
}

/** Creates a Fabric canvas bound to a <canvas> element, sized to the document. */
export function createEngineCanvas(canvasEl, { width, height, background }) {
  const canvas = new fabric.Canvas(canvasEl, {
    width, height,
    backgroundColor: background || '#FFFFFF',
    preserveObjectStacking: true, // z-order stays as authored — clicking a layer shouldn't jump it to front
    selection: true,
    // Fabric's own default is backwards from every design-tool convention
    // (Photoshop/Figma/Illustrator): out of the box, uniformScaling=true
    // means corner-drag is ALREADY proportional and Shift actually breaks
    // it. Flip it so free-drag is the default and Shift constrains to
    // proportional, matching what every user expects.
    uniformScaling: false,
    // Every object's own `hoverCursor` defaults to null in Fabric v6 (it's
    // baked into Object.ownDefaults, not the prototype, so patching
    // fabric.Object.prototype has no effect) — Fabric then falls back to
    // THIS canvas-level value. Left at Fabric's own default ('move') it
    // shows a 4-way drag icon just from hovering, before any drag starts,
    // which reads as "stuck" rather than "clickable". A plain pointer here
    // matches every other design tool; the real move cursor still appears
    // once a drag actually begins.
    hoverCursor: 'pointer',
  });
  patchTextEditingHitTest(canvas);
  return canvas;
}

// Per-character overrides (highlight some text, pick a different font/
// size/color for just that range) live in Fabric's own sparse `styles`
// map, addressed via setSelectionStyles(props, start, end)/getSelectionStyles
// — this pair is the schema-side round-trip for that data. Without it,
// every such override rendered correctly live in the editor but was
// silently dropped on save (fabricToLayer used to hardcode `charStyles: []`
// unconditionally), so a highlighted-text font change would "work," then
// vanish the moment the document was saved and reloaded — including in the
// server-rendered thumbnail, which reads from the very same saved document.
const CHAR_STYLE_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fill'];

function charStylesEqual(a, b) {
  return CHAR_STYLE_KEYS.every((k) => a[k] === b[k]);
}

/** Reads Fabric's per-character style overrides into compressed runs: [{start, end, ...props}]. */
function extractCharStyles(obj) {
  const len = (obj.text || '').length;
  if (!len || typeof obj.getSelectionStyles !== 'function') return [];
  const runs = [];
  let runStart = 0;
  let prev = obj.getSelectionStyles(0, 1)[0] || {};
  for (let i = 1; i <= len; i++) {
    const cur = i < len ? (obj.getSelectionStyles(i, i + 1)[0] || {}) : null;
    if (i === len || !charStylesEqual(prev, cur)) {
      if (Object.keys(prev).length) runs.push({ start: runStart, end: i, ...prev });
      runStart = i;
      prev = cur || {};
    }
  }
  return runs;
}

/** Re-applies saved per-character runs onto a freshly-created Textbox. */
function applyCharStyles(textbox, charStyles) {
  if (!charStyles?.length || typeof textbox.setSelectionStyles !== 'function') return;
  for (const run of charStyles) {
    const { start, end, ...props } = run;
    if (typeof start !== 'number' || typeof end !== 'number' || end <= start) continue;
    textbox.setSelectionStyles(props, start, end);
  }
}

function applyCommon(fabricObj, layer, { skipPosition } = {}) {
  fabricObj.set({
    ...(skipPosition ? {} : { left: layer.x, top: layer.y }),
    // Fabric v6's default originX/originY is 'center', but every PSD
    // coordinate (and our own schema — see docs/template-document-schema.md)
    // is TOP-LEFT. Without this, every layer renders shifted by (half its
    // width, half its height) — the "disorganized" pattern PSD imports
    // showed on canvas even though the layer positions were mathematically
    // correct on paper. This is the entire reason nested-group flowers,
    // absolute-positioned text, and shapes all looked misaligned.
    originX: 'left',
    originY: 'top',
    angle: layer.rotation || 0,
    opacity: layer.opacity ?? 1,
    visible: layer.visible !== false,
    selectable: !layer.locked,
    evented: !layer.locked,
    globalCompositeOperation: BLEND_MODE_TO_COMPOSITE[layer.blendMode] || 'source-over',
  });
  fabricObj.set('data', { layerId: layer.id, binding: layer.binding || null, locked: !!layer.locked, name: layer.name });
}

async function layerToFabric(layer, { resolveAssetUrl }) {
  if (layer.type === 'group') {
    // Real Fabric.Group for PSD nested folders. Every child was imported
    // with ABSOLUTE canvas coordinates; Fabric's LayoutManager on
    // INITIALIZATION shifts each by `-bboxCenter` (traced through
    // fabric/dist/index.js's commitLayout/layoutObject) so children end
    // up in a plane where the group center is (0,0). Group.left/top
    // (with originX='left'/'top') then equal the bbox's top-left. The
    // math composes correctly across nesting levels ONLY when we don't
    // pass options.left/top to the constructor — passing them overrides
    // the LayoutManager's calculated center and desyncs the offset from
    // the children's shift. Previously the code passed both, which is
    // why nested groups miscomposed. Recursive children may already be
    // fabric.Groups themselves; that's fine, LayoutManager treats them
    // like any other object with a bounding box.
    const children = (await Promise.all(layer.children.map((c) => layerToFabric(c, { resolveAssetUrl }))))
      .flatMap((c) => Array.isArray(c) ? c : [c])
      .filter(Boolean);
    if (!children.length) return null;
    const group = new fabric.Group(children, {
      originX: 'left', originY: 'top',
      opacity: layer.opacity ?? 1,
      visible: layer.visible !== false,
      angle: layer.rotation || 0,
      // Lets findTarget() report which child was actually under the
      // cursor (via the mouse event's `subTargets`) without changing what
      // gets selected by default — that's still the whole group, exactly
      // like before. TemplateStudioView's onCanvasMouseDown reads
      // subTargets to drill straight to the clicked leaf layer instead.
      subTargetCheck: true,
    });
    group.set('data', { layerId: layer.id, binding: null, locked: !!layer.locked, name: layer.name });
    return group;
  }

  if (layer.type === 'text') {
    const textbox = new fabric.Textbox(layer.text || '', {
      width: layer.width,
      fontFamily: layer.fontFamily || 'Arial',
      fontSize: layer.fontSize || 24,
      fontWeight: layer.fontWeight || 400,
      fontStyle: layer.fontStyle || 'normal',
      fill: layer.fill || '#000000',
      textAlign: layer.align || 'left',
      lineHeight: layer.lineHeight || 1.16,
      charSpacing: (layer.letterSpacing || 0) * 10, // Fabric's charSpacing is in 1/1000 em units
    });
    applyCommon(textbox, layer);
    applyCharStyles(textbox, layer.charStyles);
    return textbox;
  }

  if (layer.type === 'image') {
    if (!layer.assetId) return null;
    const url = await resolveAssetUrl(layer.assetId);
    if (!url) return null;
    const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
    img.set({
      scaleX: layer.width / img.width,
      scaleY: layer.height / img.height,
    });
    applyCommon(img, layer);
    // CRITICAL: applyCommon's data object doesn't include assetId — it was
    // only ever used above to resolve the load URL, never written back
    // onto the object. That meant fabricToLayer() (used by every save)
    // always found data.assetId undefined and wrote the layer back with
    // assetId: null — silently detaching EVERY image layer from its real
    // asset the moment the document was saved even once, regardless of
    // whether that layer was touched. On the next load, loadDocument's
    // `if (!layer.assetId) return null` then dropped it entirely. This is
    // almost certainly the actual cause behind most of the "content
    // disappeared after I edited something else" reports.
    img.set('data', { ...img.get('data'), assetId: layer.assetId });
    return img;
  }

  if (layer.type === 'rect') {
    const rect = new fabric.Rect({
      width: layer.width, height: layer.height,
      rx: layer.rx || 0, ry: layer.ry || 0,
      fill: layer.fill || 'transparent',
      stroke: layer.stroke || null,
      strokeWidth: layer.strokeWidth || 0,
      strokeDashArray: layer.strokeDashArray || null,
    });
    applyCommon(rect, layer);
    return rect;
  }

  if (layer.type === 'ellipse') {
    const ellipse = new fabric.Ellipse({
      rx: layer.width / 2, ry: layer.height / 2,
      fill: layer.fill || 'transparent',
      stroke: layer.stroke || null,
      strokeWidth: layer.strokeWidth || 0,
    });
    applyCommon(ellipse, layer);
    return ellipse;
  }

  if (layer.type === 'path') {
    const path = new fabric.Path(layer.pathData || 'M 0 0', {
      fill: layer.fill || 'transparent',
      stroke: layer.stroke || null,
      strokeWidth: layer.strokeWidth || 0,
    });
    applyCommon(path, layer);
    return path;
  }

  if (layer.type === 'qr') {
    // A real rendered QR code (Batch 22, via qrLayerRenderer.js) —
    // sample text only. The real per-guest signed payload is generated
    // server-side at export (Batch 28), never in the editor.
    const { renderQrImage } = await import('./qrLayerRenderer');
    const qrImg = await renderQrImage({ fg: layer.fg || '#000000', bg: layer.bg || '#FFFFFF' });
    qrImg.set({ scaleX: layer.width / qrImg.width, scaleY: layer.height / qrImg.height });
    applyCommon(qrImg, layer);
    qrImg.set('data', { ...qrImg.get('data'), isQr: true, fg: layer.fg, bg: layer.bg });
    return qrImg;
  }

  return null;
}

/**
 * Loads a template document into a live Fabric canvas. One bad layer (a
 * missing/404 asset, a transient network error) must not take down the
 * whole document — previously a single failed layerToFabric() call threw
 * and aborted the entire for-loop, so the canvas ended up with ZERO layers
 * even when the other 10 were perfectly fine, and looked identical to
 * "this template is empty." Each layer now fails in isolation.
 */
export async function loadDocument(canvas, document, { resolveAssetUrl }) {
  canvas.clear();
  canvas.setDimensions({ width: document.width, height: document.height });
  canvas.backgroundColor = document.background || '#FFFFFF';
  const failures = [];
  for (const layer of document.layers || []) {
    try {
      const obj = await layerToFabric(layer, { resolveAssetUrl });
      // Top-level 'group' layers now return a flat array (see
      // layerToFabric's comment) rather than a single fabric.Group.
      if (Array.isArray(obj)) canvas.add(...obj);
      else if (obj) canvas.add(obj);
    } catch (err) {
      failures.push({ layer, err });
      console.error(`Layer "${layer.name || layer.id}" failed to load, skipping:`, err);
    }
  }
  canvas.renderAll();
  return { failures };
}

function fabricToLayer(obj) {
  const data = obj.get('data') || {};
  const base = {
    id: data.layerId || `layer_${Math.random().toString(36).slice(2, 10)}`,
    name: data.name || obj.type,
    x: Math.round(obj.left),
    y: Math.round(obj.top),
    width: Math.round(obj.getScaledWidth()),
    height: Math.round(obj.getScaledHeight()),
    rotation: obj.angle || 0,
    opacity: obj.opacity ?? 1,
    visible: obj.visible !== false,
    locked: !!data.locked,
    blendMode: Object.keys(BLEND_MODE_TO_COMPOSITE).find((k) => BLEND_MODE_TO_COMPOSITE[k] === obj.globalCompositeOperation) || 'normal',
    binding: data.binding || null,
    effects: [], // populated once batch 14 (layer styles) lands
  };

  if (obj.type === 'textbox') {
    return {
      ...base, type: 'text', text: obj.text,
      fontFamily: obj.fontFamily, fontSize: obj.fontSize, fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle, fill: obj.fill, align: obj.textAlign,
      lineHeight: obj.lineHeight, letterSpacing: (obj.charSpacing || 0) / 10, charStyles: extractCharStyles(obj),
    };
  }
  if (obj.type === 'image') {
    const imgData = obj.get('data') || {};
    if (imgData.isQr) {
      return { ...base, type: 'qr', bindingSource: 'guest_qr_payload', fg: imgData.fg || '#000000', bg: imgData.bg || '#FFFFFF', errorCorrection: 'M' };
    }
    return { ...base, type: 'image', assetId: imgData.assetId || null, fit: 'cover', cropRect: { x: 0, y: 0, w: 1, h: 1 }, mask: null };
  }
  if (obj.type === 'rect') {
    return { ...base, type: 'rect', fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth, strokeDashArray: obj.strokeDashArray, rx: obj.rx, ry: obj.ry };
  }
  if (obj.type === 'ellipse') {
    return { ...base, type: 'ellipse', fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth };
  }
  if (obj.type === 'path') {
    return { ...base, type: 'path', fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth, pathData: obj.path?.map((p) => p.join(' ')).join(' ') };
  }
  if (obj.type === 'group') {
    // Children inside a Fabric group have positions RELATIVE to the
    // group's center (see layerToFabric's group comment — LayoutManager
    // shifts them by -bboxCenter on construction). Saving those relative
    // positions verbatim would put them at the wrong absolute location on
    // next load, since we reconstruct the group fresh from absolute coords.
    // getBoundingRect returns an axis-aligned box in ABSOLUTE canvas
    // coordinates including all ancestor group transforms; use its
    // left/top as the child's true canvas origin.
    return {
      ...base,
      type: 'group',
      children: obj.getObjects().map((child) => {
        const childLayer = fabricToLayer(child);
        if (!childLayer) return null;
        try {
          const bbox = child.getBoundingRect();
          childLayer.x = Math.round(bbox.left);
          childLayer.y = Math.round(bbox.top);
        } catch { /* leave as-is on any bbox failure — better a slightly-off position than a dropped layer */ }
        return childLayer;
      }).filter(Boolean),
    };
  }
  return null;
}

/** Serializes the live canvas back into a template document. */
// Walks the just-serialized layer tree (including group children and
// per-character overrides) to find every font actually in use — replaces
// blindly carrying forward whatever fontFamilies happened to exist at
// import time, which never updated as fonts were added/changed and so
// under-reported what a reopened document needed preloaded.
function collectFontFamilies(layers, out = new Set()) {
  for (const l of layers || []) {
    if (l.type === 'text' && l.fontFamily) out.add(l.fontFamily);
    for (const run of l.charStyles || []) {
      if (run.fontFamily) out.add(run.fontFamily);
    }
    if (l.children) collectFontFamilies(l.children, out);
  }
  return out;
}

export function serializeDocument(canvas, { previousDocument }) {
  // IMPORTANT: width/height here MUST be the document's own logical design
  // resolution, never canvas.width/canvas.height — those are the Fabric
  // <canvas> element's current on-screen PIXEL size, which changes with
  // every zoom level via applyZoom()'s setDimensions() call. Reading them
  // here previously baked the current zoom into the saved document on
  // every autosave — each cycle shrunk (or otherwise corrupted) the
  // document further, since Fabric renders shapes using the ORIGINAL
  // (now-mismatched) coordinates against the new, wrong canvas size. That
  // compounding corruption is why previously-edited templates opened to a
  // blank canvas — their layers were still positioned for the true design
  // resolution but the canvas had shrunk to a fraction of it.
  const layers = canvas.getObjects().map(fabricToLayer).filter(Boolean);
  return {
    version: (previousDocument?.version || 1) + 1,
    width: previousDocument?.width ?? canvas.width,
    height: previousDocument?.height ?? canvas.height,
    background: canvas.backgroundColor || '#FFFFFF',
    fontFamilies: [...collectFontFamilies(layers)],
    layers,
  };
}

export { BLEND_MODE_TO_COMPOSITE };

// ── Batch 7 — align & distribute ───────────────────────────────────────
// Aligns each of `objects` against `bounds` ({left, top, width, height}) —
// pass the canvas's own dimensions to align to the page, or a computed
// bounding box of the current multi-selection to align objects to each
// other. Every mode is a pure `set()`, so it composes with history
// (batch 8) for free — each call is one undoable step.
export function alignObjects(objects, bounds, mode) {
  for (const obj of objects) {
    const w = obj.getScaledWidth();
    const h = obj.getScaledHeight();
    switch (mode) {
      case 'left': obj.set('left', bounds.left); break;
      case 'center-h': obj.set('left', bounds.left + (bounds.width - w) / 2); break;
      case 'right': obj.set('left', bounds.left + bounds.width - w); break;
      case 'top': obj.set('top', bounds.top); break;
      case 'middle-v': obj.set('top', bounds.top + (bounds.height - h) / 2); break;
      case 'bottom': obj.set('top', bounds.top + bounds.height - h); break;
    }
    obj.setCoords();
  }
}

/** Evenly spaces 3+ objects along an axis, keeping the outermost two fixed. */
export function distributeObjects(objects, axis) {
  if (objects.length < 3) return;
  const sorted = [...objects].sort((a, b) => (axis === 'horizontal' ? a.left - b.left : a.top - b.top));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = axis === 'horizontal'
    ? (last.left - (first.left + first.getScaledWidth()))
    : (last.top - (first.top + first.getScaledHeight()));
  const totalMiddleSize = sorted.slice(1, -1).reduce((sum, o) => sum + (axis === 'horizontal' ? o.getScaledWidth() : o.getScaledHeight()), 0);
  const gap = (span - totalMiddleSize) / (sorted.length - 1);

  let cursor = axis === 'horizontal' ? first.left + first.getScaledWidth() + gap : first.top + first.getScaledHeight() + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const obj = sorted[i];
    obj.set(axis === 'horizontal' ? 'left' : 'top', cursor);
    obj.setCoords();
    cursor += (axis === 'horizontal' ? obj.getScaledWidth() : obj.getScaledHeight()) + gap;
  }
}

// ── Batch 6 — layer-order & lock/visibility helpers ────────────────────
// Thin wrappers around Fabric's own stacking API, named to match the
// layers-panel actions rather than Fabric's internal vocabulary, and
// paired with setCoords()/requestRenderAll() so callers don't have to
// remember to do it themselves.
// Photoshop's "Rasterize Layer" — flattens any object (shape, text, group)
// into a plain pixel image at its current appearance, in place, same
// z-order. Necessary before the eraser can touch it: a Rect or Textbox has
// no pixels to punch holes in, only an image layer's backing <canvas> does
// (see retouchTools.js's eraseAt / ensureLiveCanvas).
export async function rasterizeObject(canvas, obj) {
  const angle = obj.angle || 0;
  const left = obj.left;
  const top = obj.top;
  const opacity = obj.opacity ?? 1;
  const visible = obj.visible !== false;
  const data = obj.get('data') || {};

  // Rasterize un-rotated so the resulting PNG is a plain axis-aligned
  // rectangle — the angle is re-applied to the new image object after,
  // which looks identical since rotating a bitmap after the fact is
  // visually the same as rendering it pre-rotated.
  obj.set('angle', 0);
  obj.setCoords();
  const dataUrl = obj.toDataURL({ format: 'png' });
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  obj.set('angle', angle); // restore in case rasterize is ever cancelled before the swap below

  const img = await fabric.FabricImage.fromURL(dataUrl);
  img.set({
    left, top, angle, opacity, visible,
    originX: 'left', originY: 'top',
    scaleX: w / img.width, scaleY: h / img.height,
  });
  img.set('data', { ...data, name: data.name ? `${data.name} (rasterized)` : 'Rasterized layer' });

  const index = canvas.getObjects().indexOf(obj);
  canvas.remove(obj);
  canvas.insertAt(index, img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return img;
}

export function bringForward(canvas, obj) { canvas.bringObjectForward(obj); canvas.requestRenderAll(); }
export function sendBackward(canvas, obj) { canvas.sendObjectBackwards(obj); canvas.requestRenderAll(); }
export function bringToFront(canvas, obj) { canvas.bringObjectToFront(obj); canvas.requestRenderAll(); }
export function sendToBack(canvas, obj) { canvas.sendObjectToBack(obj); canvas.requestRenderAll(); }

export function setLayerLocked(obj, locked) {
  obj.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked });
  obj.set('data', { ...(obj.get('data') || {}), locked });
}

export function setLayerVisible(canvas, obj, visible) {
  obj.set('visible', visible);
  canvas.requestRenderAll();
}

// ── Batch 14 — layer styles (drop shadow) ──────────────────────────────
// Fabric objects carry exactly ONE native `shadow` property — real
// multi-effect stacking (a drop shadow AND a glow on the same layer
// simultaneously) needs custom compositing (rendering N tinted duplicates
// behind the object) that isn't built yet. Documented limitation, not a
// silent gap: this batch delivers a fully working single drop-shadow
// effect per layer, which covers the large majority of card-design needs
// (text shadows, card-edge shadows) on its own.
export function setDropShadow(canvas, obj, { color = '#000000', blur = 10, offsetX = 4, offsetY = 4, opacity = 0.6 } = {}) {
  const rgba = hexToRgba(color, opacity);
  obj.set('shadow', new fabric.Shadow({ color: rgba, blur, offsetX, offsetY }));
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: obj });
}
export function clearDropShadow(canvas, obj) {
  obj.set('shadow', null);
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: obj });
}
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Batch 15 — non-destructive adjustment filters (image layers) ──────
// Fabric ships a solid native filter set already — this wraps the four
// most commonly needed adjustments (brightness/contrast/saturation/hue)
// behind one function that rebuilds the object's whole filter stack from
// a plain values object every call, so the UI can just bind sliders
// directly without hand-managing filter array indices itself. Re-calling
// with updated values replaces rather than stacks — genuinely
// non-destructive since the original image pixels are never touched,
// only re-filtered from source on each call.
export function applyAdjustments(obj, { brightness = 0, contrast = 0, saturation = 0, hue = 0 } = {}) {
  if (obj.type !== 'image') return;
  const filters = [];
  if (brightness !== 0) filters.push(new fabric.filters.Brightness({ brightness }));
  if (contrast !== 0) filters.push(new fabric.filters.Contrast({ contrast }));
  if (saturation !== 0) filters.push(new fabric.filters.Saturation({ saturation }));
  if (hue !== 0) filters.push(new fabric.filters.HueRotation({ rotation: hue }));
  obj.filters = filters;
  obj.applyFilters();
  obj.set('data', { ...(obj.get('data') || {}), adjustments: { brightness, contrast, saturation, hue } });
}
