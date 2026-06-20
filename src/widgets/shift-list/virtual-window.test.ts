import { describe, expect, it } from 'vitest';
import { calculateVirtualWindow } from './virtual-window';

describe('virtual window helpers', () => {
  it('returns an overscanned visible window', () => {
    const window = calculateVirtualWindow({
      itemCount: 100,
      scrollTop: 360,
      viewportHeight: 420,
      itemHeight: 120,
      overscan: 2
    });

    expect(window).toEqual({ startIndex: 1, endIndex: 10 });
  });

  it('handles empty lists', () => {
    expect(
      calculateVirtualWindow({
        itemCount: 0,
        scrollTop: 0,
        viewportHeight: 600,
        itemHeight: 100,
        overscan: 2
      })
    ).toEqual({ startIndex: 0, endIndex: 0 });
  });

  it('clamps a window near the end of a large list', () => {
    const window = calculateVirtualWindow({
      itemCount: 10_000,
      scrollTop: 1_199_400,
      viewportHeight: 500,
      itemHeight: 120,
      overscan: 2
    });

    expect(window).toEqual({ startIndex: 9993, endIndex: 10000 });
  });
});
