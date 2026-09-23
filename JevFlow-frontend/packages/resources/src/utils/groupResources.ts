import { capitalizeFirstLetter } from "./capitalizeFirstLetter";

export function groupResourcesByModule(resources: Record<string, any>): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const [name, res] of Object.entries(resources)) {
    const rel = res?.fields && Object.values(res.fields).find((f: any) => f?.["x-vhrs-relatedResource"]);
    const raw = (rel as any)?.["x-vhrs-relatedResource"] || "general.General";
    const group = capitalizeFirstLetter(String(raw).split(".")[0]);
    (groups[group] = groups[group] || []).push(name);
  }
  return groups;
}
