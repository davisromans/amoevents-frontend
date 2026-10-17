import * as fabric from 'fabric';

export const EFFECT_DEFAULTS = {
  dropShadow: { type: 'dropShadow', name: 'Drop shadow', enabled: true, color: '#000000', opacity: 0.55, blur: 18, offsetX: 8, offsetY: 8 },
  outerGlow: { type: 'outerGlow', name: 'Outer glow', enabled: true, color: '#C06FEF', opacity: 0.7, blur: 24, offsetX: 0, offsetY: 0 },
  stroke: {
    type: 'stroke', name: 'Stroke', enabled: true, fillType: 'color', color: '#111111', opacity: 1, size: 3,
    from: '#8B5CF6', to: '#D9B45E', angle: 0,
    patternKind: 'diagonal', patternColor: '#111111', patternBackground: '#FFFFFF', patternScale: 1,
  },
  colorOverlay: { type: 'colorOverlay', name: 'Colour overlay', enabled: true, color: '#D9B45E', opacity: 1 },
  innerShadow: { type: 'innerShadow', name: 'Inner shadow', enabled: true, color: '#000000', opacity: 0.45, size: 6 },
  innerGlow: { type: 'innerGlow', name: 'Inner glow', enabled: true, color: '#FDE68A', opacity: 0.65, size: 8 },
  gradientOverlay: { type: 'gradientOverlay', name: 'Gradient overlay', enabled: true, from: '#8B5CF6', to: '#D9B45E', opacity: 1, angle: 0 },
  bevelEmboss: { type: 'bevelEmboss', name: 'Bevel & emboss', enabled: true, color: '#FFFFFF', shadowColor: '#000000', opacity: 0.72, shadowOpacity: 0.55, size: 3, angle: 45 },
  satin: { type: 'satin', name: 'Satin', enabled: true, color: '#000000', opacity: 0.35, size: 8, distance: 8, angle: 20 },
};

function withAlpha(color, opacity = 1) {
  if (String(color).startsWith('rgba')) return color;
  const value = String(color || '#000000').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return color;
  return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${Math.max(0, Math.min(1, opacity))})`;
}

function blendSolidColour(base, overlay, opacity = 1) {
  if (typeof base !== 'string') return withAlpha(overlay, opacity);
  try {
    const a = new fabric.Color(base).getSource(), b = new fabric.Color(overlay).getSource();
    const mix = Math.max(0, Math.min(1, Number(opacity ?? 1)));
    const channels = [0, 1, 2].map((index) => Math.round(a[index] * (1 - mix) + b[index] * mix));
    return `rgba(${channels[0]},${channels[1]},${channels[2]},${a[3] ?? 1})`;
  } catch { return withAlpha(overlay, opacity); }
}

function snapshotFill(fill) {
  if (fill && typeof fill.toObject === 'function' && fill.type && fill.colorStops) {
    return { kind: 'fabricGradient', ...fill.toObject() };
  }
  return fill;
}

function restoreFill(fill) {
  if (fill?.kind === 'fabricGradient') {
    const { kind, ...options } = fill;
    return new fabric.Gradient(options);
  }
  return fill;
}

function linearGradientForObject(object, effect) {
  const radians = Number(effect.angle || 0) * Math.PI / 180;
  const width = Math.max(1, Number(object.width) || 1), height = Math.max(1, Number(object.height) || 1);
  const distance = Math.abs(Math.cos(radians)) * width / 2 + Math.abs(Math.sin(radians)) * height / 2;
  return new fabric.Gradient({
    type: 'linear', gradientUnits: 'pixels',
    coords: {
      x1: width / 2 - Math.cos(radians) * distance, y1: height / 2 - Math.sin(radians) * distance,
      x2: width / 2 + Math.cos(radians) * distance, y2: height / 2 + Math.sin(radians) * distance,
    },
    colorStops: [{ offset: 0, color: withAlpha(effect.from, effect.opacity) }, { offset: 1, color: withAlpha(effect.to, effect.opacity) }],
  });
}

function patternStroke(effect) {
  const scale = Math.max(0.25, Math.min(8, Number(effect.patternScale) || 1));
  if (effect.patternTile?.encoding === 'rgba-base64' && effect.patternTile.width && effect.patternTile.height) {
    const binary = atob(effect.patternTile.data || '');
    const bytes = new Uint8ClampedArray(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const source = window.document.createElement('canvas'); source.width = effect.patternTile.width; source.height = effect.patternTile.height;
    source.getContext('2d').putImageData(new ImageData(bytes, source.width, source.height), 0, 0);
    const scaled = window.document.createElement('canvas'); scaled.width = Math.max(1, Math.round(source.width * scale)); scaled.height = Math.max(1, Math.round(source.height * scale));
    scaled.getContext('2d').drawImage(source, 0, 0, scaled.width, scaled.height);
    return new fabric.Pattern({ source: scaled, repeat: 'repeat' });
  }
  const size = Math.max(4, Math.round(12 * scale));
  const canvas = window.document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = withAlpha(effect.patternBackground || '#FFFFFF', effect.opacity); ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = withAlpha(effect.patternColor || effect.color || '#111111', effect.opacity);
  if (effect.patternKind === 'dots') {
    ctx.beginPath(); ctx.arc(size / 2, size / 2, Math.max(1, size * 0.22), 0, Math.PI * 2); ctx.fill();
  } else if (effect.patternKind === 'checker') {
    const half = size / 2; ctx.fillRect(0, 0, half, half); ctx.fillRect(half, half, half, half);
  } else {
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, size * 0.25);
    ctx.beginPath(); ctx.moveTo(-size * 0.25, size); ctx.lineTo(size, -size * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * 0.75, size * 1.25); ctx.lineTo(size * 1.25, size * 0.75); ctx.stroke();
  }
  return new fabric.Pattern({ source: canvas, repeat: 'repeat' });
}

function strokePaint(object, effect) {
  if (effect.fillType === 'gradient') return linearGradientForObject(object, effect);
  if (effect.fillType === 'pattern') return patternStroke(effect);
  return withAlpha(effect.color, effect.opacity);
}

export function normalizeLayerEffects(effects = []) {
  return effects.filter((effect) => EFFECT_DEFAULTS[effect?.type]).map((effect, index) => ({
    id: effect.id || `effect-${effect.type}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    ...EFFECT_DEFAULTS[effect.type], ...effect, enabled: effect.enabled !== false,
  }));
}

export function applyLayerEffectStack(object, effects = []) {
  const stack = normalizeLayerEffects(effects);
  const data = object.get('data') || {};
  const hasVisualStyle = stack.some((effect) => ['stroke', 'colorOverlay', 'innerShadow', 'innerGlow', 'gradientOverlay', 'bevelEmboss'].includes(effect.type) && effect.enabled);
  const layerEffectBase = data.layerEffectBase || (hasVisualStyle ? {
    fill: snapshotFill(object.fill),
    stroke: snapshotFill(object.stroke),
    strokeWidth: object.strokeWidth,
    paintFirst: object.paintFirst,
  } : null);
  object.set('data', { ...data, layerEffects: stack, layerEffectBase, outerGlow: stack.some((effect) => effect.type === 'outerGlow' && effect.enabled) });

  const stroke = [...stack].reverse().find((effect) => effect.type === 'stroke' && effect.enabled);
  const overlay = [...stack].reverse().find((effect) => effect.type === 'colorOverlay' && effect.enabled);
  const gradient = [...stack].reverse().find((effect) => effect.type === 'gradientOverlay' && effect.enabled);
  const innerShadow = [...stack].reverse().find((effect) => effect.type === 'innerShadow' && effect.enabled);
  const innerGlow = [...stack].reverse().find((effect) => effect.type === 'innerGlow' && effect.enabled);
  const bevel = [...stack].reverse().find((effect) => effect.type === 'bevelEmboss' && effect.enabled);
  const shadows = stack.filter((effect) => ['dropShadow', 'outerGlow', 'bevelEmboss', 'satin'].includes(effect.type) && effect.enabled);
  if (stroke) object.set({ stroke: strokePaint(object, stroke), strokeWidth: Math.max(0, Number(stroke.size) || 0), paintFirst: 'stroke' });
  else if (innerShadow) object.set({ stroke: withAlpha(innerShadow.color, innerShadow.opacity), strokeWidth: Math.max(0, Number(innerShadow.size) || 0) * 2, paintFirst: 'fill' });
  else if (innerGlow) object.set({ stroke: withAlpha(innerGlow.color, innerGlow.opacity), strokeWidth: Math.max(0, Number(innerGlow.size) || 0) * 2, paintFirst: 'fill' });
  else if (bevel) object.set({ stroke: withAlpha(bevel.color, bevel.opacity), strokeWidth: Math.max(0, Number(bevel.size) || 0), paintFirst: 'stroke' });
  else if (layerEffectBase) object.set({ stroke: restoreFill(layerEffectBase.stroke), strokeWidth: layerEffectBase.strokeWidth, paintFirst: layerEffectBase.paintFirst });
  if (['rect', 'ellipse', 'path', 'textbox', 'text', 'i-text'].includes(object.type)) {
    if (gradient) {
      const radians = Number(gradient.angle || 0) * Math.PI / 180;
      const width = Math.max(1, Number(object.width) || 1), height = Math.max(1, Number(object.height) || 1);
      const distance = Math.abs(Math.cos(radians)) * width / 2 + Math.abs(Math.sin(radians)) * height / 2;
      const baseFill = restoreFill(layerEffectBase?.fill);
      object.set('fill', new fabric.Gradient({
        type: 'linear', gradientUnits: 'pixels',
        coords: {
          x1: width / 2 - Math.cos(radians) * distance, y1: height / 2 - Math.sin(radians) * distance,
          x2: width / 2 + Math.cos(radians) * distance, y2: height / 2 + Math.sin(radians) * distance,
        },
        colorStops: [{ offset: 0, color: blendSolidColour(baseFill, gradient.from, gradient.opacity) }, { offset: 1, color: blendSolidColour(baseFill, gradient.to, gradient.opacity) }],
      }));
    } else if (overlay) object.set('fill', withAlpha(overlay.color, overlay.opacity));
    else if (layerEffectBase) object.set('fill', restoreFill(layerEffectBase.fill));
  }

  object.__amoEffectStack = shadows;
  if (!object.__amoBaseRender) {
    object.__amoBaseRender = object.render;
    object.render = function renderWithLayerEffects(ctx) {
      const baseRender = this.__amoBaseRender;
      const originalShadow = this.shadow;
      const active = this.__amoEffectStack || [];
      try {
        for (const effect of active) {
          this.shadow = new fabric.Shadow({
            color: withAlpha(effect.type === 'bevelEmboss' ? effect.shadowColor : effect.color, effect.type === 'bevelEmboss' ? effect.shadowOpacity : effect.opacity),
            blur: ['bevelEmboss', 'satin'].includes(effect.type) ? Math.max(0, Number(effect.size) || 0) * 1.5 : Number(effect.blur) || 0,
            offsetX: effect.type === 'outerGlow' ? 0 : effect.type === 'bevelEmboss' ? Math.cos(Number(effect.angle || 45) * Math.PI / 180) * Number(effect.size || 0) : effect.type === 'satin' ? Math.cos(Number(effect.angle || 20) * Math.PI / 180) * Number(effect.distance || 0) : Number(effect.offsetX) || 0,
            offsetY: effect.type === 'outerGlow' ? 0 : effect.type === 'bevelEmboss' ? Math.sin(Number(effect.angle || 45) * Math.PI / 180) * Number(effect.size || 0) : effect.type === 'satin' ? Math.sin(Number(effect.angle || 20) * Math.PI / 180) * Number(effect.distance || 0) : Number(effect.offsetY) || 0,
          });
          baseRender.call(this, ctx);
        }
        this.shadow = null;
        baseRender.call(this, ctx);
      } finally {
        this.shadow = originalShadow;
      }
    };
  }
  object.shadow = null;
  object.dirty = true;
  return stack;
}
