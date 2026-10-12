// Batch 8 — undo/redo via the command-pattern snapshot approach: each
// entry is a full serialized canvas state (Fabric's own toJSON, not our
// document schema — cheaper to diff/restore at editing speed, converted to
// the canonical document schema only on Save). Snapshots are pushed on a
// trailing debounce so a drag or a fast typing burst becomes ONE history
// entry, not one per intermediate frame — matching how Photoshop's history
// panel collapses a single drag into one step.
export class HistoryStack {
  // getExtra/setExtra carry document-level state that lives outside the
  // Fabric canvas (e.g. document width/height changed by Canvas Size or
  // Rotate Canvas) so undo restores it together with the layers.
  constructor(canvas, { limit = 100, debounceMs = 400, onChange = null, getExtra = null, setExtra = null } = {}) {
    this.canvas = canvas;
    this.getExtra = getExtra;
    this.setExtra = setExtra;
    this.limit = limit;
    this.debounceMs = debounceMs;
    this.stack = [];
    this.pointer = -1; // index of the currently-applied state
    this._suspended = false;
    this._timer = null;
    this.onChange = onChange;
  }

  get canUndo() { return this.pointer > 0; }
  get canRedo() { return this.pointer < this.stack.length - 1; }

  /** Call once after the initial document load so undo can't go "past the start". */
  init() {
    this.stack = [this._snapshot()];
    this.pointer = 0;
    this.onChange?.();
  }

  /** Wire to canvas modification events. Call once during setup. */
  attach() {
    const push = () => this.pushDebounced();
    this.canvas.on('object:modified', push);
    this.canvas.on('object:added', push);
    this.canvas.on('object:removed', push);
    this._detach = () => {
      this.canvas.off('object:modified', push);
      this.canvas.off('object:added', push);
      this.canvas.off('object:removed', push);
    };
  }
  detach() { this._detach?.(); clearTimeout(this._timer); }

  _snapshot() {
    const canvasState = this.canvas.toObject(['data']);
    return JSON.stringify(this.getExtra ? { canvas: canvasState, extra: this.getExtra() } : canvasState);
  }

  pushDebounced() {
    if (this._suspended) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.pushNow(), this.debounceMs);
  }

  pushNow() {
    if (this._suspended) return;
    const snap = this._snapshot();
    if (snap === this.stack[this.pointer]) return; // no real change
    // Discard any redo branch — a new edit after undoing invalidates it,
    // same as every editor's history model.
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snap);
    if (this.stack.length > this.limit) this.stack.shift();
    this.pointer = this.stack.length - 1;
    this.onChange?.();
  }

  async _restore(index) {
    this._suspended = true; // loading JSON fires object:added per object — don't let that re-push
    const state = JSON.parse(this.stack[index]);
    const withExtra = this.getExtra && state && state.canvas && 'extra' in state;
    await this.canvas.loadFromJSON(withExtra ? state.canvas : state);
    if (withExtra) this.setExtra?.(state.extra);
    this.canvas.renderAll();
    this._suspended = false;
  }

  async undo() {
    if (!this.canUndo) return;
    this.pointer -= 1;
    await this._restore(this.pointer);
    this.onChange?.();
  }

  async redo() {
    if (!this.canRedo) return;
    this.pointer += 1;
    await this._restore(this.pointer);
    this.onChange?.();
  }
}
