import * as fs from "fs";
import * as path from "path";
import prettier from "prettier";
import { PRETTIER_CONFIG } from "../constants/Config";

const SKIP_PREFIXES = ["Patched"];

const tsTypeOf = (prop: any): string => {
  if (!prop || typeof prop !== "object") return "unknown";
  if (Array.isArray(prop.enum)) {
    return prop.enum.map((v: any) => (typeof v === "string" ? JSON.stringify(v) : String(v))).join(" | ") || "unknown";
  }
  if (prop.$ref) {
    return String(prop.$ref).replace("#/definitions/", "");
  }
  const nullable = prop["x-nullable"] ? " | null" : "";
  switch (prop.type) {
    case "integer":
    case "number":
      return `number${nullable}`;
    case "boolean":
      return `boolean${nullable}`;
    case "object":
      return `Record<string, unknown>${nullable}`;
    case "array": {
      const items = prop.items || {};
      if (items.$ref) return `${String(items.$ref).replace("#/definitions/", "")}[]${nullable}`;
      return `unknown[]${nullable}`;
    }
    default:
      return `string${nullable}`;
  }
};

/**
 * Emit Models.ts from Swagger definitions in the shape annotates consume:
 * one interface per model (all props optional) plus a `definitions` map.
 * @param swagger - the fetched Swagger JSON.
 * @param outDir - destination directory for `Models.ts`.
 */
export async function generateSchemas(swagger: any, outDir: string): Promise<string> {
  const dirPath = path.resolve(process.cwd(), outDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const defs = swagger.definitions || {};
  const names = Object.keys(defs).filter((n) => !SKIP_PREFIXES.some((p) => n.startsWith(p)));

  const out: string[] = [
    "// Auto-generated from Swagger — do not edit by hand. Run `npm run buildResources` in packages/cli.",
  ];
  for (const name of names) {
    const props = defs[name]?.properties || {};
    out.push(`export interface ${name} {`);
    for (const propName of Object.keys(props)) {
      out.push(`  ${propName}?: ${tsTypeOf(props[propName])};`);
    }
    out.push("}");
  }
  out.push("export interface definitions {");
  for (const name of names) {
    out.push(`  ${name}: ${name};`);
  }
  out.push("}");

  const content = await prettier.format(out.join("\n") + "\n", PRETTIER_CONFIG as any);
  fs.writeFileSync(path.join(dirPath, "Models.ts"), content, "utf8");
  return content;
}
