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

export async function rasterizeFabricObject(obj) {
  return rasterizeLeaf(obj);
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
