export function hash(obj: unknown): string {
  return JSON.stringify(obj || null);
}
