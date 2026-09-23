import { resources } from "../servers/resources";

export function annotateResource(name: string, patch: Record<string, any>): void {
  const target = (resources as any)[name];
  if (!target) return;
  if (patch.fields) {
    for (const [k, v] of Object.entries(patch.fields)) {
      target.fields[k] = { ...(target.fields[k] || {}), ...(v as object) };
    }
  }
  if (patch.display?.components) {
    target.display = target.display || { components: {} };
    Object.assign(target.display.components, patch.display.components);
  }
  if (patch.actions) target.actions = patch.actions;
  if (patch.menu) target.menu = patch.menu;
}
