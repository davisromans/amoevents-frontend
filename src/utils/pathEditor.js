import * as fabric from 'fabric';

const ENDPOINTS = { M: [1, 2], L: [1, 2], C: [5, 6], Q: [3, 4] };
const CONTROL_POINTS = { C: [[1, 2], [3, 4]], Q: [[1, 2]] };

export class PathEditor {
  constructor(canvas, path, { onCommit } = {}) {
    this.canvas = canvas;
    this.path = path;
    this.onCommit = onCommit;
    this.controls = [];
    this.original = { selectable: path.selectable, evented: path.evented, hasControls: path.hasControls };
  }

  start() {
    this.path.set({ selectable: false, evented: false, hasControls: false });
    this._rebuild();
  }

  _scenePoint(command, indexes) {
    const local = new fabric.Point(command[indexes[0]] - this.path.pathOffset.x, command[indexes[1]] - this.path.pathOffset.y);
    return fabric.util.transformPoint(local, this.path.calcTransformMatrix());
  }

  _setCommandPoint(commandIndex, indexes, scene) {
    const inverse = fabric.util.invertTransform(this.path.calcTransformMatrix());
    const local = fabric.util.transformPoint(scene, inverse);
    const command = this.path.path[commandIndex];
    command[indexes[0]] = local.x + this.path.pathOffset.x;
    command[indexes[1]] = local.y + this.path.pathOffset.y;
    this.path.set({ path: this.path.path.map((entry) => [...entry]), dirty: true });
    this.path.setCoords();
  }

  _addControl(commandIndex, indexes, kind) {
    const point = this._scenePoint(this.path.path[commandIndex], indexes);
    const control = new fabric.Circle({
      left: point.x, top: point.y, radius: kind === 'anchor' ? 5 : 4,
      originX: 'center', originY: 'center', fill: kind === 'anchor' ? '#FFFFFF' : '#C06FEF',
      stroke: '#7C3AED', strokeWidth: 1.5, hasControls: false, hasBorders: false,
      lockScalingX: true, lockScalingY: true, lockRotation: true, excludeFromExport: true,
      data: { pathEditorControl: true },
    });
    control.on('moving', () => {
      this._setCommandPoint(commandIndex, indexes, new fabric.Point(control.left, control.top));
      this.canvas.requestRenderAll();
    });
    control.on('modified', () => this.onCommit?.(this.path));
    this.canvas.add(control);
    this.controls.push(control);
  }

  _rebuild() {
    this.controls.forEach((control) => this.canvas.remove(control));
    this.controls = [];
    this.path.path.forEach((command, index) => {
      const type = String(command[0]).toUpperCase();
      for (const indexes of CONTROL_POINTS[type] || []) this._addControl(index, indexes, 'handle');
      if (ENDPOINTS[type]) this._addControl(index, ENDPOINTS[type], 'anchor');
    });
    this.canvas.requestRenderAll();
  }

  stop({ commit = true } = {}) {
    this.controls.forEach((control) => this.canvas.remove(control));
    this.controls = [];
    this.path.set(this.original);
    this.path.setCoords();
    this.canvas.setActiveObject(this.path);
    this.canvas.requestRenderAll();
    if (commit) this.onCommit?.(this.path);
  }
}
