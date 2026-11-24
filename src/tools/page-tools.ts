import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { NotionClient } from "../notion-client.js";

async function confirmTrash(ctx: ExtensionToolContext, message: string): Promise<void> {
	if (!ctx.hasUI) throw new Error("A confirmation dialog is unavailable; refusing to move this resource to trash.");
	if (!(await ctx.ui.confirm("Confirm Notion deletion", message))) throw new Error("Operation cancelled.");
}

export class NotionPageTools {
	constructor(private readonly client: NotionClient) {}

	register(pi: ExtensionAPI): void {
		const client = this.client;
		pi.registerTool({
			name: "notion_page",
			label: "Notion Page",
			description: "Retrieve, create, update, trash, or restore a Notion page.",
			parameters: Type.Object({
				action: Type.Union([
					Type.Literal("retrieve"), Type.Literal("create"), Type.Literal("update"),
					Type.Literal("trash"), Type.Literal("restore"),
				]),
				pageId: Type.Optional(Type.String()),
				parent_json: Type.Optional(Type.String({ description: "JSON parent object required for create." })),
				properties_json: Type.Optional(Type.String({ description: "JSON page properties object." })),
				children_json: Type.Optional(Type.String({ description: "JSON array of child blocks." })),
				markdown: Type.Optional(Type.String({ description: "Markdown content for a new page." })),
			}),
			async execute(_id, params, signal, _onUpdate, ctx) {
				if (params.action === "create") {
					if (!params.parent_json) throw new Error("parent_json is required.");
					if (!params.properties_json) throw new Error("properties_json is required.");
					const parent: unknown = JSON.parse(params.parent_json);
					if (typeof parent !== "object" || parent === null || Array.isArray(parent)) {
						throw new Error("parent_json must be a JSON object.");
					}
					const properties: unknown = JSON.parse(params.properties_json);
					if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
						throw new Error("properties_json must be a JSON object.");
					}
					const body: Record<string, unknown> = {
						parent: { ...parent },
						properties: { ...properties },
					};
					if (params.children_json && params.markdown) {
						throw new Error("Provide either children_json or markdown, not both.");
					}
					if (params.children_json) {
						const children: unknown = JSON.parse(params.children_json);
						if (!Array.isArray(children)) throw new Error("children_json must be a JSON array.");
						body.children = children;
					}
					if (params.markdown) body.markdown = params.markdown;
					const result = await client.request("POST", "/pages", body, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}

				if (!params.pageId) throw new Error("pageId is required for this action.");
				const path = `/pages/${encodeURIComponent(params.pageId)}`;
				if (params.action === "retrieve") {
					const result = await client.request("GET", path, undefined, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "update") {
					if (!params.properties_json) throw new Error("properties_json is required.");
					const properties: unknown = JSON.parse(params.properties_json);
					if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
						throw new Error("properties_json must be a JSON object.");
					}
					const result = await client.request("PATCH", path, { properties: { ...properties } }, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "trash") {
					await confirmTrash(ctx, `Move page ${params.pageId} to the Notion trash?`);
					const result = await client.request("PATCH", path, { in_trash: true }, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				const result = await client.request("PATCH", path, { in_trash: false }, signal);
				return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
			},
		});
	}
}
