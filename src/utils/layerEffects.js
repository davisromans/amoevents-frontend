import * as fabric from 'fabric';

export const EFFECT_DEFAULTS = {
  dropShadow: { type: 'dropShadow', name: 'Drop shadow', enabled: true, color: '#000000', opacity: 0.55, blur: 18, offsetX: 8, offsetY: 8 },
  outerGlow: { type: 'outerGlow', name: 'Outer glow', enabled: true, color: '#C06FEF', opacity: 0.7, blur: 24, offsetX: 0, offsetY: 0 },
  stroke: { type: 'stroke', name: 'Stroke', enabled: true, color: '#111111', opacity: 1, size: 3 },
  colorOverlay: { type: 'colorOverlay', name: 'Colour overlay', enabled: true, color: '#D9B45E', opacity: 1 },
};

function withAlpha(color, opacity = 1) {
  if (String(color).startsWith('rgba')) return color;
  const value = String(color || '#000000').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return color;
  return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${Math.max(0, Math.min(1, opacity))})`;
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
  const hasVisualStyle = stack.some((effect) => ['stroke', 'colorOverlay'].includes(effect.type) && effect.enabled);
  const layerEffectBase = data.layerEffectBase || (hasVisualStyle ? {
    fill: object.fill,
    stroke: object.stroke,
    strokeWidth: object.strokeWidth,
    paintFirst: object.paintFirst,
  } : null);
  object.set('data', { ...data, layerEffects: stack, layerEffectBase, outerGlow: stack.some((effect) => effect.type === 'outerGlow' && effect.enabled) });

  const stroke = [...stack].reverse().find((effect) => effect.type === 'stroke' && effect.enabled);
  const overlay = [...stack].reverse().find((effect) => effect.type === 'colorOverlay' && effect.enabled);
  const shadows = stack.filter((effect) => ['dropShadow', 'outerGlow'].includes(effect.type) && effect.enabled);
  if (stroke) object.set({ stroke: withAlpha(stroke.color, stroke.opacity), strokeWidth: Math.max(0, Number(stroke.size) || 0), paintFirst: 'stroke' });
  else if (layerEffectBase) object.set({ stroke: layerEffectBase.stroke, strokeWidth: layerEffectBase.strokeWidth, paintFirst: layerEffectBase.paintFirst });
  if (['rect', 'ellipse', 'path', 'textbox', 'text', 'i-text'].includes(object.type)) {
    if (overlay) object.set('fill', withAlpha(overlay.color, overlay.opacity));
    else if (layerEffectBase) object.set('fill', layerEffectBase.fill);
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
            color: withAlpha(effect.color, effect.opacity), blur: Number(effect.blur) || 0,
            offsetX: effect.type === 'outerGlow' ? 0 : Number(effect.offsetX) || 0,
            offsetY: effect.type === 'outerGlow' ? 0 : Number(effect.offsetY) || 0,
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
