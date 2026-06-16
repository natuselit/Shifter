export type AccentColor = 'green' | 'yellow' | 'blue' | 'red';

export interface Settings {
  rate: number;
  startHoldSeconds: number;
  endHoldSeconds: number;
  surname: string;
  accentColor: AccentColor;
  notificationsEnabled: boolean;
  shiftEndReminderEnabled: boolean;
  shiftEndReminderHours: number;
  shiftEndReminderRepeatMinutes: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  settings: Settings;
  shifts: import('../shift/types').Shift[];
  lastShift: import('../shift/types').Shift | null;
}
