import type { AccentColor, Settings } from './types';

export interface AccentColorPreset {
  id: AccentColor;
  label: string;
  primary: string;
  primaryStrong: string;
  tile: string;
}

export const accentColorPresets: AccentColorPreset[] = [
  { id: 'yellow', label: 'Жовтий', primary: '#ffbf47', primaryStrong: '#e0a02b', tile: '#3b3320' }
];

export const defaultSettings: Settings = {
  rate: 0,
  startHoldSeconds: 3,
  endHoldSeconds: 5,
  surname: '',
  accentColor: 'yellow'
};

export function normalizeAccentColor(value: unknown): AccentColor {
  void value;
  return defaultSettings.accentColor;
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
