#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { RendshotClient } from '@rendshot/sdk'
import {
  generateImageSchema,
  generateImageToolMeta,
  handleGenerateImage,
} from './tools/generateImage.js'
import {
  screenshotUrlSchema,
  screenshotUrlToolMeta,
  handleScreenshotUrl,
} from './tools/screenshotUrl.js'
import {
  listTemplatesSchema,
  listTemplatesToolMeta,
  handleListTemplates,
} from './tools/listTemplates.js'
import {
  getTemplateSchema,
  getTemplateToolMeta,
  handleGetTemplate,
} from './tools/getTemplate.js'
import {
  createTemplateSchema,
  createTemplateToolMeta,
  handleCreateTemplate,
} from './tools/createTemplate.js'

const apiKey = process.env.RENDSHOT_API_KEY
const apiUrl = process.env.RENDSHOT_API_URL || 'https://api.rendshot.ai'

if (!apiKey) {
  console.error('RENDSHOT_API_KEY environment variable is required')
  process.exit(1)
}

const client = new RendshotClient({ apiKey, baseUrl: apiUrl })

const server = new McpServer({
  name: 'rendshot',
  version: '0.3.0',
})

server.tool(
  generateImageToolMeta.name,
  generateImageToolMeta.description,
  generateImageSchema,
  async (args) => handleGenerateImage(client, args),
)

server.tool(
  screenshotUrlToolMeta.name,
  screenshotUrlToolMeta.description,
  screenshotUrlSchema,
  async (args) => handleScreenshotUrl(client, args),
)

server.tool(
  listTemplatesToolMeta.name,
  listTemplatesToolMeta.description,
  listTemplatesSchema,
  async (args) => handleListTemplates(client, args),
)

server.tool(
  getTemplateToolMeta.name,
  getTemplateToolMeta.description,
  getTemplateSchema,
  async (args) => handleGetTemplate(client, args),
)

server.tool(
  createTemplateToolMeta.name,
  createTemplateToolMeta.description,
  createTemplateSchema,
  async (args) => handleCreateTemplate(client, args),
)

const transport = new StdioServerTransport()
await server.connect(transport)
