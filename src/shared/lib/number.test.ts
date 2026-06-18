import { describe, expect, it } from 'vitest';
import { normalizeNonNegativeNumber } from './number';

describe('number helpers', () => {
  it('normalizes decimal comma values', () => {
    expect(normalizeNonNegativeNumber('234,995')).toBe(234.995);
  });
});
