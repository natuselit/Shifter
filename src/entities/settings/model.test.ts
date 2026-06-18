import { describe, expect, it } from 'vitest';
import { normalizeSettingsValue } from './model';

describe('settings model', () => {
  it('normalizes settings and clamps hold seconds', () => {
    expect(
      normalizeSettingsValue({
        rate: 120,
        startHoldSeconds: 99,
        endHoldSeconds: -2,
        surname: '  Петренко  '
      })
    ).toEqual({
      rate: 120,
      startHoldSeconds: 10,
      endHoldSeconds: 1,
      surname: 'Петренко',
      accentColor: 'green'
    });
  });

  it('falls back for invalid values', () => {
    expect(normalizeSettingsValue({ rate: Number.NaN, startHoldSeconds: Number.NaN })).toMatchObject({
      rate: 0,
      startHoldSeconds: 3,
      endHoldSeconds: 5,
      surname: '',
      accentColor: 'green'
    });
  });

  it('rejects negative rates', () => {
    expect(normalizeSettingsValue({ rate: -120 })).toMatchObject({
      rate: 0
    });
  });

  it('keeps valid accent colors', () => {
    expect(normalizeSettingsValue({ accentColor: 'yellow' })).toMatchObject({
      accentColor: 'yellow'
    });
  });

  it('falls back for unknown accent colors', () => {
    expect(normalizeSettingsValue({ accentColor: 'purple' as never })).toMatchObject({
      accentColor: 'green'
    });
  });

});
