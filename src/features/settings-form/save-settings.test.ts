import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../shared/storage/local-storage';
import { saveSettingsValues } from './save-settings';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
}

describe('saveSettingsValues', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it('saves accent color with settings', () => {
    const settings = saveSettingsValues({
      surname: 'Петренко',
      rate: 120,
      startHoldSeconds: 3,
      endHoldSeconds: 5,
      accentColor: 'yellow',
      notificationsEnabled: true,
      shiftEndReminderEnabled: true,
      shiftEndReminderHours: 8,
      shiftEndReminderRepeatMinutes: 15
    });

    expect(settings.accentColor).toBe('yellow');
    expect(settings.notificationsEnabled).toBe(true);
    expect(storage.settings.accentColor).toBe('yellow');
  });
});
