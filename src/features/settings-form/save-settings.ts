import { clampHoldSeconds, clampNumber, defaultSettings, normalizeSettingsValue } from '../../entities/settings/model';
import type { AccentColor, Settings } from '../../entities/settings/types';
import { normalizeNonNegativeNumber } from '../../shared/lib/number';
import { storage } from '../../shared/storage/local-storage';

export interface SettingsFormValues {
  surname: string;
  rate: number;
  startHoldSeconds: unknown;
  endHoldSeconds: unknown;
  accentColor: AccentColor;
  notificationsEnabled: boolean;
  shiftEndReminderEnabled: boolean;
  shiftEndReminderHours: unknown;
  shiftEndReminderRepeatMinutes: unknown;
}

export function saveSettingsValues(values: SettingsFormValues): Settings {
  const normalized = normalizeSettingsValue({
    surname: values.surname,
    rate: normalizeNonNegativeNumber(values.rate),
    startHoldSeconds: clampHoldSeconds(values.startHoldSeconds, defaultSettings.startHoldSeconds),
    endHoldSeconds: clampHoldSeconds(values.endHoldSeconds, defaultSettings.endHoldSeconds),
    accentColor: values.accentColor,
    notificationsEnabled: values.notificationsEnabled,
    shiftEndReminderEnabled: values.shiftEndReminderEnabled,
    shiftEndReminderHours: clampNumber(values.shiftEndReminderHours, defaultSettings.shiftEndReminderHours, 1, 16),
    shiftEndReminderRepeatMinutes: clampNumber(
      values.shiftEndReminderRepeatMinutes,
      defaultSettings.shiftEndReminderRepeatMinutes,
      5,
      120
    )
  });

  storage.settings = normalized;
  return normalized;
}
