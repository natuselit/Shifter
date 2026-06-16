import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../shared/storage/local-storage';
import { importBackup } from './backup-data';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
}

function jsonFile(value: unknown): File {
  return new File([JSON.stringify(value)], 'backup.json', { type: 'application/json' });
}

describe('backup import', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it('imports valid backup data', async () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 14, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    };

    await importBackup(
      jsonFile({
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: { rate: 120, startHoldSeconds: 3, endHoldSeconds: 5, surname: 'Петренко' },
        shifts: [shift],
        lastShift: shift
      })
    );

    expect(storage.settings.rate).toBe(120);
    expect(storage.shifts).toHaveLength(1);
    expect(storage.lastShift?.id).toBe('1');
  });

  it('rejects invalid backup data', async () => {
    await expect(importBackup(jsonFile({ shifts: [{ startedAt: 'bad' }] }))).rejects.toThrow('Invalid shifts');
  });
});
