import * as fs from "fs";
import * as path from "path";
import prettier from "prettier";
import { PRETTIER_CONFIG } from "../constants/Config";
import { generateResourceFile } from "./generateResourceFile";
import { findResourceModel } from "./findResourceModel";

// Query params that are pagination/search plumbing, not model fields.
const NON_FIELD_PARAMS = new Set([
  "page", "page_size", "ordering", "search", "format", "limit", "offset",
]);

const routeOf = (p: string): string | null => {
  const m = p.match(/^\/([a-z0-9-]+)\//i);
  return m ? m[1] : null;
};

/**
 * Sync resources from a Swagger object into resource files.
 * @param swagger - the fetched Swagger JSON.
 * @param outDir - destination directory for `<Model>.ts` + `index.ts`.
 */
export async function generateResources(swagger: any, outDir: string): Promise<string[]> {
  const dirPath = path.resolve(process.cwd(), outDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const definitions = swagger.definitions || {};
  const paths = swagger.paths || {};

  // Group swagger paths by first segment. A group is a resource only when it
  // has a GET collection path (/{route}/) — lone action paths such as
  // /jev/decide/ are skipped. /auth/* is the login resource (_auth_).
  const groups = new Map<string, string[]>();
  for (const p of Object.keys(paths)) {
    const r = routeOf(p);
    if (!r || r === "swagger") continue;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(p);
  }

  const files: string[] = [];
  const models: string[] = [];

  const emit = async (fileName: string, content: string) => {
    let file = await prettier.format(content, PRETTIER_CONFIG as any);
    file = file.replaceAll("// prettier-ignore", "");
    fs.writeFileSync(path.join(dirPath, `${fileName}.ts`), file, "utf8");
    files.push(fileName);
  };

  const filterableFrom = (listVerbs: any): string[] => {
    const out: string[] = [];
    const params = listVerbs?.get?.parameters || [];
    for (const param of params) {
      if (
        param?.in === "query" &&
        typeof param?.name === "string" &&
        !NON_FIELD_PARAMS.has(param.name) &&
        !out.includes(param.name)
      ) {
        out.push(param.name);
      }
    }
    return out;
  };

  for (const [route, groupPaths] of groups) {
    if (route === "auth") {
      // /auth/login/ POST body schema feeds the _auth_ resource (login form
      // posts {email, password} via useRItem + url override).
      const loginDef = definitions["Login"] || { properties: {} };
      const related = groupPaths.includes("/auth/logout/")
        ? [...groupPaths]
        : [...groupPaths, "/auth/logout/"];
      await emit("_auth_", generateResourceFile(loginDef, "", "/auth/", related, "_auth_", []));
      models.push("_auth_");
      continue;
    }

    const collection = `/${route}/`;
    if (!paths[collection]?.get) continue;

    const verbs = paths[collection];
    let resource: any = { properties: {} };
    let modelOb = findResourceModel(resource, verbs, definitions, "");
    if (!modelOb.resourceDefinition) {
      // Merge verbs from related paths (detail + sub-actions) and retry, so
      // POST-only shapes still resolve a model.
      const merged: any = { ...verbs };
      for (const p of groupPaths) Object.assign(merged, paths[p]);
      modelOb = findResourceModel({ properties: {} }, merged, definitions, "");
    }
    if (!modelOb.resourceDefinition) {
      console.log(`Skipping /${route}/: no model found in swagger`);
      continue;
    }

    const model = modelOb.resourceDefinition;
    const detail = `/${route}/{id}/`;
    const related = paths[detail] ? [collection, detail] : [collection];
    await emit(
      model,
      generateResourceFile(modelOb.resource, model, collection, related, model, filterableFrom(verbs))
    );
    models.push(model);
  }

  // Barrel keeps the hand style (per-file exports + `resources` object):
  // preserve existing member order, drop stale ones, append new models.
  const indexPath = path.join(dirPath, "index.ts");
  const existing: string[] = [];
  if (fs.existsSync(indexPath)) {
    const current = fs.readFileSync(indexPath, "utf8");
    for (const m of current.matchAll(/export\s*\{\s*(\w+)\s*\}\s*from\s*"\.\/\1"/g)) {
      existing.push(m[1]);
    }
  }
  const ordered = [...existing.filter((m) => models.includes(m)), ...models.filter((m) => !existing.includes(m))];
  const barrel = [
    ...ordered.map((m) => `export { ${m} } from "./${m}";`),
    "",
    ...ordered.map((m) => `import { ${m} } from "./${m}";`),
    "",
    "export const resources = {",
    ...ordered.map((m) => `  ${m},`),
    "};",
    "",
  ].join("\n");
  fs.writeFileSync(indexPath, await prettier.format(barrel, PRETTIER_CONFIG as any), "utf8");

  return files;
}
