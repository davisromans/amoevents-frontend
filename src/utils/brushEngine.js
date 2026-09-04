import * as fabric from 'fabric';

// Batch 17 — painting engine. Fabric's own PencilBrush already does
// real stroke smoothing (bezier-fit through the recorded points, not raw
// polyline) — this module builds the preset/eraser layer on top of that
// rather than reinventing stroke capture from scratch, which would just
// be a worse version of what Fabric already does well.

/** A soft round brush — shadow blur simulates a feathered edge Fabric's own PencilBrush doesn't have natively. */
export class SoftBrush extends fabric.PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.shadow = new fabric.Shadow({ blur: 0, color: 'rgba(0,0,0,1)', offsetX: 0, offsetY: 0 });
  }
  _setBrushStyles(ctx) {
    super._setBrushStyles(ctx);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
}

/** A textured brush — reuses Fabric's built-in spray-can dot pattern for a grainy stroke, useful for chalk/texture effects on cards. */
export class TexturedBrush extends fabric.SprayBrush {
  constructor(canvas) {
    super(canvas);
    this.density = 24;
    this.dotWidth = 2;
    this.dotWidthVariance = 2;
  }
}

/**
 * A real eraser — Fabric has no built-in eraser brush; this one paints
 * with `destination-out` compositing so strokes actually punch alpha
 * holes in whatever's underneath, rather than drawing white/background-
 * colored strokes on top (which only looks like erasing until something
 * moves behind it).
 */
export class EraserBrush extends fabric.PencilBrush {
  _saveAndTransform(ctx) {
    super._saveAndTransform(ctx);
    ctx.globalCompositeOperation = 'destination-out';
  }
}

export const BRUSH_PRESETS = [
  { id: 'soft', label: 'Soft round', make: (canvas) => new SoftBrush(canvas) },
  { id: 'hard', label: 'Hard round', make: (canvas) => new fabric.PencilBrush(canvas) },
  { id: 'textured', label: 'Textured', make: (canvas) => new TexturedBrush(canvas) },
  { id: 'eraser', label: 'Eraser', make: (canvas) => new EraserBrush(canvas) },
];

/**
 * Enters free-draw mode with the given preset + settings. Painted strokes
 * land as their own Fabric path objects on the canvas — same as any other
 * layer, so they get undo/redo, opacity, blend modes, and reordering for
 * free from everything already built.
 */
export function activateBrush(canvas, presetId, { color = '#111827', width = 12, opacity = 1, hardness = 0.7 } = {}) {
  const preset = BRUSH_PRESETS.find((p) => p.id === presetId) || BRUSH_PRESETS[0];
  const brush = preset.make(canvas);
  brush.color = presetId === 'eraser' ? 'rgba(0,0,0,1)' : color;
  brush.width = width;
  // Hardness was previously a dead setting — SoftBrush's shadow blur was
  // hardcoded to 0, so "soft" never actually softened anything. Lower
  // hardness now blurs the stroke edge proportionally to the brush size.
  if (brush.shadow) brush.shadow.blur = (1 - hardness) * width * 0.5;
  canvas.freeDrawingBrush = brush;
  canvas.isDrawingMode = true;
  canvas._lastBrushOpacity = opacity;
}

export function deactivateBrush(canvas) {
  canvas.isDrawingMode = false;
}
