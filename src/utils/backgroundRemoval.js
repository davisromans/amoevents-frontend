import * as fabric from 'fabric';
import { removeBackground } from '@imgly/background-removal';

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
  const el = fabricImg.getElement();
  const sourceCanvas = window.document.createElement('canvas');
  sourceCanvas.width = el.naturalWidth || el.width;
  sourceCanvas.height = el.naturalHeight || el.height;
  sourceCanvas.getContext('2d').drawImage(el, 0, 0);

  const blob = await removeBackground(sourceCanvas, {
    progress: (key, current, total) => onProgress?.({ key, current, total }),
  });
  const url = URL.createObjectURL(blob);
  const cutoutImg = await fabric.FabricImage.fromURL(url);

  // Swap the pixel source in place — keep every layer property (position,
  // rotation, blend mode, effects, data.layerId/binding) exactly as they
  // were, only the underlying pixels change.
  fabricImg.setElement(cutoutImg.getElement());
  fabricImg.set('data', { ...(fabricImg.get('data') || {}), backgroundRemoved: true });
  fabricImg.dirty = true;
  URL.revokeObjectURL(url);
}
