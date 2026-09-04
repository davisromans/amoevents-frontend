import * as fabric from 'fabric';

// Batch 12 — masking. Two mechanisms, both built on Fabric's own
// `clipPath` (which composites via source-in / destination-in under the
// hood — real alpha-aware masking, not just a visual clip):
//
//   1. Vector clip — any shape becomes the mask for the layer below it.
//      Hard-edged (a pixel is either shown or hidden), instant, no
//      painting required. This is what "clip to shape" means in every
//      design tool.
//   2. Raster paint mask — a freehand-painted grayscale mask, soft edges
//      included (a semi-transparent brush stroke = partial visibility).
//      This is the closer analogue to a real Photoshop layer mask.

/** Vector clip mask — `clipShape` becomes the mask for `target`, removed from the canvas as an independent object. */
export function applyClipMask(canvas, target, clipShape) {
  canvas.remove(clipShape);
  clipShape.set({ absolutePositioned: true, selectable: false, evented: false });
  target.set('clipPath', clipShape);
  target.set('data', { ...(target.get('data') || {}), maskType: 'vector' });
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target });
}

export function removeMask(canvas, target) {
  target.set('clipPath', undefined);
  const data = { ...(target.get('data') || {}) };
  delete data.maskType;
  target.set('data', data);
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target });
}

// ── Raster paint mask ────────────────────────────────────────────────
// A tiny stateful controller for a brush-paint session: creates an
// offscreen 2D canvas the size of the target's bounding box, exposes
// paint(x, y) in the SAME scene coordinates the main Fabric canvas uses
// (so the caller can just forward pointer events), and apply() turns the
// painted result into a fabric.Image assigned as target.clipPath.
// White paint = fully visible, black = fully hidden, gray = partial —
// exactly how a real layer mask reads.
export class MaskPainter {
  constructor(target, { brushSize = 40, hardness = 0.7 } = {}) {
    this.target = target;
    this.brushSize = brushSize;
    this.hardness = hardness;

    this.bounds = {
      left: target.left, top: target.top,
      width: target.getScaledWidth(), height: target.getScaledHeight(),
    };

    this.canvas = window.document.createElement('canvas');
    this.canvas.width = Math.max(1, Math.round(this.bounds.width));
    this.canvas.height = Math.max(1, Math.round(this.bounds.height));
    this.ctx = this.canvas.getContext('2d');
    // Fabric's clipPath compositing reads the ALPHA channel of what gets
    // drawn here (it's a destination-in composite) — RGB color is
    // irrelevant to visibility, only opacity is. So "fully visible" means
    // fully OPAQUE, and painting to hide means erasing alpha, not drawing
    // a black color (an opaque black pixel would stay fully visible).
    this.ctx.fillStyle = 'rgba(255,255,255,1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * scenePoint is in the same coordinate space as Fabric object.left/top.
   * mode 'hide' erases alpha (black-brush equivalent — conceals);
   * mode 'reveal' restores full opacity (white-brush equivalent).
   */
  paint(scenePoint, mode = 'hide') {
    const x = scenePoint.x - this.bounds.left;
    const y = scenePoint.y - this.bounds.top;
    const r = this.brushSize / 2;
    const grad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(this.hardness, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.save();
    this.ctx.globalCompositeOperation = mode === 'hide' ? 'destination-out' : 'source-over';
    this.ctx.fillStyle = mode === 'hide' ? grad : 'rgba(255,255,255,1)';
    if (mode === 'reveal') {
      // Revealing needs the same soft falloff — reuse the gradient's alpha
      // shape but painted as white-over rather than an alpha-eraser.
      const revealGrad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
      revealGrad.addColorStop(0, 'rgba(255,255,255,1)');
      revealGrad.addColorStop(this.hardness, 'rgba(255,255,255,1)');
      revealGrad.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = revealGrad;
    }
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    this.ctx.restore();
  }

  previewDataUrl() {
    return this.canvas.toDataURL('image/png');
  }

  async apply(fabricCanvas) {
    const img = await fabric.FabricImage.fromURL(this.canvas.toDataURL('image/png'));
    img.set({
      left: this.bounds.left, top: this.bounds.top,
      scaleX: this.bounds.width / img.width, scaleY: this.bounds.height / img.height,
      absolutePositioned: true, selectable: false, evented: false,
    });
    this.target.set('clipPath', img);
    this.target.set('data', { ...(this.target.get('data') || {}), maskType: 'raster' });
    fabricCanvas.requestRenderAll();
    fabricCanvas.fire('object:modified', { target: this.target });
  }
}
