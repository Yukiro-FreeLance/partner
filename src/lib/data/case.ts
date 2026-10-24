export function toSnake(value: string) {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export function toCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function keysToSnake(row: object) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [toSnake(key), value]));
}

export function keysToCamel<T>(row: object): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value])) as T;
}
