import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readJsonStorage, readStorageItem, removeStorageItem, writeJsonStorage, writeStorageItem } from './local-storage';

function installLocalStorage() {
  const values = new Map<string, string>();
  const setItem = vi.fn((key: string, value: string) => values.set(key, value));
  const removeItem = vi.fn((key: string) => values.delete(key));

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem,
    removeItem,
    clear: () => values.clear()
  });

  return { removeItem, setItem };
}

describe('local storage adapter', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it('reads and writes JSON values', () => {
    expect(readJsonStorage('settings', { rate: 0 })).toEqual({ rate: 0 });

    writeJsonStorage('settings', { rate: 120 });

    expect(readJsonStorage('settings', { rate: 0 })).toEqual({ rate: 120 });
  });

  it('reads, writes and removes string values', () => {
    expect(readStorageItem('startedAt')).toBeNull();

    writeStorageItem('startedAt', '100');
    expect(readStorageItem('startedAt')).toBe('100');

    removeStorageItem('startedAt');
    expect(localStorage.getItem('startedAt')).toBeNull();
  });

  it('skips unchanged writes and missing removals', () => {
    const { removeItem, setItem } = installLocalStorage();

    writeStorageItem('startedAt', '100');
    setItem.mockClear();

    writeStorageItem('startedAt', '100');
    expect(setItem).not.toHaveBeenCalled();

    writeJsonStorage('settings', { rate: 120 });
    setItem.mockClear();

    writeJsonStorage('settings', { rate: 120 });
    expect(setItem).not.toHaveBeenCalled();

    removeStorageItem('missing');
    expect(removeItem).not.toHaveBeenCalled();
  });
});
