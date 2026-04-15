import { z } from 'zod'
import type { RendshotClient } from '@rendshot/sdk'

export const getTemplateSchema = {
  template_id: z.string().describe('Template ID (e.g. tpl_abc123)'),
}

export const getTemplateToolMeta = {
  name: 'get_template',
  description: 'Get detailed information about a template, including its variable definitions. Use this before generate_image to know which variables to pass.',
}

export async function handleGetTemplate(
  client: RendshotClient,
  args: z.objectOutputType<typeof getTemplateSchema, z.ZodTypeAny>,
) {
  const t = await client.getTemplate(args.template_id)

  const varLines = t.variables.map((v) => {
    const req = v.required ? ' (required)' : ''
    const opts = v.options ? ` options: [${v.options.join(', ')}]` : ''
    return `  - ${v.key} (${v.type})${req}: default="${v.default}"${opts}`
  })

  const text = [
    `Template: ${t.name} (${t.id})`,
    t.description ? `Description: ${t.description}` : null,
    `Platform: ${t.platform}`,
    `Size: ${t.width}x${t.height}`,
    t.tags.length > 0 ? `Tags: ${t.tags.join(', ')}` : null,
    `Author: ${t.author.name ?? 'Unknown'}`,
    '',
    varLines.length > 0 ? `Variables (${varLines.length}):\n${varLines.join('\n')}` : 'No variables.',
  ].filter(Boolean).join('\n')

  return { content: [{ type: 'text' as const, text }] }
}
