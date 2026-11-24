import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { NotionClient } from "../notion-client.js";

export class NotionSearchTools {
	constructor(private readonly client: NotionClient) {}

	register(pi: ExtensionAPI): void {
		const client = this.client;
		pi.registerTool({
			name: "notion_search",
			label: "Notion Search",
			description: "Search accessible Notion pages or data sources by title.",
			parameters: Type.Object({
				query: Type.Optional(Type.String({ description: "Title or text to search for." })),
				objectType: Type.Optional(Type.Union([Type.Literal("page"), Type.Literal("data_source")])),
				pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
				startCursor: Type.Optional(Type.String()),
			}),
			async execute(_id, params, signal) {
				const body: Record<string, unknown> = { page_size: params.pageSize ?? 50 };
				if (params.query) body.query = params.query;
				if (params.startCursor) body.start_cursor = params.startCursor;
				if (params.objectType) body.filter = { property: "object", value: params.objectType };
				const result = await client.request("POST", "/search", body, signal);
				return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
			},
		});
	}
}
