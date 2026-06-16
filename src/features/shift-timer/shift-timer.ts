import { createShiftId, detectShiftType, getDateKey, hasShiftOnDate } from '../../entities/shift/model';
import type { Settings } from '../../entities/settings/types';
import type { Shift } from '../../entities/shift/types';
import { storage } from '../../shared/storage/local-storage';

export function startCurrentShift(settings: Settings): { ok: true } | { ok: false; message: string } {
  if (hasShiftOnDate(storage.shifts, getDateKey(new Date()))) {
    return { ok: false, message: 'За сьогодні вже є зміна' };
  }

  storage.startedAt = Date.now();
  storage.activeRate = settings.rate;
  storage.rateMultiplier = 1;
  return { ok: true };
}

export function finishCurrentShift(): { ok: true; shift: Shift } | { ok: false; message: string } {
  const startedAt = storage.startedAt;
  if (!startedAt) return { ok: false, message: '' };

  if (hasShiftOnDate(storage.shifts, getDateKey(startedAt))) {
    return { ok: false, message: 'За цей день вже є зміна' };
  }

  const activeRate = storage.activeRate ?? storage.settings.rate;
  const rateMultiplier = storage.rateMultiplier;
  const shift: Shift = {
    id: createShiftId(),
    startedAt,
    endedAt: Date.now(),
    rate: activeRate,
    shiftType: detectShiftType(startedAt),
    rateMultiplier,
    doubleRate: rateMultiplier === 2
  };
  const shifts = [shift, ...storage.shifts].sort((first, second) => second.startedAt - first.startedAt);

  storage.shifts = shifts;
  storage.lastShift = shift;
  storage.startedAt = null;
  storage.activeRate = null;
  storage.rateMultiplier = 1;
  localStorage.removeItem('activeBreaks');

  return { ok: true, shift };
}
