import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { NotionClient } from "../notion-client.js";

async function confirmTrash(ctx: ExtensionToolContext, message: string): Promise<void> {
	if (!ctx.hasUI) throw new Error("A confirmation dialog is unavailable; refusing to move this resource to trash.");
	if (!(await ctx.ui.confirm("Confirm Notion deletion", message))) throw new Error("Operation cancelled.");
}

export class NotionDatabaseTools {
	constructor(private readonly client: NotionClient) {}

	register(pi: ExtensionAPI): void {
		const client = this.client;
		pi.registerTool({
			name: "notion_database",
			label: "Notion Database",
			description: "Create, retrieve, update, trash, or restore databases; inspect or update data-source schemas; query database rows.",
			parameters: Type.Object({
				action: Type.Union([
					Type.Literal("create"), Type.Literal("retrieve"), Type.Literal("update"),
					Type.Literal("trash"), Type.Literal("restore"), Type.Literal("query"),
					Type.Literal("retrieve_data_source"), Type.Literal("update_data_source"),
				]),
				databaseId: Type.Optional(Type.String()),
				dataSourceId: Type.Optional(Type.String()),
				parent_json: Type.Optional(Type.String({ description: "JSON parent object required to create a database." })),
				title_json: Type.Optional(Type.String({ description: "JSON array of rich-text objects used as the database title." })),
				description_json: Type.Optional(Type.String({ description: "JSON array of rich-text objects." })),
				properties_json: Type.Optional(Type.String({ description: "JSON data-source property schema object." })),
				filter_json: Type.Optional(Type.String({ description: "JSON query filter object." })),
				sorts_json: Type.Optional(Type.String({ description: "JSON array of sort objects." })),
				pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
				startCursor: Type.Optional(Type.String()),
			}),
			async execute(_id, params, signal, _onUpdate, ctx) {
				if (params.action === "create") {
					if (!params.parent_json) throw new Error("parent_json is required.");
					if (!params.title_json) throw new Error("title_json is required.");
					if (!params.properties_json) throw new Error("properties_json is required.");
					const parent: unknown = JSON.parse(params.parent_json);
					if (typeof parent !== "object" || parent === null || Array.isArray(parent)) {
						throw new Error("parent_json must be a JSON object.");
					}
					const title: unknown = JSON.parse(params.title_json);
					if (!Array.isArray(title)) throw new Error("title_json must be a JSON array.");
					const properties: unknown = JSON.parse(params.properties_json);
					if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
						throw new Error("properties_json must be a JSON object.");
					}
					const body: Record<string, unknown> = {
						parent: { ...parent },
						title,
						initial_data_source: { properties: { ...properties } },
					};
					if (params.description_json) {
						const description: unknown = JSON.parse(params.description_json);
						if (!Array.isArray(description)) throw new Error("description_json must be a JSON array.");
						body.description = description;
					}
					const result = await client.request("POST", "/databases", body, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}

				if (params.action === "retrieve_data_source" || params.action === "update_data_source" || params.action === "query") {
					if (!params.dataSourceId) throw new Error("dataSourceId is required for this action.");
					const sourcePath = `/data_sources/${encodeURIComponent(params.dataSourceId)}`;
					if (params.action === "retrieve_data_source") {
						const result = await client.request("GET", sourcePath, undefined, signal);
						return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
					}
					if (params.action === "update_data_source") {
						if (!params.properties_json) throw new Error("properties_json is required.");
						const properties: unknown = JSON.parse(params.properties_json);
						if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
							throw new Error("properties_json must be a JSON object.");
						}
						const result = await client.request("PATCH", sourcePath, { properties: { ...properties } }, signal);
						return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
					}
					const body: Record<string, unknown> = {};
					if (params.filter_json) {
						const filter: unknown = JSON.parse(params.filter_json);
						if (typeof filter !== "object" || filter === null || Array.isArray(filter)) {
							throw new Error("filter_json must be a JSON object.");
						}
						body.filter = { ...filter };
					}
					if (params.sorts_json) {
						const sorts: unknown = JSON.parse(params.sorts_json);
						if (!Array.isArray(sorts)) throw new Error("sorts_json must be a JSON array.");
						body.sorts = sorts;
					}
					if (params.startCursor) body.start_cursor = params.startCursor;
					if (params.pageSize !== undefined) body.page_size = params.pageSize;
					const result = await client.request("POST", `${sourcePath}/query`, body, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}

				if (!params.databaseId) throw new Error("databaseId is required for this action.");
				const path = `/databases/${encodeURIComponent(params.databaseId)}`;
				if (params.action === "retrieve") {
					const result = await client.request("GET", path, undefined, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "update") {
					const body: Record<string, unknown> = {};
					if (params.title_json) {
						const title: unknown = JSON.parse(params.title_json);
						if (!Array.isArray(title)) throw new Error("title_json must be a JSON array.");
						body.title = title;
					}
					if (params.description_json) {
						const description: unknown = JSON.parse(params.description_json);
						if (!Array.isArray(description)) throw new Error("description_json must be a JSON array.");
						body.description = description;
					}
					if (Object.keys(body).length === 0) throw new Error("Provide title_json or description_json to update.");
					const result = await client.request("PATCH", path, body, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "trash") {
					await confirmTrash(ctx, `Move database ${params.databaseId} to the Notion trash?`);
					const result = await client.request("PATCH", path, { in_trash: true }, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				const result = await client.request("PATCH", path, { in_trash: false }, signal);
				return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
			},
		});
	}
}
