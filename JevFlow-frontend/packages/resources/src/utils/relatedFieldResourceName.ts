export function relatedFieldResourceName(ref: string): string {
  const parts = String(ref).split(".");
  const name = parts.length > 1 ? parts[1] : parts[0];
  // CustomUser is the Django model name but the registered resource is User
  if (name === "CustomUser") return "User";
  return name;
}
