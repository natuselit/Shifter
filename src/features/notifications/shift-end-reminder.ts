import type { Settings } from '../../entities/settings/types';

export interface ReminderState {
  activeShiftStartedAt: number | null;
  lastNotifiedAt: number | null;
}

export function getNextReminderState(
  state: ReminderState,
  settings: Pick<Settings, 'shiftEndReminderEnabled' | 'shiftEndReminderHours' | 'shiftEndReminderRepeatMinutes'>,
  startedAt: number | null,
  now: number
): { shouldNotify: boolean; state: ReminderState } {
  if (!startedAt || !settings.shiftEndReminderEnabled) {
    return { shouldNotify: false, state: { activeShiftStartedAt: null, lastNotifiedAt: null } };
  }

  const reminderAt = startedAt + settings.shiftEndReminderHours * 60 * 60 * 1000;
  if (now < reminderAt) {
    return { shouldNotify: false, state: { activeShiftStartedAt: startedAt, lastNotifiedAt: null } };
  }

  const lastNotifiedAt = state.activeShiftStartedAt === startedAt ? state.lastNotifiedAt : null;
  const repeatMs = settings.shiftEndReminderRepeatMinutes * 60 * 1000;

  if (lastNotifiedAt !== null && now - lastNotifiedAt < repeatMs) {
    return { shouldNotify: false, state: { activeShiftStartedAt: startedAt, lastNotifiedAt } };
  }

  return { shouldNotify: true, state: { activeShiftStartedAt: startedAt, lastNotifiedAt: now } };
}
