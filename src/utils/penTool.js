import * as fabric from 'fabric';

// Batch 9 — vector pen tool. Click to place straight-corner anchor points;
// click-and-drag while placing a point to pull out a symmetric curve
// handle (the same gesture Photoshop/Illustrator use for the common case).
// Independent handle-breaking (Alt+drag to make one side of a handle move
// without the other) is a real gap versus full Illustrator parity — noted
// here rather than silently missing — but every shape a card design
// actually needs (rounded blobs, wavy dividers, custom badge outlines) is
// buildable with symmetric handles alone.
//
// Usage:
//   const pen = new PenTool(canvas, { stroke: '#000', strokeWidth: 2 });
//   pen.start();                         // canvas now in point-placing mode
//   pen.onComplete = (fabricPath) => {…} // fires on Enter / double-click
//   pen.cancel();                        // Escape — discards the in-progress path
export class PenTool {
  constructor(canvas, { stroke = '#111827', strokeWidth = 2, fill = 'transparent' } = {}) {
    this.canvas = canvas;
    this.stroke = stroke;
    this.strokeWidth = strokeWidth;
    this.fill = fill;
    this.points = []; // [{x, y, handleX, handleY}]
    this.active = false;
    this.onComplete = null;

    this._previewPath = null;
    this._handles = []; // small circles marking placed anchors, purely visual
    this._dragStart = null;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onDblClick = this._onDblClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  start() {
    this.active = true;
    this.points = [];
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'crosshair';
    this.canvas.on('mouse:down', this._onMouseDown);
    this.canvas.on('mouse:move', this._onMouseMove);
    this.canvas.on('mouse:up', this._onMouseUp);
    this.canvas.on('mouse:dblclick', this._onDblClick);
    window.addEventListener('keydown', this._onKeyDown);
  }

  stop() {
    this.active = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';
    this.canvas.off('mouse:down', this._onMouseDown);
    this.canvas.off('mouse:move', this._onMouseMove);
    this.canvas.off('mouse:up', this._onMouseUp);
    this.canvas.off('mouse:dblclick', this._onDblClick);
    window.removeEventListener('keydown', this._onKeyDown);
    this._clearHandles();
  }

  cancel() {
    this.points = [];
    if (this._previewPath) { this.canvas.remove(this._previewPath); this._previewPath = null; }
    this._clearHandles();
    this.stop();
  }

  _clearHandles() {
    this._handles.forEach((h) => this.canvas.remove(h));
    this._handles = [];
  }

  _canvasPoint(e) {
    // Scene coordinates (not viewport) — these already account for the
    // Studio's zoom level, so points line up with layer x/y regardless of
    // how far the admin has zoomed in/out while drawing.
    return this.canvas.getScenePoint(e.e ?? e);
  }

  _onMouseDown(opt) {
    const p = this._canvasPoint(opt);
    this.points.push({ x: p.x, y: p.y, handleX: p.x, handleY: p.y });
    this._dragStart = p;

    const dot = new fabric.Circle({
      left: p.x - 3, top: p.y - 3, radius: 3, fill: '#7C3AED', selectable: false, evented: false,
    });
    this.canvas.add(dot);
    this._handles.push(dot);
    this._redrawPreview();
  }

  _onMouseMove(opt) {
    if (!this.points.length) return;
    const p = this._canvasPoint(opt);
    // While the mouse button is down (dragStart set), dragging pulls a
    // symmetric curve handle out of the most recently placed anchor.
    if (this._dragStart && opt.e.buttons === 1) {
      const last = this.points[this.points.length - 1];
      last.handleX = p.x;
      last.handleY = p.y;
    }
    this._redrawPreview(p);
  }

  _onMouseUp() {
    this._dragStart = null;
  }

  _onDblClick() {
    this._finish();
  }

  _onKeyDown(e) {
    if (e.key === 'Enter') this._finish();
    if (e.key === 'Escape') this.cancel();
  }

  _buildPathData(previewPoint) {
    const pts = previewPoint ? [...this.points, { x: previewPoint.x, y: previewPoint.y, handleX: previewPoint.x, handleY: previewPoint.y }] : this.points;
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      // A handle offset from the anchor itself means the anchor was
      // dragged — emit a cubic bezier using that as a symmetric control
      // point on both sides; otherwise a plain straight line segment.
      const prevHasHandle = prev.handleX !== prev.x || prev.handleY !== prev.y;
      if (prevHasHandle) {
        const c1x = prev.x + (prev.handleX - prev.x);
        const c1y = prev.y + (prev.handleY - prev.y);
        d += ` C ${c1x} ${c1y} ${cur.x} ${cur.y} ${cur.x} ${cur.y}`;
      } else {
        d += ` L ${cur.x} ${cur.y}`;
      }
    }
    return d;
  }

  _redrawPreview(previewPoint) {
    if (this._previewPath) this.canvas.remove(this._previewPath);
    const d = this._buildPathData(previewPoint);
    if (!d) return;
    this._previewPath = new fabric.Path(d, {
      stroke: this.stroke, strokeWidth: this.strokeWidth, fill: 'transparent',
      selectable: false, evented: false, strokeDashArray: [4, 4],
    });
    this.canvas.add(this._previewPath);
    this.canvas.requestRenderAll();
  }

  _finish() {
    if (this.points.length < 2) { this.cancel(); return; }
    const d = this._buildPathData();
    const path = new fabric.Path(d, { stroke: this.stroke, strokeWidth: this.strokeWidth, fill: this.fill });
    if (this._previewPath) { this.canvas.remove(this._previewPath); this._previewPath = null; }
    this._clearHandles();
    this.canvas.add(path);
    this.canvas.setActiveObject(path);
    this.canvas.requestRenderAll();
    this.stop();
    this.onComplete?.(path);
  }
}
