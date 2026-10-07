import { cacheLocalTemplateAsset } from '@/services/templateAssets.service';

const BLEND_MODES = {
  normal: 'normal', norm: 'normal', multiply: 'multiply', mul: 'multiply',
  screen: 'screen', scrn: 'screen', overlay: 'overlay', over: 'overlay',
  darken: 'darken', dark: 'darken', lighten: 'lighten', lite: 'lighten',
  'color dodge': 'color-dodge', div: 'color-dodge',
  'color burn': 'color-burn', idiv: 'color-burn',
  'hard light': 'hard-light', hLit: 'hard-light',
  'soft light': 'soft-light', sLit: 'soft-light',
  difference: 'difference', diff: 'difference', exclusion: 'exclusion', smud: 'exclusion',
  hue: 'hue', saturation: 'saturation', sat: 'saturation', color: 'color', colr: 'color',
  luminosity: 'luminosity', lum: 'luminosity',
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function opacity(value) {
  if (value == null || Number.isNaN(Number(value))) return 1;
  const n = Number(value);
  return clamp(n > 1 ? n / 255 : n, 0, 1);
}
function ownBounds(layer) {
  const left = Number(layer?.left ?? 0);
  const top = Number(layer?.top ?? 0);
  return {
    left, top,
    right: Number(layer?.right ?? left),
    bottom: Number(layer?.bottom ?? top),
  };
}
function unionBounds(bounds) {
  const valid = bounds.filter((b) => b && b.right > b.left && b.bottom > b.top);
  if (!valid.length) return { left: 0, top: 0, right: 0, bottom: 0 };
  return {
    left: Math.min(...valid.map((b) => b.left)),
    top: Math.min(...valid.map((b) => b.top)),
    right: Math.max(...valid.map((b) => b.right)),
    bottom: Math.max(...valid.map((b) => b.bottom)),
  };
}
function visualBounds(layer) {
  return layer?.children?.length ? unionBounds(layer.children.map(visualBounds)) : ownBounds(layer);
}
function px(value, fallback = 24) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && Number.isFinite(Number(value.value))) return Number(value.value);
  return fallback;
}
function textMetadata(text, bounds) {
  if (!text) return null;
  const style = text.style || text.styleRuns?.[0]?.style || {};
  return {
    type: 'text',
    text: text.text || '',
    textMode: text.shapeType === 'point' ? 'point' : 'box',
    width: Math.max(1, bounds.right - bounds.left),
    height: Math.max(1, bounds.bottom - bounds.top),
    fontFamily: style.font?.name || 'Arial',
    fontSize: px(style.fontSize),
    fontWeight: style.fauxBold ? 700 : 400,
    fontStyle: style.fauxItalic ? 'italic' : 'normal',
    fill: '#000000',
    align: 'left',
    lineHeight: 1.16,
    letterSpacing: px(style.tracking, 0) / 10,
  };
}
async function canvasBlob(canvas) {
  if (!canvas) return null;
  if (typeof canvas.convertToBlob === 'function') return canvas.convertToBlob({ type: 'image/png' });
  if (typeof canvas.toBlob === 'function') {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
  if (typeof canvas.toDataURL === 'function') return fetch(canvas.toDataURL('image/png')).then((response) => response.blob());
  return null;
}
function baseLayer(layer, bounds, parentOrigin) {
  return {
    id: `layer_${crypto.randomUUID()}`,
    name: layer.name || 'Layer',
    x: bounds.left - parentOrigin.x,
    y: bounds.top - parentOrigin.y,
    width: Math.max(0, bounds.right - bounds.left),
    height: Math.max(0, bounds.bottom - bounds.top),
    rotation: 0,
    opacity: opacity(layer.opacity),
    visible: layer.hidden !== true,
    locked: !!layer.protected?.position,
    blendMode: BLEND_MODES[layer.blendMode] || 'normal',
    binding: null,
    effects: [],
    source: { format: 'psd', layerId: layer.id ?? null, openedLocally: true },
  };
}

async function convertLayers(psdLayers, { projectId, parentOrigin, warnings, fonts }) {
  const output = [];
  for (const layer of psdLayers || []) {
    const bounds = visualBounds(layer);
    const base = baseLayer(layer, bounds, parentOrigin);
    if (layer.children) {
      const children = await convertLayers(layer.children, {
        projectId,
        parentOrigin: { x: bounds.left, y: bounds.top },
        warnings,
        fonts,
      });
      output.push({ ...base, type: 'group', coordinateSpace: 'local', opened: layer.opened !== false, children });
      continue;
    }

    if (layer.effects || layer.mask || layer.realMask || layer.clipping) {
      warnings.push(`“${base.name}” contains Photoshop effects, masks, or clipping that the local fallback keeps as pixels; use the online importer if its appearance differs.`);
    }

    const blob = await canvasBlob(layer.canvas);
    if (!blob) {
      warnings.push(`“${base.name}” had no browser-readable pixels and was preserved only as hidden metadata.`);
      output.push({ ...base, type: 'psdMetadata', visible: false });
      continue;
    }
    const localAssetId = `local:${projectId}:psd:${crypto.randomUUID()}`;
    await cacheLocalTemplateAsset(localAssetId, blob);
    const convertedFromText = textMetadata(layer.text, bounds);
    if (convertedFromText?.fontFamily) fonts.add(convertedFromText.fontFamily);
    output.push({
      ...base,
      type: 'image',
      localAssetId,
      assetId: null,
      fit: 'fill',
      cropRect: { x: 0, y: 0, w: 1, h: 1 },
      mask: null,
      ...(convertedFromText ? { convertedFromText } : {}),
    });
  }
  return output;
}

/**
 * Browser-only PSD opener used when the server is unavailable. It keeps the
 * hierarchy and each readable layer's pixels. Text remains pixel-faithful but
 * carries enough source metadata for the Studio's explicit Restore Text action.
 */
export async function importPsdLocally(file, projectId) {
  // The editor remains lightweight for normal poster work; load the PSD codec
  // only when an actual local PSD is opened.
  const { readPsd } = await import('ag-psd');
  const psd = readPsd(await file.arrayBuffer(), { skipThumbnail: false, logMissingFeatures: false });
  const warnings = [];
  const fonts = new Set();
  const layers = await convertLayers(psd.children || [], {
    projectId,
    parentOrigin: { x: 0, y: 0 },
    warnings,
    fonts,
  });
  if (!layers.length && psd.canvas) {
    const blob = await canvasBlob(psd.canvas);
    if (!blob) throw new Error('The PSD composite could not be converted into a local image.');
    const localAssetId = `local:${projectId}:psd:${crypto.randomUUID()}`;
    await cacheLocalTemplateAsset(localAssetId, blob);
    layers.push({
      id: `layer_${crypto.randomUUID()}`, name: 'Flattened PSD', type: 'image',
      x: 0, y: 0, width: psd.width, height: psd.height, rotation: 0,
      opacity: 1, visible: true, locked: false, blendMode: 'normal', binding: null,
      effects: [], localAssetId, assetId: null, fit: 'fill', cropRect: { x: 0, y: 0, w: 1, h: 1 }, mask: null,
    });
    warnings.push('No individual layer pixels were readable, so the PSD composite was opened as one layer.');
  }
  return {
    document: {
      version: 2,
      coordinateSpace: 'local-groups',
      width: psd.width,
      height: psd.height,
      background: 'rgba(0,0,0,0)',
      fontFamilies: [...fonts],
      importWarnings: warnings.map((message) => ({ code: 'LOCAL_PSD_IMPORT', message })),
      layers,
    },
    warnings,
  };
}
