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
  const offsets: number[] = [];
  let totalHeight = 0;

  for (let index = 0; index < itemCount; index += 1) {
    offsets[index] = totalHeight;
    totalHeight += itemHeights[index] || estimatedItemHeight;
  }

  return { offsets, totalHeight };
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
  let startIndex = 0;

  while (
    startIndex < itemCount - 1 &&
    itemOffsets[startIndex] + (itemHeights[startIndex] || estimatedItemHeight) < viewportStart
  ) {
    startIndex += 1;
  }

  let endIndex = startIndex;
  while (endIndex < itemCount && itemOffsets[endIndex] < viewportEnd) {
    endIndex += 1;
  }

  return {
    startIndex: Math.max(0, startIndex - overscan),
    endIndex: Math.min(itemCount, endIndex + overscan)
  };
}
