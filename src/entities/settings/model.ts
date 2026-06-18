import type { AccentColor, Settings } from './types';

export interface AccentColorPreset {
  id: AccentColor;
  label: string;
  primary: string;
  primaryStrong: string;
  tile: string;
}

export const accentColorPresets: AccentColorPreset[] = [
  { id: 'green', label: 'Зелений', primary: '#45d19e', primaryStrong: '#27b783', tile: '#213632' },
  { id: 'yellow', label: 'Жовтий', primary: '#ffbf47', primaryStrong: '#e0a02b', tile: '#3b3320' },
  { id: 'blue', label: 'Синій', primary: '#48b7ff', primaryStrong: '#2f94d8', tile: '#1f3342' },
  { id: 'red', label: 'Червоний', primary: '#ff6464', primaryStrong: '#db4848', tile: '#3b2428' }
];

export const defaultSettings: Settings = {
  rate: 0,
  startHoldSeconds: 3,
  endHoldSeconds: 5,
  surname: '',
  accentColor: 'green'
};

export function normalizeAccentColor(value: unknown): AccentColor {
  return accentColorPresets.some((preset) => preset.id === value)
    ? (value as AccentColor)
    : defaultSettings.accentColor;
}

export function getAccentColorPreset(value: unknown): AccentColorPreset {
  const accentColor = normalizeAccentColor(value);
  return accentColorPresets.find((preset) => preset.id === accentColor) || accentColorPresets[0];
}

export function clampHoldSeconds(value: unknown, fallback: number): number {
  const seconds = Math.round(Number(value));
  if (!Number.isFinite(seconds)) return fallback;
  return Math.min(10, Math.max(1, seconds));
}

export function normalizeSettingsValue(settings: Partial<Settings> | null | undefined): Settings {
  const rate = Number(settings?.rate);

  return {
    rate: Number.isFinite(rate) && rate >= 0 ? rate : 0,
    startHoldSeconds: clampHoldSeconds(settings?.startHoldSeconds, defaultSettings.startHoldSeconds),
    endHoldSeconds: clampHoldSeconds(settings?.endHoldSeconds, defaultSettings.endHoldSeconds),
    surname: String(settings?.surname || '').trim(),
    accentColor: normalizeAccentColor(settings?.accentColor)
  };
}
