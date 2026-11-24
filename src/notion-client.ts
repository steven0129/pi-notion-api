const API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";

export type JsonObject = Record<string, unknown>;
export type NotionMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class NotionClient {
	buildPath(path: string, values: Record<string, string | number | undefined>): string {
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(values)) {
			if (value !== undefined) query.set(key, String(value));
		}
		const suffix = query.toString();
		return suffix ? `${path}?${suffix}` : path;
	}

	async request(
		method: NotionMethod,
		path: string,
		body?: JsonObject,
		signal?: AbortSignal,
	): Promise<unknown> {
		const token = process.env.NOTION_API_KEY;
		if (!token) throw new Error("NOTION_API_KEY is not set in the environment.");

		const response = await fetch(`${API_BASE}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				"Notion-Version": NOTION_VERSION,
				"Content-Type": "application/json",
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal,
		});
		const text = await response.text();
		let data: unknown = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch (error) {
				throw new Error(`Notion returned invalid JSON (${response.status}): ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		if (!response.ok) {
			throw new Error(`Notion API error ${response.status}: ${text || response.statusText}`);
		}
		return data;
	}
}
