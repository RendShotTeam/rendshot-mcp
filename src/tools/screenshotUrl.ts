import { z } from 'zod'
import type { RendshotClient, ImageResult } from '@rendshot/sdk'

export const screenshotUrlSchema = {
  url: z.string().describe('URL to screenshot'),
  width: z.number().optional().describe('Viewport width (default 1280)'),
  height: z.number().optional().describe('Viewport height (default 800)'),
  format: z.enum(['png', 'jpg']).optional().describe('Output format (default png)'),
  quality: z.number().optional().describe('Quality 1-100 for jpg (default 90)'),
  fullPage: z.boolean().optional().describe('Capture full page (default false)'),
  deviceScale: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe('Device scale factor (default 1)'),
  timeout: z.number().optional().describe('Timeout in ms (default 10000)'),
}

export const screenshotUrlToolMeta = {
  name: 'screenshot_url',
  description: 'Take a screenshot of a URL and return the image URL',
}

export async function handleScreenshotUrl(
  client: RendshotClient,
  args: z.objectOutputType<typeof screenshotUrlSchema, z.ZodTypeAny>,
) {
  const result: ImageResult = await client.screenshotUrl(args as any)
  return {
    content: [
      {
        type: 'text' as const,
        text: `Screenshot taken!\nURL: ${result.url}\nSize: ${result.width}x${result.height} ${result.format}\nFile size: ${result.size} bytes`,
      },
    ],
  }
}
