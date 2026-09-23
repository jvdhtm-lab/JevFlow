import { ResourceObject, ResourceOptions } from "../types";

function applyParams(url: string, opts?: ResourceOptions): string {
  if (!opts?.params) return url;
  let out = url;
  for (const p of opts.params) out = out.replace(`{${p.name}}`, p.value);
  return out;
}

export function makeUrlForItem(id: string | number, resource: ResourceObject, opts?: ResourceOptions): string {
  const base = opts?.url ?? resource.baseUrl;
  const withParams = applyParams(base, opts);
  const sep = withParams.endsWith("/") ? "" : "/";
  return `${withParams}${sep}${id}/`;
}

export function makeUrlForItemsSimple(resource: ResourceObject, opts?: ResourceOptions): string {
  return applyParams(opts?.url ?? resource.baseUrl, opts);
}
