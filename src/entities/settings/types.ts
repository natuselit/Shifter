export type AccentColor = 'green' | 'yellow' | 'blue' | 'red';

export interface Settings {
  rate: number;
  startHoldSeconds: number;
  endHoldSeconds: number;
  surname: string;
  accentColor: AccentColor;
}
