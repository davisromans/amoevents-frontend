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

export function sceneToImagePixel(fabricImg, scenePoint) {
  // Invert the complete object transform (rotation, group transforms,
  // negative scale from flipping, and resizing). The previous left/top
  // subtraction only worked for an unrotated top-level image and made
  // brush/eraser strokes miss their cursor on real PSD layers.
  const canvas = fabricImg.getElement();
  const matrix = fabricImg.calcTransformMatrix();
  const inverse = fabric.util.invertTransform(matrix);
  const local = fabric.util.transformPoint(new fabric.Point(scenePoint.x, scenePoint.y), inverse);
  const x = local.x + (fabricImg.width || 0) / 2 + (fabricImg.cropX || 0);
  const y = local.y + (fabricImg.height || 0) / 2 + (fabricImg.cropY || 0);
  const sceneScale = Math.max(0.0001, Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])));
  return { x, y, canvas, sceneScale };
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
    const r = this.brushSize / dest.sceneScale / 2;

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
  const { x, y, sceneScale } = sceneToImagePixel(fabricImg, scenePoint);
  const r = brushSize / sceneScale / 2;

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
  const { x, y, sceneScale } = sceneToImagePixel(fabricImg, scenePoint);
  stampAt(ctx, x, y, brushSize / sceneScale / 2, hardness, 'destination-out', '0,0,0');
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
  const { x, y, sceneScale } = sceneToImagePixel(fabricImg, scenePoint);
  const h = color.replace('#', '');
  const rgb = h.length === 6
    ? `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
    : '17,24,39';
  stampAt(ctx, x, y, brushSize / sceneScale / 2, hardness, 'source-over', rgb);
  fabricImg.dirty = true;
}

export function paintBrushTipAt(fabricImg, scenePoint, tipCanvas, { brushSize = 20, color = '#111827', angle = 0, roundness = 100 } = {}) {
  if (!tipCanvas) return paintBrushAt(fabricImg, scenePoint, { brushSize, color, hardness: 1 });
  const canvas = ensureLiveCanvas(fabricImg); const ctx = canvas.getContext('2d');
  const { x, y, sceneScale } = sceneToImagePixel(fabricImg, scenePoint);
  const width = Math.max(1, brushSize / sceneScale); const height = Math.max(1, width * Math.max(0.01, Number(roundness || 100) / 100));
  const tinted = window.document.createElement('canvas'); tinted.width = tipCanvas.width; tinted.height = tipCanvas.height;
  const tint = tinted.getContext('2d'); tint.drawImage(tipCanvas, 0, 0); tint.globalCompositeOperation = 'source-in'; tint.fillStyle = color; tint.fillRect(0, 0, tinted.width, tinted.height);
  ctx.save(); ctx.translate(x, y); ctx.rotate((Number(angle) || 0) * Math.PI / 180); ctx.drawImage(tinted, -width / 2, -height / 2, width, height); ctx.restore();
  fabricImg.dirty = true;
}

// Local, deterministic inpainting for erased/transparent regions. It grows
// colour inward from the intact boundary over several passes, averaging the
// nearest opaque neighbours. This is intentionally offline and never uploads
// the customer's artwork to a third-party AI service.
export function contentAwareFillTransparent(fabricImg, { maxPasses = 96 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg); const ctx = canvas.getContext('2d');
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const { data } = image;
  const pending = new Uint8Array(canvas.width * canvas.height);
  let remaining = 0;
  for (let p = 0; p < pending.length; p += 1) if (data[p * 4 + 3] < 8) { pending[p] = 1; remaining += 1; }
  const originalRemaining = remaining;
  for (let pass = 0; pass < maxPasses && remaining; pass += 1) {
    const updates = [];
    for (let p = 0; p < pending.length; p += 1) {
      if (!pending[p]) continue;
      const x = p % canvas.width, y = Math.floor(p / canvas.width); let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        if ((!ox && !oy) || x + ox < 0 || y + oy < 0 || x + ox >= canvas.width || y + oy >= canvas.height) continue;
        const q = ((y + oy) * canvas.width + x + ox) * 4;
        if (data[q + 3] < 128) continue;
        r += data[q]; g += data[q + 1]; b += data[q + 2]; a += data[q + 3]; count += 1;
      }
      if (count) updates.push([p, r / count, g / count, b / count, a / count]);
    }
    if (!updates.length) break;
    for (const [p, r, g, b, a] of updates) {
      const i = p * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; pending[p] = 0; remaining -= 1;
    }
  }
  ctx.putImageData(image, 0, 0); fabricImg.dirty = true;
  return { filled: originalRemaining - remaining, remaining };
}

export function sampleColorAt(fabricImg, scenePoint) {
  const canvas = ensureLiveCanvas(fabricImg);
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  const pixel = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function paintBucketAt(fabricImg, scenePoint, { color = '#111827', tolerance = 28 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg);
  const ctx = canvas.getContext('2d');
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data; const start = (sy * canvas.width + sx) * 4;
  const source = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const parsed = new fabric.Color(color).getSource();
  const replacement = [parsed[0], parsed[1], parsed[2], Math.round((parsed[3] ?? 1) * 255)];
  const matches = (i) => Math.max(
    Math.abs(data[i] - source[0]), Math.abs(data[i + 1] - source[1]),
    Math.abs(data[i + 2] - source[2]), Math.abs(data[i + 3] - source[3]),
  ) <= tolerance;
  const visited = new Uint8Array(canvas.width * canvas.height);
  const stack = [sy * canvas.width + sx];
  while (stack.length) {
    const p = stack.pop(); if (visited[p]) continue; visited[p] = 1;
    const i = p * 4; if (!matches(i)) continue;
    data[i] = replacement[0]; data[i + 1] = replacement[1]; data[i + 2] = replacement[2]; data[i + 3] = replacement[3];
    const px = p % canvas.width, py = Math.floor(p / canvas.width);
    if (px > 0) stack.push(p - 1); if (px < canvas.width - 1) stack.push(p + 1);
    if (py > 0) stack.push(p - canvas.width); if (py < canvas.height - 1) stack.push(p + canvas.width);
  }
  ctx.putImageData(image, 0, 0); fabricImg.dirty = true;
}

export function magicWandAt(fabricImg, scenePoint, { tolerance = 28 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg); const ctx = canvas.getContext('2d');
  const { x, y } = sceneToImagePixel(fabricImg, scenePoint);
  const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = image.data;
  const start = (sy * canvas.width + sx) * 4;
  const source = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const matches = (i) => Math.max(Math.abs(data[i] - source[0]), Math.abs(data[i + 1] - source[1]), Math.abs(data[i + 2] - source[2]), Math.abs(data[i + 3] - source[3])) <= tolerance;
  const selected = new Uint8Array(canvas.width * canvas.height); const stack = [sy * canvas.width + sx];
  while (stack.length) {
    const p = stack.pop(); if (selected[p]) continue;
    const i = p * 4; if (!matches(i)) continue; selected[p] = 1;
    const px = p % canvas.width, py = Math.floor(p / canvas.width);
    if (px > 0) stack.push(p - 1); if (px < canvas.width - 1) stack.push(p + 1);
    if (py > 0) stack.push(p - canvas.width); if (py < canvas.height - 1) stack.push(p + canvas.width);
  }
  // The selected contiguous region becomes the retained image area. This is
  // equivalent to selecting then adding a reveal-selection mask.
  for (let p = 0; p < selected.length; p += 1) if (!selected[p]) data[p * 4 + 3] = 0;
  ctx.putImageData(image, 0, 0); fabricImg.dirty = true;
}

export function liquifyPushAt(fabricImg, fromScene, toScene, { brushSize = 80, strength = 0.65 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg); const ctx = canvas.getContext('2d');
  const from = sceneToImagePixel(fabricImg, fromScene); const to = sceneToImagePixel(fabricImg, toScene);
  const r = Math.max(2, brushSize / to.sceneScale / 2);
  const size = Math.max(2, Math.ceil(r * 2));
  const sourceX = Math.max(0, Math.min(canvas.width - size, Math.round(from.x - r)));
  const sourceY = Math.max(0, Math.min(canvas.height - size, Math.round(from.y - r)));
  const patch = window.document.createElement('canvas'); patch.width = size; patch.height = size;
  patch.getContext('2d').drawImage(canvas, sourceX, sourceY, size, size, 0, 0, size, size);
  const dx = (to.x - from.x) * strength, dy = (to.y - from.y) * strength;
  ctx.save(); ctx.beginPath(); ctx.arc(to.x, to.y, r, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(patch, sourceX + dx, sourceY + dy); ctx.restore(); fabricImg.dirty = true;
}

function drawMappedTriangle(ctx, source, src, dst) {
  const [s1, s2, s3] = src, [d1, d2, d3] = dst;
  const denominator = s1.x * (s2.y - s3.y) + s2.x * (s3.y - s1.y) + s3.x * (s1.y - s2.y);
  if (Math.abs(denominator) < 1e-8) return;
  const coefficients = (v1, v2, v3) => ({
    x: (v1 * (s2.y - s3.y) + v2 * (s3.y - s1.y) + v3 * (s1.y - s2.y)) / denominator,
    y: (v1 * (s3.x - s2.x) + v2 * (s1.x - s3.x) + v3 * (s2.x - s1.x)) / denominator,
    o: (v1 * (s2.x * s3.y - s3.x * s2.y) + v2 * (s3.x * s1.y - s1.x * s3.y) + v3 * (s1.x * s2.y - s2.x * s1.y)) / denominator,
  });
  const horizontal = coefficients(d1.x, d2.x, d3.x); const vertical = coefficients(d1.y, d2.y, d3.y);
  ctx.save(); ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.lineTo(d3.x, d3.y); ctx.closePath(); ctx.clip();
  ctx.setTransform(horizontal.x, vertical.x, horizontal.y, vertical.y, horizontal.o, vertical.o);
  ctx.drawImage(source, 0, 0); ctx.restore();
}

export function perspectiveWarp(fabricImg, corners, subdivisions = 16) {
  const source = ensureLiveCanvas(fabricImg);
  const output = window.document.createElement('canvas'); output.width = source.width; output.height = source.height;
  const ctx = output.getContext('2d');
  const quad = {
    tl: corners.tl || { x: 0, y: 0 }, tr: corners.tr || { x: source.width, y: 0 },
    br: corners.br || { x: source.width, y: source.height }, bl: corners.bl || { x: 0, y: source.height },
  };
  const point = (u, v) => ({
    x: (1-u)*(1-v)*quad.tl.x + u*(1-v)*quad.tr.x + u*v*quad.br.x + (1-u)*v*quad.bl.x,
    y: (1-u)*(1-v)*quad.tl.y + u*(1-v)*quad.tr.y + u*v*quad.br.y + (1-u)*v*quad.bl.y,
  });
  const sourcePoint = (u, v) => ({ x: u * source.width, y: v * source.height });
  for (let row = 0; row < subdivisions; row += 1) for (let column = 0; column < subdivisions; column += 1) {
    const u0 = column / subdivisions, u1 = (column + 1) / subdivisions, v0 = row / subdivisions, v1 = (row + 1) / subdivisions;
    const s00 = sourcePoint(u0,v0), s10 = sourcePoint(u1,v0), s11 = sourcePoint(u1,v1), s01 = sourcePoint(u0,v1);
    const d00 = point(u0,v0), d10 = point(u1,v0), d11 = point(u1,v1), d01 = point(u0,v1);
    drawMappedTriangle(ctx, source, [s00,s10,s11], [d00,d10,d11]); drawMappedTriangle(ctx, source, [s00,s11,s01], [d00,d11,d01]);
  }
  fabricImg.setElement(output); fabricImg.set('objectCaching', false);
  fabricImg.set('data', { ...(fabricImg.get('data') || {}), liveCanvas: true }); fabricImg.dirty = true;
}

export function healAt(fabricImg, scenePoint, { brushSize = 40, strength = 0.65 } = {}) {
  const canvas = ensureLiveCanvas(fabricImg); const ctx = canvas.getContext('2d');
  const { x, y, sceneScale } = sceneToImagePixel(fabricImg, scenePoint);
  const r = Math.max(2, brushSize / sceneScale / 2);
  const size = Math.max(1, Math.round(r * 2));
  const dx = Math.max(0, Math.min(canvas.width - size, Math.round(x - r)));
  const dy = Math.max(0, Math.min(canvas.height - size, Math.round(y - r)));
  const sourceX = Math.max(0, Math.min(canvas.width - size, dx - size));
  const patchCanvas = window.document.createElement('canvas'); patchCanvas.width = size; patchCanvas.height = size;
  patchCanvas.getContext('2d').drawImage(canvas, sourceX, dy, size, size, 0, 0, size, size);
  ctx.save(); ctx.globalAlpha = strength; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(patchCanvas, dx, dy); ctx.restore(); fabricImg.dirty = true;
}

export function refreshAfterRetouch(canvas, fabricImg) {
  fabricImg.setCoords();
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: fabricImg });
}
