import type { AlgorithmMeta, SortStep } from "../types";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Check abort signal periodically without flooding */
async function yieldCheck(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  // Yield to event loop so the UI stays responsive and abort can be caught
  await delay(0);
}

// ──────────────────────────────────────────────
// Bubble Sort
// ──────────────────────────────────────────────
async function bubbleSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      await yieldCheck(signal);

      // Compare
      await onStep({ array: [...a], indices: [j, j + 1], comparing: true, swapping: false, sorted: false });

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;

        // Swap
        await onStep({ array: [...a], indices: [j, j + 1], comparing: false, swapping: true, sorted: false });
      }
    }
    // Mark last i elements as sorted (visual only)
    const sortedIdx = n - 1 - i;
    await onStep({ array: [...a], indices: [sortedIdx], comparing: false, swapping: false, sorted: true });
  }
  // Final: mark all sorted
  for (let i = 0; i < n; i++) {
    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
}

// ──────────────────────────────────────────────
// Selection Sort
// ──────────────────────────────────────────────
async function selectionSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      await yieldCheck(signal);

      // Comparing current min with candidate
      await onStep({ array: [...a], indices: [minIdx, j], comparing: true, swapping: false, sorted: false });

      if (a[j] < a[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      await onStep({ array: [...a], indices: [i, minIdx], comparing: false, swapping: true, sorted: false });
    }
    // Mark i as sorted
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
  // Last element
  await onStep({ array: [...a], indices: [n - 1], comparing: false, swapping: false, sorted: true });
}

// ──────────────────────────────────────────────
// Insertion Sort
// ──────────────────────────────────────────────
async function insertionSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;

    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: false });

    while (j >= 0 && a[j] > key) {
      await yieldCheck(signal);
      await onStep({ array: [...a], indices: [j, j + 1], comparing: true, swapping: false, sorted: false });

      a[j + 1] = a[j];
      await onStep({ array: [...a], indices: [j, j + 1], comparing: false, swapping: true, sorted: false });
      j--;
    }
    a[j + 1] = key;
    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [j + 1], comparing: false, swapping: true, sorted: false });
  }
  // Mark all sorted
  for (let i = 0; i < n; i++) {
    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
}

// ──────────────────────────────────────────────
// Merge Sort
// ──────────────────────────────────────────────
async function mergeSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  async function merge(left: number, mid: number, right: number): Promise<void> {
    const leftArr = a.slice(left, mid + 1);
    const rightArr = a.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      await yieldCheck(signal);

      await onStep({
        array: [...a],
        indices: [left + i, mid + 1 + j],
        comparing: true,
        swapping: false,
        sorted: false,
      });

      if (leftArr[i] <= rightArr[j]) {
        a[k] = leftArr[i];
        i++;
      } else {
        a[k] = rightArr[j];
        j++;
      }
      await onStep({
        array: [...a],
        indices: [k],
        comparing: false,
        swapping: true,
        sorted: false,
      });
      k++;
    }

    while (i < leftArr.length) {
      await yieldCheck(signal);
      a[k] = leftArr[i];
      await onStep({ array: [...a], indices: [k], comparing: false, swapping: true, sorted: false });
      i++;
      k++;
    }
    while (j < rightArr.length) {
      await yieldCheck(signal);
      a[k] = rightArr[j];
      await onStep({ array: [...a], indices: [k], comparing: false, swapping: true, sorted: false });
      j++;
      k++;
    }
  }

  async function mergeSortRecursive(left: number, right: number): Promise<void> {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      await mergeSortRecursive(left, mid);
      await mergeSortRecursive(mid + 1, right);
      await merge(left, mid, right);
    }
  }

  await mergeSortRecursive(0, n - 1);

  // Mark all sorted
  for (let i = 0; i < n; i++) {
    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
}

// ──────────────────────────────────────────────
// Quick Sort
// ──────────────────────────────────────────────
async function quickSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  async function partition(low: number, high: number): Promise<number> {
    const pivot = a[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      await yieldCheck(signal);

      await onStep({ array: [...a], indices: [j, high], comparing: true, swapping: false, sorted: false });

      if (a[j] <= pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        await onStep({ array: [...a], indices: [i, j], comparing: false, swapping: true, sorted: false });
      }
    }
    [a[i + 1], a[high]] = [a[high], a[i + 1]];
    await onStep({ array: [...a], indices: [i + 1, high], comparing: false, swapping: true, sorted: false });
    return i + 1;
  }

  async function quickSortRecursive(low: number, high: number): Promise<void> {
    if (low < high) {
      const pi = await partition(low, high);
      await onStep({ array: [...a], indices: [pi], comparing: false, swapping: false, sorted: true });
      await quickSortRecursive(low, pi - 1);
      await quickSortRecursive(pi + 1, high);
    } else if (low >= 0 && low < n) {
      await onStep({ array: [...a], indices: [low], comparing: false, swapping: false, sorted: true });
    }
  }

  await quickSortRecursive(0, n - 1);

  // Ensure all sorted
  for (let i = 0; i < n; i++) {
    await yieldCheck(signal);
  }
  for (let i = 0; i < n; i++) {
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
}

// ──────────────────────────────────────────────
// Heap Sort
// ──────────────────────────────────────────────
async function heapSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  async function heapify(size: number, root: number): Promise<void> {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;

    if (left < size) {
      await yieldCheck(signal);
      await onStep({ array: [...a], indices: [largest, left], comparing: true, swapping: false, sorted: false });
      if (a[left] > a[largest]) largest = left;
    }

    if (right < size) {
      await yieldCheck(signal);
      await onStep({ array: [...a], indices: [largest, right], comparing: true, swapping: false, sorted: false });
      if (a[right] > a[largest]) largest = right;
    }

    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]];
      await onStep({ array: [...a], indices: [root, largest], comparing: false, swapping: true, sorted: false });
      await heapify(size, largest);
    }
  }

  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    await yieldCheck(signal);
    await heapify(n, i);
  }

  // Extract elements
  for (let i = n - 1; i > 0; i--) {
    await yieldCheck(signal);
    [a[0], a[i]] = [a[i], a[0]];
    await onStep({ array: [...a], indices: [0, i], comparing: false, swapping: true, sorted: false });
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
    await heapify(i, 0);
  }

  await onStep({ array: [...a], indices: [0], comparing: false, swapping: false, sorted: true });
}

// ──────────────────────────────────────────────
// Shell Sort
// ──────────────────────────────────────────────
async function shellSort(
  arr: number[],
  onStep: (s: SortStep) => Promise<void>,
  signal: AbortSignal
): Promise<void> {
  const a = [...arr];
  const n = a.length;

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      const temp = a[i];
      let j = i;

      await yieldCheck(signal);

      while (j >= gap) {
        await yieldCheck(signal);
        await onStep({ array: [...a], indices: [j, j - gap], comparing: true, swapping: false, sorted: false });

        if (a[j - gap] > temp) {
          a[j] = a[j - gap];
          await onStep({ array: [...a], indices: [j, j - gap], comparing: false, swapping: true, sorted: false });
          j -= gap;
        } else {
          break;
        }
      }
      a[j] = temp;
      await onStep({ array: [...a], indices: [j], comparing: false, swapping: true, sorted: false });
    }
  }

  for (let i = 0; i < n; i++) {
    await yieldCheck(signal);
    await onStep({ array: [...a], indices: [i], comparing: false, swapping: false, sorted: true });
  }
}

// ──────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────
export const ALGORITHMS: Record<string, AlgorithmMeta> = {
  bubble: {
    name: "冒泡排序",
    fn: bubbleSort,
    description: "重复遍历数组，比较相邻元素并交换",
    timeComplexity: "O(n²)",
  },
  selection: {
    name: "选择排序",
    fn: selectionSort,
    description: "每次从未排序部分选择最小元素放到已排序末尾",
    timeComplexity: "O(n²)",
  },
  insertion: {
    name: "插入排序",
    fn: insertionSort,
    description: "逐个将元素插入到已排序部分的正确位置",
    timeComplexity: "O(n²)",
  },
  merge: {
    name: "归并排序",
    fn: mergeSort,
    description: "分治法：将数组分成两半分别排序后合并",
    timeComplexity: "O(n log n)",
  },
  quick: {
    name: "快速排序",
    fn: quickSort,
    description: "分治法：选取基准值，将数组分成小于和大于基准的两部分",
    timeComplexity: "O(n log n)",
  },
  heap: {
    name: "堆排序",
    fn: heapSort,
    description: "利用最大堆数据结构反复提取最大元素",
    timeComplexity: "O(n log n)",
  },
  shell: {
    name: "希尔排序",
    fn: shellSort,
    description: "改进的插入排序，允许交换远距离元素",
    timeComplexity: "O(n log n)",
  },
};
