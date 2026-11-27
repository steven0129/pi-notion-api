import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { NotionClient } from "../notion-client.js";

async function confirmTrash(ctx: ExtensionToolContext, message: string): Promise<void> {
	if (!ctx.hasUI) throw new Error("A confirmation dialog is unavailable; refusing to move this resource to trash.");
	if (!(await ctx.ui.confirm("Confirm Notion deletion", message))) throw new Error("Operation cancelled.");
}

export class NotionPageContentTools {
	constructor(private readonly client: NotionClient) {}

	register(pi: ExtensionAPI): void {
		const client = this.client;
		pi.registerTool({
			name: "notion_page_content",
			label: "Notion Page Content",
			description: "List or append page blocks, update a block, or move a block to the trash.",
			parameters: Type.Object({
				action: Type.Union([Type.Literal("list"), Type.Literal("append"), Type.Literal("update"), Type.Literal("delete")]),
				blockId: Type.Optional(Type.String({ description: "Page or block ID to list or append children under, or target block ID." })),
				children_json: Type.Optional(Type.String({ description: "JSON array of blocks to append." })),
				block_json: Type.Optional(Type.String({ description: "JSON block fields to update." })),
				pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
				startCursor: Type.Optional(Type.String({ description: "Opaque cursor returned as next_cursor; omit for the first page." })),
			}),
			async execute(_id, params, signal, _onUpdate, ctx) {
				if (!params.blockId) throw new Error("blockId is required for this action.");
				const path = `/blocks/${encodeURIComponent(params.blockId)}`;
				if (params.action === "list") {
					const childrenPath = client.buildPath(`${path}/children`, {
						page_size: params.pageSize ?? 100,
						start_cursor: params.startCursor || undefined,
					});
					const result = await client.request("GET", childrenPath, undefined, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "append") {
					if (!params.children_json) throw new Error("children_json is required.");
					const children: unknown = JSON.parse(params.children_json);
					if (!Array.isArray(children)) throw new Error("children_json must be a JSON array.");
					const result = await client.request("PATCH", `${path}/children`, { children }, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				if (params.action === "update") {
					if (!params.block_json) throw new Error("block_json is required.");
					const block: unknown = JSON.parse(params.block_json);
					if (typeof block !== "object" || block === null || Array.isArray(block)) {
						throw new Error("block_json must be a JSON object.");
					}
					const blockFields: Record<string, unknown> = { ...block };
					const result = await client.request("PATCH", path, blockFields, signal);
					return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
				}
				await confirmTrash(ctx, `Move block ${params.blockId} to the Notion trash?`);
				const result = await client.request("DELETE", path, undefined, signal);
				return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) ?? "null" }], details: {} };
			},
		});
	}
}
