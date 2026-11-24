import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { NotionClient } from "./src/notion-client.js";
import { NotionDatabaseTools } from "./src/tools/database-tools.js";
import { NotionPageContentTools } from "./src/tools/page-content-tools.js";
import { NotionPageTools } from "./src/tools/page-tools.js";
import { NotionSearchTools } from "./src/tools/search-tools.js";

export default function (pi: ExtensionAPI) {
	const client = new NotionClient();
	new NotionSearchTools(client).register(pi);
	new NotionPageTools(client).register(pi);
	new NotionDatabaseTools(client).register(pi);
	new NotionPageContentTools(client).register(pi);
}
