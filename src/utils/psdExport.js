import * as fabric from 'fabric';

const COMPOSITE_TO_PSD = {
  'source-over': 'normal',
  multiply: 'multiply', screen: 'screen', overlay: 'overlay',
  darken: 'darken', lighten: 'lighten',
  'color-dodge': 'color dodge', 'color-burn': 'color burn',
  'hard-light': 'hard light', 'soft-light': 'soft light',
  difference: 'difference', exclusion: 'exclusion',
  hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity',
};

function safeName(obj) {
  return obj.get('data')?.name || obj.text?.slice(0, 40) || obj.type || 'Layer';
}

async function rasterizeLeaf(obj) {
  const clone = await obj.clone(['data']);
  // calcTransformMatrix includes every parent-group transform. Applying it
  // to the detached clone keeps nested PSD layers in their exact document
  // position when exported as independent Photoshop layers.
  fabric.util.applyTransformToObject(clone, obj.calcTransformMatrix());
  clone.group = undefined;
  // Visibility, opacity and blend mode belong to the PSD layer metadata.
  // Baking them into the bitmap would make hidden layers export blank and
  // would apply opacity twice when Photoshop renders the resulting layer.
  clone.set({
    originX: 'left', originY: 'top',
    visible: true,
    opacity: 1,
    globalCompositeOperation: 'source-over',
  });
  clone.setCoords();
  const bounds = clone.getBoundingRect();
  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));
  clone.set({ left: (clone.left || 0) - bounds.left, top: (clone.top || 0) - bounds.top });
  if (clone.clipPath?.absolutePositioned) {
    clone.clipPath.set({
      left: (clone.clipPath.left || 0) - bounds.left,
      top: (clone.clipPath.top || 0) - bounds.top,
    });
    clone.clipPath.setCoords();
  }
  clone.setCoords();
  const el = window.document.createElement('canvas');
  const layerCanvas = new fabric.StaticCanvas(el, { width, height, backgroundColor: 'transparent' });
  layerCanvas.add(clone);
  layerCanvas.renderAll();
  const canvas = layerCanvas.toCanvasElement(1);
  layerCanvas.dispose();
  return { canvas, left: Math.floor(bounds.left), top: Math.floor(bounds.top) };
}

async function objectToPsdLayer(obj) {
  const common = {
    name: safeName(obj),
    hidden: obj.visible === false,
    opacity: obj.opacity ?? 1,
    blendMode: COMPOSITE_TO_PSD[obj.globalCompositeOperation] || 'normal',
  };
  if (obj.type === 'group') {
    const children = [];
    // Fabric stores bottom-to-top; PSD children are written top-to-bottom.
    for (const child of [...obj.getObjects()].reverse()) children.push(await objectToPsdLayer(child));
    return { ...common, children, opened: true };
  }
  const bitmap = await rasterizeLeaf(obj);
  return { ...common, ...bitmap };
}

/**
 * Exports a layered, Photoshop-readable PSD. Every layer's visible result
 * is rasterized so fonts, masks, filters and Fabric effects remain faithful;
 * the layer names, hierarchy, visibility, opacity, order and blend modes stay
 * editable. This intentionally avoids ag-psd's incomplete text writer.
 */
export async function exportCanvasAsPsd(canvas, { width, height }) {
  // Keep the sizeable PSD codec out of the editor's initial bundle. It is
  // downloaded only when the user explicitly requests a PSD export.
  const { writePsd } = await import('ag-psd');
  const children = [];
  for (const obj of [...canvas.getObjects()].reverse()) children.push(await objectToPsdLayer(obj));
  // The live editor changes both viewport zoom and backing-canvas size.
  // Neutralise that display zoom so the PSD composite is always exported
  // at the document's real pixel dimensions.
  const composite = canvas.toCanvasElement(1 / (canvas.getZoom() || 1));
  return writePsd({
    width,
    height,
    canvas: composite,
    children,
  }, { noBackground: true });
}
