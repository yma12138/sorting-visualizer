import { ALGORITHMS } from "./sorting/algorithms";
import { Visualizer } from "./sorting/visualizer";
import type { AlgorithmName, BarColor } from "./types";

export class Controller {
  // DOM refs
  private select: HTMLSelectElement;
  private sizeSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private sizeLabel: HTMLSpanElement;
  private speedLabel: HTMLSpanElement;
  private generateBtn: HTMLButtonElement;
  private sortBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private algoNameEl: HTMLSpanElement;
  private comparisonsEl: HTMLSpanElement;
  private swapsEl: HTMLSpanElement;
  private timeEl: HTMLSpanElement;
  private statusEl: HTMLSpanElement;

  private visualizer: Visualizer;

  // State
  private array: number[] = [];
  private sortedColors: boolean[] = [];
  private isRunning = false;
  private maxVal = 100;

  // Stats
  private comparisons = 0;
  private swaps = 0;
  private startTime = 0;

  // Abort
  private abortController: AbortController | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.visualizer = new Visualizer(canvas);

    this.select = document.getElementById("algorithm-select") as HTMLSelectElement;
    this.sizeSlider = document.getElementById("size-slider") as HTMLInputElement;
    this.speedSlider = document.getElementById("speed-slider") as HTMLInputElement;
    this.sizeLabel = document.getElementById("size-label") as HTMLSpanElement;
    this.speedLabel = document.getElementById("speed-label") as HTMLSpanElement;
    this.generateBtn = document.getElementById("generate-btn") as HTMLButtonElement;
    this.sortBtn = document.getElementById("sort-btn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
    this.algoNameEl = document.getElementById("algo-name") as HTMLSpanElement;
    this.comparisonsEl = document.getElementById("comparisons") as HTMLSpanElement;
    this.swapsEl = document.getElementById("swaps") as HTMLSpanElement;
    this.timeEl = document.getElementById("time-elapsed") as HTMLSpanElement;
    this.statusEl = document.getElementById("status") as HTMLSpanElement;

    this.bindEvents();
    this.handleResize();
    this.generateArray();
  }

  private bindEvents(): void {
    // Window resize
    window.addEventListener("resize", () => this.handleResize());

    // Sliders
    this.sizeSlider.addEventListener("input", () => {
      this.sizeLabel.textContent = this.sizeSlider.value;
      if (!this.isRunning) this.generateArray();
    });
    this.speedSlider.addEventListener("input", () => {
      this.speedLabel.textContent = this.speedSlider.value;
    });

    // Buttons
    this.generateBtn.addEventListener("click", () => this.generateArray());
    this.sortBtn.addEventListener("click", () => this.startSort());
    this.stopBtn.addEventListener("click", () => this.stopSort());

    // Algorithm select
    this.select.addEventListener("change", () => {
      const meta = ALGORITHMS[this.select.value as AlgorithmName];
      if (meta) this.algoNameEl.textContent = meta.name;
    });
  }

  private handleResize(): void {
    this.visualizer.resize();
    if (this.array.length > 0) {
      this.render();
    }
  }

  /** Generate a new random array */
  generateArray(): void {
    if (this.isRunning) return;

    const size = parseInt(this.sizeSlider.value);
    this.maxVal = 100;
    this.array = [];
    this.sortedColors = new Array(size).fill(false);

    for (let i = 0; i < size; i++) {
      this.array.push(Math.floor(Math.random() * 85) + 10);
    }

    this.comparisons = 0;
    this.swaps = 0;
    this.startTime = 0;

    this.updateStats();
    this.render();
    this.setStatus("idle", "就绪");
  }

  /** Compute delay from speed slider (1-100 → 500ms-1ms) */
  private getDelay(): number {
    const speed = parseInt(this.speedSlider.value);
    // Inverse: higher speed = shorter delay
    // Speed 1 → 200ms, Speed 50 → 10ms, Speed 100 → 1ms
    return Math.max(1, Math.round(200 * Math.pow(0.94, speed)));
  }

  /** Render current array state */
  private render(): void {
    const colors: BarColor[] = this.array.map((_, i) =>
      this.sortedColors[i] ? "sorted" : "default"
    );
    this.visualizer.draw(this.array, colors, this.maxVal);
  }

  /** Main sort loop */
  async startSort(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Disable controls
    this.setControlsDisabled(true);
    this.sortBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.setStatus("running", "运行中...");

    // Reset stats
    this.comparisons = 0;
    this.swaps = 0;
    this.startTime = performance.now();

    const algoKey = this.select.value as AlgorithmName;
    const meta = ALGORITHMS[algoKey];
    this.algoNameEl.textContent = meta.name;

    // Track which indices are fully sorted
    const sortedSet = new Set<number>();
    this.sortedColors = new Array(this.array.length).fill(false);

    try {
      await meta.fn(this.array, async (step) => {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");

        // Update array snapshot
        this.array = step.array;

        // Track stats
        if (step.comparing) this.comparisons++;
        if (step.swapping) this.swaps++;

        // Track sorted indices
        if (step.sorted) {
          for (const idx of step.indices) {
            sortedSet.add(idx);
          }
        }

        // Build colors
        const colors = this.visualizer.buildColors(this.array, step);

        // Keep sorted markers
        for (const idx of sortedSet) {
          if (idx >= 0 && idx < colors.length) {
            colors[idx] = "sorted";
          }
        }

        // Draw
        this.visualizer.draw(this.array, colors, this.maxVal);
        this.updateStats();

        // Delay for animation speed
        const delayMs = this.getDelay();
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }, signal);

      // Done!
      const elapsed = Math.round(performance.now() - this.startTime);
      this.timeEl.textContent = `耗时: ${elapsed} ms`;
      this.setStatus("done", "✅ 排序完成");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        this.setStatus("idle", "⏹ 已停止");
      } else {
        console.error(err);
        this.setStatus("error", "❌ 出错");
      }
    } finally {
      this.isRunning = false;
      this.abortController = null;
      this.setControlsDisabled(false);
      this.sortBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.updateStats();
    }
  }

  /** Stop current sort */
  stopSort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private setControlsDisabled(disabled: boolean): void {
    this.select.disabled = disabled;
    this.sizeSlider.disabled = disabled;
    this.generateBtn.disabled = disabled;
  }

  private setStatus(cls: string, text: string): void {
    this.statusEl.className = `info-item status-${cls}`;
    this.statusEl.textContent = text;
  }

  private updateStats(): void {
    this.comparisonsEl.textContent = `比较: ${this.comparisons}`;
    this.swapsEl.textContent = `交换: ${this.swaps}`;
    if (this.startTime > 0) {
      const elapsed = Math.round(performance.now() - this.startTime);
      this.timeEl.textContent = `耗时: ${elapsed} ms`;
    }
  }
}
