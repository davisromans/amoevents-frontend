import * as fabric from 'fabric';

// Batch 21 — photo crop/straighten/presets. Fabric's Image object has
// native cropX/cropY/width/height (a visible window into the source
// pixels, distinct from the object's own display width/height) — this
// wraps that in an interactive overlay rather than reimplementing
// cropping from scratch.

const ASPECT_PRESETS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export { ASPECT_PRESETS };

/**
 * Interactive crop session — shows a draggable/resizable rect over the
 * image (a plain Fabric Rect used purely as a UI handle, never part of the
 * document), constrained to an optional aspect ratio. `apply()` commits
 * the rect's bounds back onto the image's cropX/cropY/width/height and
 * removes the overlay.
 */
export class CropSession {
  constructor(canvas, target, { ratio = null } = {}) {
    this.canvas = canvas;
    this.target = target;
    this.ratio = ratio;

    const w = target.getScaledWidth();
    const h = target.getScaledHeight();
    const cropW = ratio && ratio > w / h ? w : ratio ? h * ratio : w;
    const cropH = ratio ? cropW / ratio : h;

    this.overlay = new fabric.Rect({
      left: target.left + (w - cropW) / 2,
      top: target.top + (h - cropH) / 2,
      width: cropW, height: cropH,
      fill: 'rgba(124,58,237,0.15)',
      stroke: '#7C3AED', strokeWidth: 2, strokeDashArray: [6, 4],
      lockRotation: true,
    });
    if (ratio) {
      this.overlay.on('scaling', () => {
        const cur = this.overlay;
        cur.set('scaleY', cur.scaleX); // keep the aspect locked while resizing
      });
    }
    target.set('selectable', false);
    canvas.add(this.overlay);
    canvas.setActiveObject(this.overlay);
    canvas.requestRenderAll();
  }

  setRatio(ratio) {
    this.ratio = ratio;
    if (!ratio) return;
    const w = this.overlay.getScaledWidth();
    this.overlay.set({ height: w / ratio, scaleY: this.overlay.scaleX });
    this.canvas.requestRenderAll();
  }

  apply() {
    const t = this.target;
    const o = this.overlay;
    // Overlay bounds → image-source pixel space: subtract the image's own
    // position/scale so cropX/cropY land in the coordinate system Fabric
    // expects (relative to the un-scaled source image).
    const cropX = Math.max(0, (o.left - t.left) / t.scaleX);
    const cropY = Math.max(0, (o.top - t.top) / t.scaleY);
    const cropW = o.getScaledWidth() / t.scaleX;
    const cropH = o.getScaledHeight() / t.scaleY;

    t.set({
      cropX, cropY,
      width: cropW, height: cropH,
      left: o.left, top: o.top,
      selectable: true,
    });
    t.setCoords();
    this.canvas.remove(o);
    this.canvas.setActiveObject(t);
    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified', { target: t });
  }

  cancel() {
    this.target.set('selectable', true);
    this.canvas.remove(this.overlay);
    this.canvas.requestRenderAll();
  }
}

// ── Quick-style presets (Batch 21) ──────────────────────────────────────
// Named combinations of the adjustment values already wired up in
// canvasEngine/filtersGallery — reuses that machinery rather than adding
// a parallel filter path.
export const STYLE_PRESETS = [
  { id: 'none', label: 'Original', values: { brightness: 0, contrast: 0, saturation: 0, hue: 0 } },
  { id: 'vivid', label: 'Vivid', values: { brightness: 0.05, contrast: 0.15, saturation: 0.3, hue: 0 } },
  { id: 'bw', label: 'B&W', values: { brightness: 0, contrast: 0.1, saturation: -1, hue: 0 } },
  { id: 'warm', label: 'Warm', values: { brightness: 0.05, contrast: 0.05, saturation: 0.1, hue: -0.05 } },
  { id: 'cool', label: 'Cool', values: { brightness: 0, contrast: 0.05, saturation: 0.05, hue: 0.08 } },
  { id: 'muted', label: 'Muted', values: { brightness: 0, contrast: -0.1, saturation: -0.3, hue: 0 } },
];
