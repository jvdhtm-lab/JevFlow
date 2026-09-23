import axios from "axios";
import { BASE_URL, SWAGGER_ENDPOINT } from "./constants/Config";
import { generateResources } from "./modules/generateResources";
import { generateSchemas } from "./modules/generateSchemas";

async function main() {
  const url = `${BASE_URL}/${SWAGGER_ENDPOINT}`;
  console.log(`Fetching swagger from ${url}`);
  const { data } = await axios.get(url);
  const files = await generateResources(data, "../resources/src/servers/resources");
  console.log(`Generated ${files.length} resources: ${files.join(", ")}`);
  await generateSchemas(data, "../resources/src/servers/types");
  console.log(`Schemas written to ../resources/src/servers/types/Models.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
