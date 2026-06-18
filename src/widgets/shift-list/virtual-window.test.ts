import { describe, expect, it } from 'vitest';
import { buildVirtualMeasurements, calculateVirtualWindow } from './virtual-window';

describe('virtual window helpers', () => {
  it('builds offsets from measured and estimated row heights', () => {
    const measurements = buildVirtualMeasurements(4, [50, 60], 100);

    expect(measurements.offsets).toEqual([0, 50, 110, 210]);
    expect(measurements.totalHeight).toBe(310);
  });

  it('returns an overscanned visible window', () => {
    const measurements = buildVirtualMeasurements(4, [50, 60, 70, 80], 100);
    const window = calculateVirtualWindow({
      itemCount: 4,
      scrollTop: 55,
      viewportHeight: 70,
      itemOffsets: measurements.offsets,
      itemHeights: [50, 60, 70, 80],
      estimatedItemHeight: 100,
      overscan: 1
    });

    expect(window).toEqual({ startIndex: 0, endIndex: 4 });
  });

  it('handles empty lists', () => {
    expect(
      calculateVirtualWindow({
        itemCount: 0,
        scrollTop: 0,
        viewportHeight: 600,
        itemOffsets: [],
        itemHeights: [],
        estimatedItemHeight: 100,
        overscan: 2
      })
    ).toEqual({ startIndex: 0, endIndex: 0 });
  });
});
