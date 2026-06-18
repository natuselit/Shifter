import { describe, expect, it } from 'vitest';
import {
  buildScheduleSyncPreview,
  formatScheduleEntries,
  formatScheduleTextInput,
  formatSignedHoursMinutes,
  getScheduleDiff,
  parseScheduleText,
  syncShiftsWithScheduleEntries
} from './schedule-plan';

describe('schedule plan', () => {
  it('parses schedule blocks and ignores service rows', () => {
    const result = parseScheduleText(`
--01.06.2026--
In time: 05:57
Out time: 16:52
Total: 10:55

Колонка 4:

--02.06.2026--
In time: 06:30
Out time: 15:50
Total: 09:20
`);

    expect(result.errors).toEqual([]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      dateKey: '2026-06-01',
      plannedInMinutes: 357,
      plannedOutMinutes: 1012,
      plannedTotalMs: 10 * 3600000 + 55 * 60000
    });
  });

  it('keeps empty days without planned hours', () => {
    const result = parseScheduleText(`
--07.06.2026--
In time:
Out time:
Total: :
`);

    expect(result.entries[0]).toMatchObject({
      dateKey: '2026-06-07',
      plannedInMinutes: null,
      plannedOutMinutes: null,
      plannedTotalMs: null
    });
  });

  it('reports invalid time without breaking the whole parse', () => {
    const result = parseScheduleText(`
--01.06.2026--
In time: 99:10
Out time: 16:52
Total: bad
`);

    expect(result.errors).toHaveLength(2);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].plannedOutMinutes).toBe(1012);
  });

  it('calculates total and in/out differences', () => {
    const entry = parseScheduleText(`
--02.06.2026--
In time: 06:30
Out time: 15:50
Total: 09:20
`).entries[0];
    const shift = {
      startedAt: new Date(2026, 5, 2, 6, 10).getTime(),
      endedAt: new Date(2026, 5, 2, 17, 5).getTime()
    };

    const diff = getScheduleDiff(entry, shift);

    expect(formatSignedHoursMinutes(diff.totalDiffMs)).toBe('+01:35');
    expect(formatSignedHoursMinutes(diff.inDiffMs)).toBe('-00:20');
    expect(formatSignedHoursMinutes(diff.outDiffMs)).toBe('+01:15');
  });

  it('does not produce NaN when plan or fact is missing', () => {
    expect(getScheduleDiff(undefined, undefined)).toEqual({
      totalDiffMs: null,
      inDiffMs: null,
      outDiffMs: null
    });
  });

  it('updates only dates from incoming schedule and keeps other dates', () => {
    const currentText = `
--01.06.2026--
In time: 06:30
Out time: 14:30
Total: 08:00

--02.06.2026--
In time: 06:30
Out time: 14:30
Total: 08:00
`;
    const incomingText = `
--02.06.2026--
In time: 07:00
Out time: 15:00
Total: 08:00

--03.06.2026--
In time: 14:30
Out time: 22:30
Total: 08:00
`;

    const preview = buildScheduleSyncPreview(currentText, incomingText, []);

    expect(preview.addedKeys).toEqual(['2026-06-03']);
    expect(preview.updatedKeys).toEqual(['2026-06-02']);
    expect(preview.unchangedKeys).toEqual([]);
    expect(preview.entries.map((entry) => entry.dateKey)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(preview.mergedText).toContain('--01.06.2026--');
    expect(preview.mergedText).toContain('In time: 07:00');
  });

  it('detects unchanged incoming dates', () => {
    const currentText = `
--01.06.2026--
In time: 06:30
Out time: 14:30
Total: 08:00
`;

    const preview = buildScheduleSyncPreview(currentText, currentText, []);

    expect(preview.addedKeys).toEqual([]);
    expect(preview.updatedKeys).toEqual([]);
    expect(preview.unchangedKeys).toEqual(['2026-06-01']);
  });

  it('includes incoming parse errors in sync preview', () => {
    const preview = buildScheduleSyncPreview(
      '',
      `
--01.06.2026--
In time: 99:00
Out time: 14:30
Total: 08:00
`,
      []
    );

    expect(preview.errors).toHaveLength(1);
  });

  it('reports fact differences for incoming schedule dates', () => {
    const preview = buildScheduleSyncPreview(
      '',
      `
--02.06.2026--
In time: 06:30
Out time: 15:50
Total: 09:20
`,
      [
        {
          id: '1',
          startedAt: new Date(2026, 5, 2, 6, 10).getTime(),
          endedAt: new Date(2026, 5, 2, 17, 5).getTime(),
          rate: 100,
          shiftType: '1 зміна',
          rateMultiplier: 1,
          doubleRate: false
        }
      ]
    );

    expect(preview.factDiffs).toHaveLength(1);
    expect(formatSignedHoursMinutes(preview.factDiffs[0].diff.totalDiffMs)).toBe('+01:35');
    expect(formatSignedHoursMinutes(preview.factDiffs[0].diff.inDiffMs)).toBe('-00:20');
    expect(formatSignedHoursMinutes(preview.factDiffs[0].diff.outDiffMs)).toBe('+01:15');
  });

  it('formats entries back to schedule text', () => {
    const entries = parseScheduleText(`
--02.06.2026--
In time: 06:30
Out time: 15:50
Total: 09:20
`).entries;

    expect(formatScheduleEntries(entries)).toBe(
      ['--02.06.2026--', 'In time: 06:30', 'Out time: 15:50', 'Total: 09:20'].join('\n')
    );
  });

  it('formats pasted inline schedule text into readable blocks', () => {
    expect(
      formatScheduleTextInput(
        '--01.05.2026-- In time: Out time: Total: : --02.05.2026-- In time: 06:30 Out time: 14:30 Total: 08:00'
      )
    ).toBe(
      [
        '--01.05.2026--',
        'In time: ',
        'Out time: ',
        'Total: :',
        '',
        '--02.05.2026--',
        'In time: 06:30',
        'Out time: 14:30',
        'Total: 08:00'
      ].join('\n')
    );
  });

  it('creates shifts from incoming schedule entries when history is empty', () => {
    const entries = parseScheduleText(`
--02.06.2026--
In time: 06:30
Out time: 15:50
Total: 09:20

--03.06.2026--
In time:
Out time:
Total: :
`).entries;

    const result = syncShiftsWithScheduleEntries(entries, [], 125);

    expect(result.createdKeys).toEqual(['2026-06-02']);
    expect(result.updatedKeys).toEqual([]);
    expect(result.skippedKeys).toEqual(['2026-06-03']);
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0]).toMatchObject({
      startedAt: new Date(2026, 5, 2, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 2, 15, 50).getTime(),
      rate: 125,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    });
  });

  it('updates existing shift times from schedule and keeps pay settings', () => {
    const entries = parseScheduleText(`
--02.06.2026--
In time: 14:30
Out time: 22:30
Total: 08:00
`).entries;
    const existingShift = {
      id: 'existing',
      startedAt: new Date(2026, 5, 2, 6, 10).getTime(),
      endedAt: new Date(2026, 5, 2, 17, 5).getTime(),
      rate: 100,
      shiftType: '1 зміна' as const,
      rateMultiplier: 1.5 as const,
      doubleRate: false
    };

    const result = syncShiftsWithScheduleEntries(entries, [existingShift], 125);

    expect(result.createdKeys).toEqual([]);
    expect(result.updatedKeys).toEqual(['2026-06-02']);
    expect(result.shifts[0]).toMatchObject({
      id: 'existing',
      startedAt: new Date(2026, 5, 2, 14, 30).getTime(),
      endedAt: new Date(2026, 5, 2, 22, 30).getTime(),
      rate: 100,
      shiftType: '2 зміна',
      rateMultiplier: 1.5,
      doubleRate: false
    });
  });
});
