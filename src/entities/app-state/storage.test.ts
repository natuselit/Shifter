import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeStoredData, storage } from './storage';

function installLocalStorage() {
  const values = new Map<string, string>();
  const setItem = vi.fn((key: string, value: string) => values.set(key, value));

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem,
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });

  return { setItem };
}

describe('app-state storage', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it('keeps missing active rate as null', () => {
    expect(storage.activeRate).toBeNull();

    storage.activeRate = 120;
    expect(storage.activeRate).toBe(120);

    storage.activeRate = null;
    expect(storage.activeRate).toBeNull();
    expect(localStorage.getItem('activeRate')).toBeNull();
  });

  it('rejects invalid active shift timestamps', () => {
    storage.startedAt = -1;

    expect(storage.startedAt).toBeNull();
    expect(localStorage.getItem('startedAt')).toBeNull();
  });

  it('keeps cached shifts stable while raw storage is unchanged', () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 14, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    };

    localStorage.setItem('shifts', JSON.stringify([shift]));

    const firstRead = storage.shifts;

    expect(storage.shifts).toBe(firstRead);

    const stringify = vi.spyOn(JSON, 'stringify');
    stringify.mockClear();

    storage.shifts = [...firstRead];

    try {
      expect(stringify).not.toHaveBeenCalled();
      expect(storage.shifts).toBe(firstRead);
    } finally {
      stringify.mockRestore();
    }

    localStorage.setItem('shifts', JSON.stringify([{ ...shift, id: '2' }]));

    expect(storage.shifts).not.toBe(firstRead);
    expect(storage.shifts[0]?.id).toBe('2');
  });

  it('does not rewrite sorted shifts during normalization', () => {
    const { setItem } = installLocalStorage();
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 14, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    };

    localStorage.setItem('shifts', JSON.stringify([shift]));
    localStorage.setItem('lastShift', JSON.stringify(shift));
    setItem.mockClear();

    normalizeStoredData();

    expect(setItem).not.toHaveBeenCalledWith('shifts', expect.any(String));
    expect(setItem).not.toHaveBeenCalledWith('lastShift', expect.any(String));
  });
});
