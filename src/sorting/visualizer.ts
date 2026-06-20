import type { BarColor } from "../types";

const COLORS: Record<BarColor, string> = {
  default: "#3498db",
  comparing: "#f1c40f",
  swapping: "#e74c3c",
  sorted: "#2ecc71",
};

const BG_COLOR = "#16213e";
const GRID_COLOR = "rgba(255,255,255,0.03)";

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _width = 0;
  private _height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  /** Handle canvas resize */
  resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._width = rect.width;
    this._height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  /** Draw the full visualization */
  draw(
    array: number[],
    colors: BarColor[],
    maxVal: number
  ): void {
    const ctx = this.ctx;
    const w = this._width;
    const h = this._height;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    const n = array.length;
    if (n === 0) return;

    // Bar dimensions
    const gap = n > 100 ? 1 : 2;
    const barWidth = (w - (n - 1) * gap) / n;
    const usableHeight = h - 20; // bottom padding

    // Draw grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw bars
    for (let i = 0; i < n; i++) {
      const barHeight = (array[i] / maxVal) * usableHeight;
      const x = i * (barWidth + gap);
      const y = h - 10 - barHeight;

      // Bar color
      ctx.fillStyle = COLORS[colors[i]] || COLORS.default;

      // Rounded top for bars
      const r = Math.min(barWidth * 0.3, 3);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, h - 10);
      ctx.lineTo(x, h - 10);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // Subtle glow for active bars
      if (colors[i] === "comparing" || colors[i] === "swapping") {
        ctx.shadowColor = COLORS[colors[i]];
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw baseline
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 10);
    ctx.lineTo(w, h - 10);
    ctx.stroke();
  }

  /** Build color array from a SortStep */
  buildColors(array: number[], step: {
    indices: number[];
    comparing: boolean;
    swapping: boolean;
    sorted: boolean;
  }): BarColor[] {
    const colors: BarColor[] = new Array(array.length).fill("default");

    if (step.sorted) {
      for (const idx of step.indices) {
        if (idx >= 0 && idx < colors.length) {
          colors[idx] = "sorted";
        }
      }
    } else if (step.swapping) {
      for (const idx of step.indices) {
        if (idx >= 0 && idx < colors.length) {
          colors[idx] = "swapping";
        }
      }
    } else if (step.comparing) {
      for (const idx of step.indices) {
        if (idx >= 0 && idx < colors.length) {
          colors[idx] = "comparing";
        }
      }
    }

    return colors;
  }

  /** Clear the canvas */
  clear(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this._width, this._height);
  }
}
