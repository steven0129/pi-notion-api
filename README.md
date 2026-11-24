# Pi Notion Tools

An installable Pi package that calls the Notion API directly. It does not use MCP.

## Installation

Install from a local copy of this package:

```shell
pi install .
```

After publishing to npm, install with `pi install npm:pi-notion-tools`. To share it through GitHub, use `pi install git:OWNER/REPOSITORY@TAG`.

## Setup

1. Create a Notion integration and grant it read, insert, and update content capabilities.
2. Share each page or database the integration should access with that integration.
3. Set a Windows user environment variable named `NOTION_API_KEY`. Do not put the secret in project files.
4. Restart VS Code or the terminal after setting the variable, then start Pi. Approve the package when Pi asks whether to trust it.

The extension uses Notion API version `2026-03-11`.

The root `notion.ts` file is the Pi entry point. The API client and tool groups are organized as classes under `src/`.

## Tools

- `notion_search`: Search accessible pages or data sources by title.
- `notion_page`: Retrieve, create, update, trash, or restore pages. `properties_json` accepts JSON page properties. New pages can also take `children_json` or Markdown.
- `notion_database`: Create, retrieve, update, trash, or restore databases; retrieve or update a data-source schema; and query rows. Creating a database also creates its first data source. Use `data_sources[].id` from the database response to work with a specific schema or query rows.
- `notion_page_content`: List or append page blocks, update a block, or move a block to the trash.

Pass valid Notion API JSON strings for `parent_json`, `properties_json`, `children_json`, `filter_json`, `sorts_json`, `title_json`, `description_json`, and `block_json`. If a response contains `next_cursor`, pass it back as `startCursor` to fetch the next page.

Trash and block-delete actions show a confirmation dialog. Notion API deletion moves resources to the trash; it does not permanently erase pages.
