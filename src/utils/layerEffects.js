import * as fabric from 'fabric';

export const EFFECT_DEFAULTS = {
  dropShadow: { type: 'dropShadow', name: 'Drop shadow', enabled: true, color: '#000000', opacity: 0.55, blur: 18, offsetX: 8, offsetY: 8 },
  outerGlow: { type: 'outerGlow', name: 'Outer glow', enabled: true, color: '#C06FEF', opacity: 0.7, blur: 24, offsetX: 0, offsetY: 0 },
  stroke: { type: 'stroke', name: 'Stroke', enabled: true, color: '#111111', opacity: 1, size: 3 },
  colorOverlay: { type: 'colorOverlay', name: 'Colour overlay', enabled: true, color: '#D9B45E', opacity: 1 },
  innerShadow: { type: 'innerShadow', name: 'Inner shadow', enabled: true, color: '#000000', opacity: 0.45, size: 6 },
  gradientOverlay: { type: 'gradientOverlay', name: 'Gradient overlay', enabled: true, from: '#8B5CF6', to: '#D9B45E', opacity: 1, angle: 0 },
  bevelEmboss: { type: 'bevelEmboss', name: 'Bevel & emboss', enabled: true, color: '#FFFFFF', shadowColor: '#000000', opacity: 0.72, shadowOpacity: 0.55, size: 3, angle: 45 },
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

export function normalizeLayerEffects(effects = []) {
  return effects.filter((effect) => EFFECT_DEFAULTS[effect?.type]).map((effect, index) => ({
    id: effect.id || `effect-${effect.type}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    ...EFFECT_DEFAULTS[effect.type], ...effect, enabled: effect.enabled !== false,
  }));
}

export function applyLayerEffectStack(object, effects = []) {
  const stack = normalizeLayerEffects(effects);
  const data = object.get('data') || {};
  const hasVisualStyle = stack.some((effect) => ['stroke', 'colorOverlay', 'innerShadow', 'gradientOverlay', 'bevelEmboss'].includes(effect.type) && effect.enabled);
  const layerEffectBase = data.layerEffectBase || (hasVisualStyle ? {
    fill: snapshotFill(object.fill),
    stroke: object.stroke,
    strokeWidth: object.strokeWidth,
    paintFirst: object.paintFirst,
  } : null);
  object.set('data', { ...data, layerEffects: stack, layerEffectBase, outerGlow: stack.some((effect) => effect.type === 'outerGlow' && effect.enabled) });

  const stroke = [...stack].reverse().find((effect) => effect.type === 'stroke' && effect.enabled);
  const overlay = [...stack].reverse().find((effect) => effect.type === 'colorOverlay' && effect.enabled);
  const gradient = [...stack].reverse().find((effect) => effect.type === 'gradientOverlay' && effect.enabled);
  const innerShadow = [...stack].reverse().find((effect) => effect.type === 'innerShadow' && effect.enabled);
  const bevel = [...stack].reverse().find((effect) => effect.type === 'bevelEmboss' && effect.enabled);
  const shadows = stack.filter((effect) => ['dropShadow', 'outerGlow', 'bevelEmboss'].includes(effect.type) && effect.enabled);
  if (stroke) object.set({ stroke: withAlpha(stroke.color, stroke.opacity), strokeWidth: Math.max(0, Number(stroke.size) || 0), paintFirst: 'stroke' });
  else if (innerShadow) object.set({ stroke: withAlpha(innerShadow.color, innerShadow.opacity), strokeWidth: Math.max(0, Number(innerShadow.size) || 0) * 2, paintFirst: 'fill' });
  else if (bevel) object.set({ stroke: withAlpha(bevel.color, bevel.opacity), strokeWidth: Math.max(0, Number(bevel.size) || 0), paintFirst: 'stroke' });
  else if (layerEffectBase) object.set({ stroke: layerEffectBase.stroke, strokeWidth: layerEffectBase.strokeWidth, paintFirst: layerEffectBase.paintFirst });
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
            blur: effect.type === 'bevelEmboss' ? Math.max(0, Number(effect.size) || 0) * 1.5 : Number(effect.blur) || 0,
            offsetX: effect.type === 'outerGlow' ? 0 : effect.type === 'bevelEmboss' ? Math.cos(Number(effect.angle || 45) * Math.PI / 180) * Number(effect.size || 0) : Number(effect.offsetX) || 0,
            offsetY: effect.type === 'outerGlow' ? 0 : effect.type === 'bevelEmboss' ? Math.sin(Number(effect.angle || 45) * Math.PI / 180) * Number(effect.size || 0) : Number(effect.offsetY) || 0,
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
