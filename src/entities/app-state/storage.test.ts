import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
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
});
