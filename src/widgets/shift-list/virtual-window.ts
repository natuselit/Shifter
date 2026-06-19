export interface VirtualMeasurements {
  offsets: number[];
  totalHeight: number;
}

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
}

export function buildVirtualMeasurements(
  itemCount: number,
  itemHeights: number[],
  estimatedItemHeight: number
): VirtualMeasurements {
  const offsets = new Array<number>(itemCount);
  let totalHeight = 0;

  for (let index = 0; index < itemCount; index += 1) {
    offsets[index] = totalHeight;
    totalHeight += itemHeights[index] || estimatedItemHeight;
  }

  return { offsets, totalHeight };
}

function getItemHeight(itemHeights: number[], index: number, estimatedItemHeight: number): number {
  return itemHeights[index] || estimatedItemHeight;
}

function findFirstItemEndingAtOrAfter({
  itemCount,
  itemOffsets,
  itemHeights,
  estimatedItemHeight,
  target
}: {
  itemCount: number;
  itemOffsets: number[];
  itemHeights: number[];
  estimatedItemHeight: number;
  target: number;
}): number {
  let low = 0;
  let high = itemCount - 1;
  let result = itemCount - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const itemEnd = itemOffsets[middle] + getItemHeight(itemHeights, middle, estimatedItemHeight);

    if (itemEnd < target) {
      low = middle + 1;
    } else {
      result = middle;
      high = middle - 1;
    }
  }

  return result;
}

function findFirstItemStartingAtOrAfter(itemOffsets: number[], itemCount: number, target: number): number {
  let low = 0;
  let high = itemCount;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (itemOffsets[middle] < target) low = middle + 1;
    else high = middle;
  }

  return low;
}

export function calculateVirtualWindow({
  itemCount,
  scrollTop,
  viewportHeight,
  itemOffsets,
  itemHeights,
  estimatedItemHeight,
  overscan
}: {
  itemCount: number;
  scrollTop: number;
  viewportHeight: number;
  itemOffsets: number[];
  itemHeights: number[];
  estimatedItemHeight: number;
  overscan: number;
}): VirtualWindow {
  if (itemCount <= 0) return { startIndex: 0, endIndex: 0 };

  const viewportStart = Math.max(0, scrollTop);
  const viewportEnd = viewportStart + Math.max(0, viewportHeight);
  const startIndex = findFirstItemEndingAtOrAfter({
    itemCount,
    itemOffsets,
    itemHeights,
    estimatedItemHeight,
    target: viewportStart
  });
  const endIndex = findFirstItemStartingAtOrAfter(itemOffsets, itemCount, viewportEnd);

  return {
    startIndex: Math.max(0, startIndex - overscan),
    endIndex: Math.min(itemCount, endIndex + overscan)
  };
}
