import { normalizeSettingsValue } from '../../entities/settings/model';
import type { BackupPayload } from '../../entities/settings/types';
import { getDateKey, normalizeShiftValue } from '../../entities/shift/model';
import { storage } from '../../shared/storage/local-storage';

export function exportBackup(): void {
  const data: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: storage.settings,
    shifts: storage.shifts,
    lastShift: storage.lastShift
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `shifter-backup-${getDateKey(new Date())}.json`;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupPayload>;

  if (!data || typeof data !== 'object' || !Array.isArray(data.shifts)) {
    throw new Error('Invalid backup');
  }

  const normalizedShifts = data.shifts.map((shift, index) => normalizeShiftValue(shift, index, { strict: true }));
  if (normalizedShifts.some((shift) => !shift)) {
    throw new Error('Invalid shifts');
  }

  const shifts = normalizedShifts
    .filter((shift): shift is NonNullable<typeof shift> => Boolean(shift))
    .sort((first, second) => second.startedAt - first.startedAt);
  storage.settings = normalizeSettingsValue(data.settings || {});
  storage.shifts = shifts;
  storage.lastShift = shifts[0] || null;
}
