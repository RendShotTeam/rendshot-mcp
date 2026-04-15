import { z } from 'zod'
import type { RendshotClient, ImageResult } from '@rendshot/sdk'

export const generateImageSchema = {
  html: z.string().optional().describe('HTML content to render (provide this OR template_id, not both)'),
  template_id: z.string().optional().describe('Template ID (e.g. tpl_abc123) — use list_templates to find available templates'),
  variables: z.record(z.string(), z.unknown()).optional().describe('Template variables as key-value pairs — use get_template to see available variables'),
  css: z.string().optional().describe('Optional CSS styles'),
  width: z.number().optional().describe('Image width in pixels (default 1080)'),
  height: z.number().optional().describe('Image height in pixels (default 1080)'),
  format: z.enum(['png', 'jpg']).optional().describe('Output format (default png)'),
  quality: z.number().optional().describe('Quality 1-100 for jpg (default 90)'),
  deviceScale: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe('Device scale factor (default 1)'),
  fonts: z.array(z.string()).optional().describe('Custom fonts to load (e.g. ["Inter", "Roboto"])'),
  timeout: z.number().optional().describe('Render timeout in ms (default 10000)'),
  prompt: z.string().optional().describe(
    'Natural language prompt for AI to generate the template from scratch. ' +
    'Use this when you do not have HTML or a template ID. ' +
    'Can be combined with template_id to generate a new layout matching that template\'s visual style.'
  ),
  platform: z.string().optional().describe(
    'Platform preset (xiaohongshu, instagram_post, twitter_card, etc.) — influences AI layout style when using prompt.'
  ),
  locale: z.enum(['zh', 'en']).optional().describe('Response language (default zh)'),
}

export const generateImageToolMeta = {
  name: 'generate_image',
  description: 'Render HTML/CSS, a template, or an AI-generated design from a natural language prompt to an image. Provide ONE of: html, template_id, or prompt. prompt+template_id is allowed (style reference). Use list_templates/get_template to discover templates; for AI prompts, specify platform to match style guides.',
}

export async function handleGenerateImage(
  client: RendshotClient,
  args: z.objectOutputType<typeof generateImageSchema, z.ZodTypeAny>,
) {
  const hasPrompt = !!args.prompt
  const hasHtml = !!args.html
  const hasTemplate = !!args.template_id

  if (!hasPrompt && !hasHtml && !hasTemplate) {
    return {
      content: [{ type: 'text' as const, text: 'Error: Provide either html or template_id' }],
      isError: true,
    }
  }
  if (hasPrompt && hasHtml) {
    return {
      content: [{ type: 'text' as const, text: 'Error: cannot combine prompt with html (prompt + template_id is allowed as style reference)' }],
      isError: true,
    }
  }
  if (hasHtml && hasTemplate) {
    return {
      content: [{ type: 'text' as const, text: 'Error: Provide either html or template_id, not both' }],
      isError: true,
    }
  }

  // AI prompt mode
  if (hasPrompt) {
    const result = await client.aiRender({
      prompt: args.prompt!,
      platform: args.platform,
      templateId: args.template_id,
      width: args.width,
      height: args.height,
      format: args.format,
      quality: args.quality,
      deviceScale: args.deviceScale,
      fonts: args.fonts,
      locale: args.locale,
      timeout: args.timeout,
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `Image generated successfully!`,
            `URL: ${result.url}`,
            `Size: ${result.width}x${result.height} ${result.format}`,
            `File size: ${result.size} bytes`,
            ``,
            `AI-generated template HTML is included in the structured content.`,
            `To reuse this design, call create_template with the returned html and variables.`,
          ].join('\n'),
        },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    }
  }

  // Existing non-AI branch
  const result: ImageResult = await client.renderImage(args as any)
  return {
    content: [
      {
        type: 'text' as const,
        text: `Image generated successfully!\nURL: ${result.url}\nSize: ${result.width}x${result.height} ${result.format}\nFile size: ${result.size} bytes`,
      },
    ],
  }
}
