export type ShiftType = '1 зміна' | '2 зміна' | 'Поза графіком';

export type RateMultiplier = 1 | 1.5 | 2;

export interface Shift {
  id: string;
  startedAt: number;
  endedAt: number;
  rate: number;
  shiftType: ShiftType;
  rateMultiplier: RateMultiplier;
  doubleRate: boolean;
}

export interface ActiveShift extends Shift {
  active: true;
}

export interface PayBreakdown {
  baseMs: number;
  overtimeMs: number;
  multiplierMs: number;
  rateMultiplier: RateMultiplier;
  total: number;
}
