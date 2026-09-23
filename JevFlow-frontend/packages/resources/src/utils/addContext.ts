export function addContext(resource: any, ctx: any): any {
  return { ...resource, __ctx: ctx };
}
