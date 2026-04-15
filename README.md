# @rendshot/mcp

[MCP](https://modelcontextprotocol.io) server for [RendShot](https://rendshot.ai) — expose HTML-to-image rendering, URL screenshots, and template management as tools for AI agents.

[![npm](https://img.shields.io/npm/v/@rendshot/mcp)](https://www.npmjs.com/package/@rendshot/mcp)
[![License](https://img.shields.io/github/license/RendShotTeam/rendshot-mcp)](LICENSE)

## Installation

```bash
npm install -g @rendshot/mcp
```

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rendshot": {
      "command": "npx",
      "args": ["-y", "@rendshot/mcp"],
      "env": {
        "RENDSHOT_API_KEY": "rs_live_..."
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add rendshot -- npx -y @rendshot/mcp
```

Set the API key in your environment:

```bash
export RENDSHOT_API_KEY=rs_live_...
```

### Cursor / VS Code

Add to MCP settings:

```json
{
  "rendshot": {
    "command": "npx",
    "args": ["-y", "@rendshot/mcp"],
    "env": {
      "RENDSHOT_API_KEY": "rs_live_..."
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Render HTML/CSS or a template to an image |
| `screenshot_url` | Take a screenshot of any URL |
| `list_templates` | Browse published templates with filtering |
| `get_template` | Get template details and variable definitions |
| `create_template` | Create a new reusable template |

### generate_image

Render HTML to an image, or use a template with variables:

```
"Generate an image from this HTML: <h1>Hello World</h1>"
"Use template tpl_abc123 with title='Launch Day'"
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `html` | `string` | * | HTML to render (XOR with template_id) |
| `template_id` | `string` | * | Template ID (XOR with html) |
| `variables` | `object` | — | Template variables |
| `css` | `string` | — | CSS styles |
| `width` | `number` | — | Width (1–4096, default 1080) |
| `height` | `number` | — | Height (1–4096, default 1080) |
| `format` | `png \| jpg` | — | Output format |
| `quality` | `number` | — | JPEG quality (1–100) |
| `deviceScale` | `1 \| 2 \| 3` | — | Device pixel ratio |

### screenshot_url

```
"Screenshot https://example.com at 1440x900"
"Take a full-page screenshot of https://github.com"
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `string` | yes | URL to screenshot |
| `width` | `number` | — | Viewport width |
| `height` | `number` | — | Viewport height |
| `fullPage` | `boolean` | — | Capture full page |
| `format` | `png \| jpg` | — | Output format |

### list_templates

```
"Show me xiaohongshu templates"
"Search templates for 'blog cover'"
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | `string` | Filter by platform |
| `category` | `string` | Filter by category |
| `q` | `string` | Search query |
| `limit` | `number` | Results per page |

### get_template

```
"Get details for template tpl_abc123"
```

### create_template

```
"Create a template named 'Blog Header' with this HTML and a title variable"
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RENDSHOT_API_KEY` | yes | — | Your API key (`rs_live_...`) |
| `RENDSHOT_API_URL` | no | `https://api.rendshot.ai` | API base URL |

## License

MIT
