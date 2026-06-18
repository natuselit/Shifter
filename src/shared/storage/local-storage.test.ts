import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readJsonStorage, readStorageItem, removeStorageItem, writeJsonStorage, writeStorageItem } from './local-storage';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
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
});
