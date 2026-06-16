import { describe, expect, it } from 'vitest';
import { getNextReminderState, type ReminderState } from './shift-end-reminder';

const settings = {
  shiftEndReminderEnabled: true,
  shiftEndReminderHours: 8,
  shiftEndReminderRepeatMinutes: 15
};

describe('shift end reminder', () => {
  it('does not notify without active shift', () => {
    const result = getNextReminderState({ activeShiftStartedAt: null, lastNotifiedAt: null }, settings, null, 1000);

    expect(result.shouldNotify).toBe(false);
    expect(result.state).toEqual({ activeShiftStartedAt: null, lastNotifiedAt: null });
  });

  it('notifies after threshold', () => {
    const startedAt = 1000;
    const now = startedAt + 8 * 60 * 60 * 1000;
    const result = getNextReminderState({ activeShiftStartedAt: null, lastNotifiedAt: null }, settings, startedAt, now);

    expect(result.shouldNotify).toBe(true);
    expect(result.state.lastNotifiedAt).toBe(now);
  });

  it('does not duplicate before repeat interval', () => {
    const startedAt = 1000;
    const lastNotifiedAt = startedAt + 8 * 60 * 60 * 1000;
    const state: ReminderState = { activeShiftStartedAt: startedAt, lastNotifiedAt };
    const result = getNextReminderState(state, settings, startedAt, lastNotifiedAt + 14 * 60 * 1000);

    expect(result.shouldNotify).toBe(false);
    expect(result.state.lastNotifiedAt).toBe(lastNotifiedAt);
  });

  it('repeats after repeat interval', () => {
    const startedAt = 1000;
    const lastNotifiedAt = startedAt + 8 * 60 * 60 * 1000;
    const now = lastNotifiedAt + 15 * 60 * 1000;
    const state: ReminderState = { activeShiftStartedAt: startedAt, lastNotifiedAt };
    const result = getNextReminderState(state, settings, startedAt, now);

    expect(result.shouldNotify).toBe(true);
    expect(result.state.lastNotifiedAt).toBe(now);
  });

  it('resets when reminder is disabled', () => {
    const result = getNextReminderState(
      { activeShiftStartedAt: 1000, lastNotifiedAt: 2000 },
      { ...settings, shiftEndReminderEnabled: false },
      1000,
      3000
    );

    expect(result.shouldNotify).toBe(false);
    expect(result.state).toEqual({ activeShiftStartedAt: null, lastNotifiedAt: null });
  });
});
