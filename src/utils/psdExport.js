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

function colorToPsd(value) {
  const c = new fabric.Color(value || '#000000').getSource();
  return { r: c[0], g: c[1], b: c[2], a: (c[3] ?? 1) * 255 };
}

function fabricTextToPsd(obj) {
  const text = String(obj.text || '');
  const data = {
    text,
    transform: obj.calcTransformMatrix().slice(0, 6),
    antiAlias: 'smooth',
    orientation: 'horizontal',
    shapeType: obj.type === 'textbox' ? 'box' : 'point',
    style: {
      font: { name: String(obj.fontFamily || 'Arial').replace(/\s+/g, '') || 'ArialMT' },
      fontSize: Number(obj.fontSize) || 24,
      fauxBold: Number(obj.fontWeight) >= 600 || String(obj.fontWeight).toLowerCase() === 'bold',
      fauxItalic: obj.fontStyle === 'italic',
      underline: !!obj.underline,
      strikethrough: !!obj.linethrough,
      tracking: Number(obj.charSpacing) || 0,
      fillColor: colorToPsd(obj.fill),
      ...(obj.stroke ? { strokeColor: colorToPsd(obj.stroke), strokeFlag: true, outlineWidth: Number(obj.strokeWidth) || 1 } : {}),
    },
    paragraphStyle: {
      justification: ({ left: 'left', center: 'center', right: 'right', justify: 'justify-all' })[obj.textAlign] || 'left',
    },
  };
  if (obj.type === 'textbox') data.boxBounds = [0, 0, Number(obj.width) || 1, Number(obj.height) || 1];
  return data;
}

function cropToDocument(bounds, documentBounds) {
  if (!documentBounds) return {
    left: Math.floor(bounds.left), top: Math.floor(bounds.top),
    width: Math.max(1, Math.ceil(bounds.width)), height: Math.max(1, Math.ceil(bounds.height)),
    visible: true,
  };
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(documentBounds.width, Math.ceil(bounds.left + bounds.width));
  const bottom = Math.min(documentBounds.height, Math.ceil(bounds.top + bounds.height));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    visible: right > left && bottom > top,
  };
}

function transparentCanvas(width = 1, height = 1) {
  const canvas = window.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function rasterizeLeaf(obj, documentBounds = null) {
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
  // Imported PSDs can contain a very large image or mask positioned mostly
  // outside the poster. Allocating its complete bounding box can exhaust the
  // browser before ag-psd starts writing. A PSD only needs pixels inside the
  // document rectangle for its visible result, so rasterise that intersection.
  const crop = cropToDocument(bounds, documentBounds);
  if (!crop.visible) {
    return { canvas: transparentCanvas(), left: crop.left, top: crop.top };
  }
  clone.set({ left: (clone.left || 0) - crop.left, top: (clone.top || 0) - crop.top });
  if (clone.clipPath?.absolutePositioned) {
    clone.clipPath.set({
      left: (clone.clipPath.left || 0) - crop.left,
      top: (clone.clipPath.top || 0) - crop.top,
    });
    clone.clipPath.setCoords();
  }
  clone.setCoords();
  const el = window.document.createElement('canvas');
  const layerCanvas = new fabric.StaticCanvas(el, { width: crop.width, height: crop.height, backgroundColor: 'transparent' });
  layerCanvas.add(clone);
  layerCanvas.renderAll();
  const canvas = layerCanvas.toCanvasElement(1);
  layerCanvas.dispose();
  return { canvas, left: crop.left, top: crop.top };
}

export async function rasterizeFabricObject(obj) {
  return rasterizeLeaf(obj);
}

async function objectToPsdLayer(obj, documentBounds) {
  const common = {
    name: safeName(obj),
    hidden: obj.visible === false,
    opacity: obj.opacity ?? 1,
    blendMode: COMPOSITE_TO_PSD[obj.globalCompositeOperation] || 'normal',
  };
  if (obj.type === 'group') {
    const children = [];
    // Fabric stores bottom-to-top; PSD children are written top-to-bottom.
    for (const child of [...obj.getObjects()].reverse()) children.push(await objectToPsdLayer(child, documentBounds));
    return { ...common, children, opened: true };
  }
  const bitmap = await rasterizeLeaf(obj, documentBounds);
  if (['textbox', 'text', 'i-text'].includes(obj.type)) {
    return { ...common, ...bitmap, text: fabricTextToPsd(obj) };
  }
  return { ...common, ...bitmap };
}

/**
 * Exports a layered, Photoshop-readable PSD. Every layer keeps a bitmap
 * fallback so masks, filters and Fabric effects remain faithful. Text layers
 * additionally carry editable PSD type metadata.
 */
export async function exportCanvasAsPsd(canvas, { width, height }) {
  // Keep the sizeable PSD codec out of the editor's initial bundle. It is
  // downloaded only when the user explicitly requests a PSD export.
  const { writePsd } = await import('ag-psd');
  const documentBounds = { width, height };
  const children = [];
  for (const obj of [...canvas.getObjects()].reverse()) {
    children.push(await objectToPsdLayer(obj, documentBounds));
    // Yield between layers so Safari/Chrome can collect intermediate Fabric
    // canvases instead of treating a many-layer export as one long blocked task.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
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

/**
 * Low-memory, Photoshop-readable fallback. A layered PSD can require one
 * uncompressed bitmap per layer at the same time, which is too much for some
 * browsers even though the artwork itself renders correctly. This writes one
 * full-resolution composite layer instead, so the user still receives a real
 * PSD rather than a failed download. The editable AmoEvents document remains
 * unchanged in local/cloud storage.
 */
export async function exportCanvasAsCompatiblePsd(canvas, { width, height }) {
  const { writePsd } = await import('ag-psd');
  const composite = canvas.toCanvasElement(1 / (canvas.getZoom() || 1));
  return writePsd({
    width,
    height,
    canvas: composite,
    children: [{
      name: 'AmoEvents artwork (compatible)',
      canvas: composite,
      left: 0,
      top: 0,
    }],
  }, { noBackground: true });
}
