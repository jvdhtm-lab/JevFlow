import { ResourceObject, ResourceOptions } from "../types";

export function makeUrlForItems(resource: ResourceObject, opts?: ResourceOptions): string {
  let url = opts?.url ?? resource.baseUrl;
  if (opts?.params) {
    for (const p of opts.params) url = url.replace(`{${p.name}}`, p.value);
  }
  const qs: string[] = [];
  if (opts?.filter) {
    for (const [k, v] of Object.entries(opts.filter)) qs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  if (opts?.search) qs.push(`search=${encodeURIComponent(opts.search)}`);
  if (opts?.sortBy?.length) qs.push(`ordering=${opts.sortBy.map(encodeURIComponent).join(",")}`);
  if (opts?.page) qs.push(`page=${opts.page}`);
  if (opts?.pageSize) qs.push(`page_size=${opts.pageSize}`);
  if (qs.length) url += (url.includes("?") ? "&" : "?") + qs.join("&");
  return url;
}
