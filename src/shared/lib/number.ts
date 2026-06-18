export function normalizeNonNegativeNumber(value: unknown): number {
  const normalizedValue = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const number = Number(normalizedValue);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
