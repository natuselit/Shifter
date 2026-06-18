import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

describe('format helpers', () => {
  it('floors visual money values', () => {
    expect(formatMoney(234.995)).toBe('234 ₴');
    expect(formatMoney(0.99)).toBe('0 ₴');
  });
});
