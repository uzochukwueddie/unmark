import type { MaskTool, Point } from '../models/types';

const MASK_COLOR = 'rgba(64, 255, 226, 0.65)';

export class MaskCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tool: MaskTool = 'rect';
  brushSize = 30;
  isDrawing = false;
  lastX = 0;
  lastY = 0;
  startX = 0;
  startY = 0;
  rectPreviewSnapshot: ImageData | null = null;
  undoStack: ImageData[] = [];
  maxUndo = 20;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    this._bindEvents();
  }

  resize(w: number, h: number): void {
    this.canvas.width = w;
    this.canvas.height = h;
    this.clear();
  }

  setTool(tool: MaskTool): void {
    this.tool = tool;
  }

  setBrushSize(px: number): void {
    this.brushSize = Math.max(1, Math.round(px));
  }

  clear(): void {
    this._pushUndo();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getCoveragePercent(): number {
    const { width: w, height: h } = this.canvas;
    if (w === 0 || h === 0) return 0;
    const data = this.ctx.getImageData(0, 0, w, h).data;
    let masked = 0;
    let sampled = 0;
    for (let i = 3; i < data.length; i += 64) {
      sampled++;
      if (data[i] > 16) {
        masked++;
      }
    }
    return sampled > 0 ? (masked / sampled) * 100 : 0;
  }

  undo(): void {
    if (!this.undoStack.length) return;
    const snap = this.undoStack.pop()!;
    this.ctx.putImageData(snap, 0, 0);
  }

  getMaskImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  private _bindEvents(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._onDown(e));
    c.addEventListener('pointermove', (e) => this._onMove(e));
    c.addEventListener('pointerup', (e) => this._onUp(e));
    c.addEventListener('pointerleave', (e) => this._onUp(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private _getCoords(event: PointerEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - r.left) / r.width) * this.canvas.width,
      y: ((event.clientY - r.top) / r.height) * this.canvas.height,
    };
  }

  private _pushUndo(): void {
    if (this.canvas.width === 0 || this.canvas.height === 0) return;
    try {
      const snap = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      this.undoStack.push(snap);
      if (this.undoStack.length > this.maxUndo) {
        this.undoStack.shift();
      }
    } catch (error) {
      console.warn(error);
    }
  }

  private _onDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this._pushUndo();
    this.isDrawing = true;
    const { x, y } = this._getCoords(e);
    this.lastX = x;
    this.lastY = y;
    this.startX = x;
    this.startY = y;

    if (this.tool === 'brush') {
      this._drawCircle(x, y, this.brushSize / 2);
    } else if (this.tool === 'rect') {
      this.rectPreviewSnapshot = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
    }
  }

  private _onMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const { x, y } = this._getCoords(e);
    if (this.tool === 'brush') {
      this._drawLine(this.lastX, this.lastY, x, y, this.brushSize / 2);
      this.lastX = x;
      this.lastY = y;
    } else if (this.tool === 'rect') {
      if (this.rectPreviewSnapshot) {
        this.ctx.putImageData(this.rectPreviewSnapshot, 0, 0);
      }
      this._drawRect(this.startX, this.startY, x, y);
    }
  }

  private _onUp(e: PointerEvent): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.rectPreviewSnapshot = null;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (error) {
      console.warn(error);
    }
  }

  private _drawCircle(x: number, y: number, radius: number): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = MASK_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private _drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
  ): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = MASK_COLOR;
    this.ctx.fillStyle = MASK_COLOR;
    this.ctx.lineWidth = radius * 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  private _drawRect(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = MASK_COLOR;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    this.ctx.fillRect(x, y, w, h);
  }
}

export function maskHasContent(maskImageData: {
  data: Uint8ClampedArray | Uint8Array | null;
}): boolean {
  const data = maskImageData?.data;
  if (!data) return false;

  for (let i = 3; i < data.length; i += 16) {
    if (data[i] > 16) return true;
  }
  return false;
}

export function dilateMask(
  maskImageData: ImageData,
  pixels: number,
): ImageData {
  if (pixels <= 0) return maskImageData;
  const { width: w, height: h } = maskImageData;
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.putImageData(maskImageData, 0, 0);
  // Approximate dilation: scale up the alpha by blurring then re-thresholding
  ctx.filter = `blur(${pixels / 2}px)`;
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';
  const blurred = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < blurred.data.length; i += 4) {
    blurred.data[i] = blurred.data[i] > 32 ? 255 : 0;
  }
  return blurred;
}
