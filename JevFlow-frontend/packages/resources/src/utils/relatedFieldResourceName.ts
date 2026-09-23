export function relatedFieldResourceName(ref: string): string {
  const parts = String(ref).split(".");
  return parts.length > 1 ? parts[1] : parts[0];
}
