import { describe, expect, it } from 'vitest';
import type { Shift } from '@/entities/shift';
import { buildReportAnalytics } from './model';

const hourMs = 3600000;

function makeShift(day: number, hours: number): Shift {
  const startedAt = new Date(2026, 5, day, 6, 30).getTime();

  return {
    id: String(day),
    startedAt,
    endedAt: startedAt + hours * hourMs,
    rate: 100,
    shiftType: '1 зміна',
    rateMultiplier: 1,
    doubleRate: false
  };
}

describe('report analytics model', () => {
  it('keeps totals complete while limiting largest schedule diff rows', () => {
    const shifts = [makeShift(1, 1), makeShift(2, 2), makeShift(3, 3), makeShift(4, 4)];

    const analytics = buildReportAnalytics({
      reportShifts: shifts,
      range: null,
      visibleMonth: new Date(2026, 5, 1),
      scheduleEntries: shifts.map((shift) => ({
        dateKey: `2026-06-${shift.id.padStart(2, '0')}`,
        plannedInMinutes: null,
        plannedOutMinutes: null,
        plannedTotalMs: 0
      })),
      chartMode: 'hours'
    });

    expect(analytics.totalMs).toBe(10 * hourMs);
    expect(analytics.scheduleDiffRows.map((row) => row.dateKey)).toEqual([
      '2026-06-04',
      '2026-06-03',
      '2026-06-02'
    ]);
  });
});
