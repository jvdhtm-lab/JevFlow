export function normalizeList(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.results)) return input.results;
  if (Array.isArray(input.data)) return input.data;
  if (input.data && Array.isArray(input.data.results)) return input.data.results;
  return [];
}

export function normalizeTotal(input: any, fallback: number): number {
  if (typeof input?.count === "number") return input.count;
  if (typeof input?.total === "number") return input.total;
  if (typeof input?.data?.count === "number") return input.data.count;
  return fallback;
}
