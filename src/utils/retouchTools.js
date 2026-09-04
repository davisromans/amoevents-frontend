import * as fabric from 'fabric';

// Batch 18 — retouching. Clone stamp and dodge/burn both need direct
// pixel access, which means the target image layer has to be backed by a
// live, mutable <canvas> element rather than a static <img> — Fabric
// happily accepts either as an Image object's source, so `ensureLiveCanvas`
// does a one-time swap the first time any retouch tool touches a layer,
// after which every subsequent paint stroke just mutates that canvas's
// pixels directly and re-renders.
//
// Honest scope note: this covers Clone Stamp and Dodge/Burn, both of
// which are "read source pixels, write them elsewhere" or "read pixels,
// scale their brightness" — genuinely simple per-pixel operations. Healing
// brush, spot healing, and smudge all need content-aware blending
// (matching texture/color gradients across the seam, not just copying
// raw pixels) — meaningfully harder, and not built this round.

export function ensureLiveCanvas(fabricImg) {
  if (fabricImg.get('data')?.liveCanvas) return fabricImg.getElement();
  const src = fabricImg.getElement();
  const canvas = window.document.createElement('canvas');
  canvas.width = src.naturalWidth || src.width;
  canvas.height = src.naturalHeight || src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  fabricImg.setElement(canvas);
  fabricImg.set('objectCaching', false);
  fabricImg.set('data', { ...(fabricImg.get('data') || {}), liveCanvas: true });
  return canvas;
}

function sceneToImagePixel(fabricImg, scenePoint) {
  // Scene coords are in canvas/document space; the live canvas is in the
  // image's own native pixel space — divide out position + scale to land
  // on the right source pixel regardless of how the layer's been resized.
  const canvas = fabricImg.getElement();
  const x = (scenePoint.x - fabricImg.left) / fabricImg.scaleX;
  const y = (scenePoint.y - fabricImg.top) / fabricImg.scaleY;
  return { x, y, canvas };
}

export class CloneStampController {
  constructor(fabricImg, { brushSize = 40 } = {}) {
    this.target = fabricImg;
    this.brushSize = brushSize;
    this.sourceOffset = null; // {dx, dy} — set on first stamp relative to the anchor
    this.anchor = null;
  }

  /** Alt-click equivalent — call this first to define where clones sample from. */
  setSource(scenePoint) {
    this.anchor = sceneToImagePixel(this.target, scenePoint);
    this.sourceOffset = null; // reset — next paint stroke re-derives the offset from its own first point
  }

  paint(scenePoint) {
    if (!this.anchor) return; // no source set yet — caller should prompt for alt-click first
    const canvas = ensureLiveCanvas(this.target);
    const ctx = canvas.getContext('2d');
    const dest = sceneToImagePixel(this.target, scenePoint);

    if (!this.sourceOffset) {
      this.sourceOffset = { dx: this.anchor.x - dest.x, dy: this.anchor.y - dest.y };
    }
    const srcX = dest.x + this.sourceOffset.dx;
    const srcY = dest.y + this.sourceOffset.dy;
    const r = this.brushSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(dest.x, dest.y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(canvas, srcX - dest.x, srcY - dest.y);
    ctx.restore();

    this.target.dirty = true;
  }
}

export function dodgeBurnAt(fabricImg, scenePoint, { mode = 'dodge', brushSize = 40, strength = 0.15 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg);
  const ctx = canvas.getContext('2d');
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  const r = brushSize / 2;

  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  const alpha = mode === 'dodge' ? strength : strength;
  grad.addColorStop(0, mode === 'dodge' ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.globalCompositeOperation = mode === 'dodge' ? 'lighten' : 'multiply';
  // 'lighten'/'multiply' composite on a soft gradient gives dodge/burn's
  // characteristic falloff without a hand-rolled per-pixel brightness
  // scan — the canvas compositor already does exactly that math.
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  fabricImg.dirty = true;
}

// Shared by eraseAt (destination-out, punches transparency) and
// paintBrushAt (source-over, lays down color) — both are "stamp a soft or
// hard circle at this point" with the compositing mode as the only real
// difference. hardness controls where the alpha falloff STARTS, not just
// whether it exists: 0 = soft from the center out, 1 = fully opaque all
// the way to the edge. A fully hard stamp skips the gradient entirely —
// canvas radial gradients round the center stop slightly even at r=1,
// which showed up as a faint softness on "hard" that a plain filled
// circle doesn't have.
function stampAt(ctx, x, y, radius, hardness, compositeOp, rgb) {
  ctx.save();
  ctx.globalCompositeOperation = compositeOp;
  if (hardness >= 0.98) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},1)`;
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(x, y, radius * hardness, x, y, radius);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

// Photoshop's real eraser: punches transparent holes directly into a
// raster layer's own pixels, not a separate stroke object drawn on top.
// Only works on image layers — which is exactly why "Rasterize" exists
// (see canvasEngine.js's rasterizeObject): a shape or text layer has no
// pixels to erase until it's flattened into one.
export function eraseAt(fabricImg, scenePoint, { brushSize = 40, hardness = 0.7 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg);
  const ctx = canvas.getContext('2d');
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  stampAt(ctx, x, y, brushSize / 2, hardness, 'destination-out', '0,0,0');
  fabricImg.dirty = true;
}

/**
 * Real Photoshop-style painting: stamps color DIRECTLY onto the target
 * layer's own pixels (source-over), not a separate vector stroke object
 * layered on top. This is also why it needs an actual image layer under
 * the cursor to work on — same requirement as the eraser, same reason
 * "Rasterize" and "New empty layer" exist. Previously "soft" was
 * implemented via Fabric's PencilBrush + a canvas shadow-blur, which only
 * put a faint blurred halo around a still fully-solid stroke core — never
 * an actual soft alpha falloff across the brush the way this stamp is.
 */
export function paintBrushAt(fabricImg, scenePoint, { brushSize = 20, hardness = 0.7, color = '#111827' } = {}) {
  const canvas = ensureLiveCanvas(fabricImg);
  const ctx = canvas.getContext('2d');
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  const h = color.replace('#', '');
  const rgb = h.length === 6
    ? `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
    : '17,24,39';
  stampAt(ctx, x, y, brushSize / 2, hardness, 'source-over', rgb);
  fabricImg.dirty = true;
}

export function refreshAfterRetouch(canvas, fabricImg) {
  fabricImg.setCoords();
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: fabricImg });
}
