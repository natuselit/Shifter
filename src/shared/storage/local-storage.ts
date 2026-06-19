export function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue === null ? fallback : JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T): void {
  writeStorageItem(key, JSON.stringify(value));
}

export function readStorageItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function writeStorageItem(key: string, value: string): void {
  if (localStorage.getItem(key) === value) return;
  localStorage.setItem(key, value);
}

export function removeStorageItem(key: string): void {
  if (localStorage.getItem(key) === null) return;
  localStorage.removeItem(key);
}
