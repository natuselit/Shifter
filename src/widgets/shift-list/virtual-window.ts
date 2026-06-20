export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
}

export function calculateVirtualWindow({
  itemCount,
  scrollTop,
  viewportHeight,
  itemHeight,
  overscan
}: {
  itemCount: number;
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  overscan: number;
}): VirtualWindow {
  if (itemCount <= 0 || itemHeight <= 0) return { startIndex: 0, endIndex: 0 };

  const safeScrollTop = Math.max(0, scrollTop);
  const safeViewportHeight = Math.max(0, viewportHeight);
  const startIndex = Math.floor(safeScrollTop / itemHeight);
  const visibleCount = Math.ceil(safeViewportHeight / itemHeight) + 1;

  return {
    startIndex: Math.max(0, startIndex - overscan),
    endIndex: Math.min(itemCount, startIndex + visibleCount + overscan)
  };
}
