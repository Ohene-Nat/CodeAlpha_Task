// A minimal shared whiteboard. Strokes are sent as short line *segments*
// (not whole paths) so remote peers can draw them incrementally in real
// time as the sender moves their pointer, and late joiners can replay the
// full history the server hands back on join.
//
// Points are stored normalized (0..1) relative to canvas size so the
// drawing lines up correctly even if participants have different window
// sizes.

class Whiteboard {
  constructor(canvas, { onLocalSegment } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onLocalSegment = onLocalSegment || (() => {});
    this.drawing = false;
    this.last = null;
    this.color = '#111318';
    this.size = 3;
    this.eraser = false;

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();

    canvas.addEventListener('pointerdown', (e) => this._start(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', () => this._end());
    canvas.addEventListener('pointerleave', () => this._end());
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, rect.width * dpr);
    this.canvas.height = Math.max(1, rect.height * dpr);
    this.ctx.scale(dpr, dpr);
    this._cssWidth = rect.width;
    this._cssHeight = rect.height;
  }

  _toNormalized(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  _start(e) {
    this.drawing = true;
    this.last = this._toNormalized(e);
  }

  _move(e) {
    if (!this.drawing) return;
    const point = this._toNormalized(e);
    const segment = {
      x0: this.last.x,
      y0: this.last.y,
      x1: point.x,
      y1: point.y,
      color: this.color,
      size: this.size,
      eraser: this.eraser,
    };
    this._drawSegment(segment);
    this.onLocalSegment(segment);
    this.last = point;
  }

  _end() {
    this.drawing = false;
    this.last = null;
  }

  _drawSegment(seg) {
    const w = this._cssWidth || this.canvas.clientWidth;
    const h = this._cssHeight || this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(seg.x0 * w, seg.y0 * h);
    ctx.lineTo(seg.x1 * w, seg.y1 * h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = seg.eraser ? seg.size * 4 : seg.size;
    ctx.strokeStyle = seg.eraser ? '#ffffff' : seg.color;
    ctx.stroke();
  }

  // Called when a segment arrives from another participant.
  applyRemoteSegment(seg) {
    this._drawSegment(seg);
  }

  // Replay full history handed back by the server on join.
  replayHistory(segments) {
    segments.forEach((seg) => this._drawSegment(seg));
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setColor(hex) {
    this.color = hex;
    this.eraser = false;
  }

  setSize(px) {
    this.size = Number(px);
  }

  setEraser(on) {
    this.eraser = on;
  }
}
