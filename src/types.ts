/** Algorithm identifier */
export type AlgorithmName =
  | "bubble"
  | "selection"
  | "insertion"
  | "merge"
  | "quick"
  | "heap"
  | "shell";

/** A single animation step yielded by a sorting algorithm */
export interface SortStep {
  /** Snapshot of the array at this step */
  array: number[];
  /** Indices being compared / swapped / written */
  indices: number[];
  /** These indices are being compared */
  comparing: boolean;
  /** These indices are being swapped (or overwritten for merge) */
  swapping: boolean;
  /** This index is now in its final sorted position */
  sorted: boolean;
}

/** Color state for each index in the array */
export type BarColor = "default" | "comparing" | "swapping" | "sorted";

/** Callback signature that each algorithm calls after every operation */
export type StepCallback = (step: SortStep) => Promise<void>;

/** All algorithm implementations return this type */
export type SortAlgorithm = (
  arr: number[],
  onStep: StepCallback,
  signal: AbortSignal
) => Promise<void>;

/** Metadata for each algorithm */
export interface AlgorithmMeta {
  name: string;
  fn: SortAlgorithm;
  description: string;
  timeComplexity: string;
}
