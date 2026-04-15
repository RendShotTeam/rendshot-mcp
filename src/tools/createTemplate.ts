import { z } from 'zod'
import type { RendshotClient } from '@rendshot/sdk'

// Variable schema — align with SDK/API TemplateVariable
const templateVariableSchema = z.object({
  key: z.string().describe('Variable key in snake_case, matching {{key}} in HTML'),
  type: z.enum(['text', 'image', 'color', 'number', 'select']),
  label: z.string().describe('Human-readable label'),
  default: z.union([z.string(), z.number()]).describe('Default value'),
  required: z.boolean().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
})

export const createTemplateSchema = {
  name: z.string().min(1).max(100).describe('Template name'),
  html: z.string().min(1).describe('HTML content with {{variable}} placeholders'),
  variables: z.array(templateVariableSchema).describe('Variable definitions'),
  description: z.string().optional().describe('Template description'),
  platform: z.string().optional().describe('Platform preset (xiaohongshu, instagram_post, etc.)'),
  category: z.string().optional().describe('Category'),
  tags: z.array(z.string()).optional().describe('Tags for discovery'),
  width: z.number().optional().describe('Width in pixels'),
  height: z.number().optional().describe('Height in pixels'),
  css: z.string().optional().describe('Optional CSS styles'),
  fonts: z.array(z.string()).optional().describe('Custom fonts'),
  visibility: z.enum(['public', 'private']).optional().describe('public or private (default private)'),
}

export const createTemplateToolMeta = {
  name: 'create_template',
  description: `Save an HTML template for reuse.

Typically used after generate_image returns an AI-generated template you want to keep.
Templates are created as private drafts — publish them through the web dashboard if you
want them to appear in the public gallery.

Example workflow:
1. Call generate_image with a prompt to get an AI-generated design
2. If satisfied, call create_template with the returned html and variables
3. Use the new template_id in future generate_image calls for faster, deterministic results`,
}

export async function handleCreateTemplate(
  client: RendshotClient,
  args: z.objectOutputType<typeof createTemplateSchema, z.ZodTypeAny>,
) {
  const tpl = await client.createTemplate({
    name: args.name,
    html: args.html,
    variables: args.variables as any, // Zod inferred type vs SDK TemplateVariable — known shape match
    description: args.description,
    platform: args.platform,
    category: args.category,
    tags: args.tags,
    width: args.width,
    height: args.height,
    css: args.css,
    fonts: args.fonts,
    visibility: args.visibility,
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: [
          '✓ Template created',
          '',
          `ID: ${tpl.id}`,
          `Name: ${tpl.name}`,
          `Status: ${tpl.status} (visibility: ${tpl.visibility})`,
          `Size: ${tpl.width}x${tpl.height}`,
          '',
          'Use this template ID in future generate_image calls:',
          `  generate_image({ template_id: "${tpl.id}", variables: { ... } })`,
        ].join('\n'),
      },
    ],
    structuredContent: tpl as unknown as Record<string, unknown>,
  }
}
