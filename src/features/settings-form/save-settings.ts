import { storage } from '@/entities/app-state';
import {
  clampHoldSeconds,
  defaultSettings,
  normalizeSettingsValue,
  type AccentColor,
  type Settings
} from '@/entities/settings';
import { normalizeNonNegativeNumber } from '@/shared/lib';

export interface SettingsFormValues {
  surname: string;
  rate: number;
  startHoldSeconds: unknown;
  endHoldSeconds: unknown;
  accentColor: AccentColor;
}

export function saveSettingsValues(values: SettingsFormValues): Settings {
  const normalized = normalizeSettingsValue({
    surname: values.surname,
    rate: normalizeNonNegativeNumber(values.rate),
    startHoldSeconds: clampHoldSeconds(values.startHoldSeconds, defaultSettings.startHoldSeconds),
    endHoldSeconds: clampHoldSeconds(values.endHoldSeconds, defaultSettings.endHoldSeconds),
    accentColor: values.accentColor
  });

  storage.settings = normalized;
  return normalized;
}
