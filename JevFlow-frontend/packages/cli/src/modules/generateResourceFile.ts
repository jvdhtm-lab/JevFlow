
/**
 * Get resource Item for specific resources.
 *  @param element - fields associated with model in swagger docs.
 *  @param model - model name.
 *  @param choosenPath - base url.
 *  @param relatedPath - related urls.
 *  @param fileName - file name.
 */
function convertNumericEnums(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => convertNumericEnums(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (key === 'enum' && Array.isArray(obj[key])) {
        newObj[key] = obj[key].map((item: any) =>
          typeof item === 'number' ? String(item) : item
        );
      } else {
        newObj[key] = convertNumericEnums(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// Fields drf-yasg hides from the response schema (writeOnly) that the UI
// still needs (e.g. node inspector posts auth_token on hook create).
const WRITE_ONLY_EXTRAS: Record<string, Record<string, any>> = {
  WebhookEndpoint: {
    auth_token: { title: "Auth token", type: "string" },
  },
};

export function generateResourceFile(
    resource: any,
    model: string,
    choosenPath: string,
    relatedPath: string[],
    fileName: string,
    filterableFields: string[] = []
  ): string {
    let file = "";
    let definitionsTowrite = "any";
    let name = `${fileName}`;
    file = "";
    if (model) {
      file += ` import type { Models, ResourceObject } from "../../types";
      `;
      name = `${model}`;
      definitionsTowrite = `Models["${model}"]`;
    } else {
      file += `import type { ResourceObject } from "../../types";`;
    }

    file += `
    const mockType = (): ${definitionsTowrite} | undefined => {
      return;
    };
    `;

    const processedProperties = convertNumericEnums(resource.properties);

    // Our swagger marks FK targets as x-jevflow-relatedResource; the shared
    // DynamicForm/RelatedFieldInput auto-detection reads x-vhrs-relatedResource
    // (VHRS pattern), so normalize the key on emit.
    for (const fieldName of Object.keys(processedProperties)) {
      const prop = processedProperties[fieldName];
      if (prop && typeof prop === "object" && !Array.isArray(prop)) {
        if (prop["x-jevflow-relatedResource"] && !prop["x-vhrs-relatedResource"]) {
          prop["x-vhrs-relatedResource"] = prop["x-jevflow-relatedResource"];
          delete prop["x-jevflow-relatedResource"];
        }
      }
    }

    // Mark fields the Django API accepts as list filters (from swagger query
    // params) so tables can generate backend filters automatically.
    for (const fieldName of filterableFields) {
      const prop = processedProperties[fieldName];
      if (prop && typeof prop === "object" && !Array.isArray(prop)) {
        prop.filterable = true;
      }
    }

    // Backend-declared sortable fields (x-vhrs-sortable from the swagger
    // sortableFieldInspector) become sortable columns automatically. Manual
    // `sortable` flags in annotations still work as overrides.
    for (const fieldName of Object.keys(processedProperties)) {
      const prop = processedProperties[fieldName];
      if (prop && typeof prop === "object" && !Array.isArray(prop)) {
        if (prop["x-vhrs-sortable"]) {
          prop.sortable = true;
        }
      }
    }

    Object.assign(processedProperties, WRITE_ONLY_EXTRAS[model] ?? {});

    file += `
    export const ${fileName}:ResourceObject = {
      baseUrl: "${choosenPath}",
      relatedurls: ${JSON.stringify(relatedPath)},
      name: "${name}",
      type: mockType,
      fields: ${JSON.stringify(processedProperties)},
      `;
    if (resource.required) {
      file += `
      required: ${JSON.stringify(resource.required)} ,`;
    }
    file += `
    }`;
    return file;
  }
