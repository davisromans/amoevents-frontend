import * as fabric from 'fabric';
import { markOriginalPixels } from './retouchTools';

async function subjectCutoutCanvas(fabricImg, { onProgress } = {}) {
  const el = fabricImg.getElement();
  const sourceCanvas = window.document.createElement('canvas');
  sourceCanvas.width = el.naturalWidth || el.width;
  sourceCanvas.height = el.naturalHeight || el.height;
  sourceCanvas.getContext('2d').drawImage(el, 0, 0);
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(sourceCanvas, {
    progress: (key, current, total) => onProgress?.({ key, current, total }),
  });
  const url = URL.createObjectURL(blob);
  try {
    const cutoutImg = await fabric.FabricImage.fromURL(url);
    const element = cutoutImg.getElement();
    const canvas = window.document.createElement('canvas');
    canvas.width = element.naturalWidth || element.width;
    canvas.height = element.naturalHeight || element.height;
    canvas.getContext('2d').drawImage(element, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function selectImageSubject(fabricImg, options = {}) {
  const cutout = await subjectCutoutCanvas(fabricImg, options);
  const cropX = Math.max(0, Math.min(cutout.width - 1, Math.round(fabricImg.cropX || 0)));
  const cropY = Math.max(0, Math.min(cutout.height - 1, Math.round(fabricImg.cropY || 0)));
  const width = Math.max(1, Math.min(cutout.width - cropX, Math.round(fabricImg.width || cutout.width)));
  const height = Math.max(1, Math.min(cutout.height - cropY, Math.round(fabricImg.height || cutout.height)));
  const visible = window.document.createElement('canvas'); visible.width = width; visible.height = height;
  visible.getContext('2d').drawImage(cutout, cropX, cropY, width, height, 0, 0, width, height);
  const pixels = visible.getContext('2d').getImageData(0, 0, width, height);
  const mask = window.document.createElement('canvas');
  mask.width = width; mask.height = height;
  const context = mask.getContext('2d');
  const output = context.createImageData(mask.width, mask.height);
  let count = 0;
  for (let index = 0; index < pixels.data.length; index += 4) {
    const alpha = pixels.data[index + 3];
    output.data[index] = output.data[index + 1] = output.data[index + 2] = 255;
    output.data[index + 3] = alpha;
    if (alpha >= 128) count += 1;
  }
  context.putImageData(output, 0, 0);
  return { mask, width: mask.width, height: mask.height, count };
}

// Batch 19 — background removal. Runs entirely client-side via a WASM
// model (@imgly/background-removal) — no server round-trip, no per-image
// API cost. First call in a session downloads the model (a few MB,
// cached by the browser after); every call after that is local inference.
//
// The result is a real cutout (alpha channel added around the subject),
// swapped in as the layer's new image source. Manual touch-up on the cut
// edge reuses the Batch 12 mask-paint tool as-is — a background-removal
// cutout and a hand-painted mask are the same underlying mechanism
// (alpha compositing), so "refine edge" doesn't need its own separate
// brush implementation, just pointing the existing one at this layer.

export async function removeImageBackground(fabricImg, { onProgress } = {}) {
  const sourceData = markOriginalPixels(fabricImg);
  const cutoutCanvas = await subjectCutoutCanvas(fabricImg, { onProgress });
  const cutoutImg = new fabric.FabricImage(cutoutCanvas);

  // Swap the pixel source in place — keep every layer property (position,
  // rotation, blend mode, effects, data.layerId/binding) exactly as they
  // were, only the underlying pixels change.
  fabricImg.setElement(cutoutImg.getElement());
  fabricImg.set('data', { ...sourceData, backgroundRemoved: true, liveCanvas: true });
  fabricImg.dirty = true;
}
