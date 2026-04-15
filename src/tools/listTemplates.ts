import { z } from 'zod'
import type { RendshotClient } from '@rendshot/sdk'

export const listTemplatesSchema = {
  platform: z.string().optional().describe('Filter by platform (e.g. twitter, instagram, custom)'),
  category: z.string().optional().describe('Filter by category'),
  q: z.string().optional().describe('Search by name or description'),
  limit: z.number().optional().describe('Max results 1-50 (default 20)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
}

export const listTemplatesToolMeta = {
  name: 'list_templates',
  description: 'Browse available image templates. Returns template IDs, names, dimensions, and variable counts. Use get_template for full variable details.',
}

export async function handleListTemplates(
  client: RendshotClient,
  args: z.objectOutputType<typeof listTemplatesSchema, z.ZodTypeAny>,
) {
  const result = await client.listTemplates(args)

  if (result.templates.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No templates found matching the criteria.' }],
    }
  }

  const lines = result.templates.map((t) => {
    const vars = t.variables.map((v) => `${v.key}(${v.type})`).join(', ')
    return `- ${t.id}: ${t.name} (${t.width}x${t.height}) — variables: ${vars || 'none'}`
  })

  let text = `Found ${result.templates.length} template(s):\n\n${lines.join('\n')}`
  if (result.nextCursor) {
    text += `\n\nMore results available — pass cursor: "${result.nextCursor}"`
  }

  return { content: [{ type: 'text' as const, text }] }
}
