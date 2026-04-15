import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  generateImageSchema,
  generateImageToolMeta,
  handleGenerateImage,
} from '../tools/generateImage.js'
import {
  screenshotUrlSchema,
  screenshotUrlToolMeta,
  handleScreenshotUrl,
} from '../tools/screenshotUrl.js'
import {
  listTemplatesSchema,
  listTemplatesToolMeta,
  handleListTemplates,
} from '../tools/listTemplates.js'
import {
  getTemplateSchema,
  getTemplateToolMeta,
  handleGetTemplate,
} from '../tools/getTemplate.js'
import {
  handleCreateTemplate,
  createTemplateToolMeta,
} from '../tools/createTemplate.js'
import { RendshotClient } from '@rendshot/sdk'
import type { AiRenderResult } from '@rendshot/sdk'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tool meta / definitions
// ---------------------------------------------------------------------------

describe('generate_image tool meta', () => {
  it('has the correct name', () => {
    expect(generateImageToolMeta.name).toBe('generate_image')
  })

  it('has a non-empty description', () => {
    expect(typeof generateImageToolMeta.description).toBe('string')
    expect(generateImageToolMeta.description.length).toBeGreaterThan(0)
  })
})

describe('screenshot_url tool meta', () => {
  it('has the correct name', () => {
    expect(screenshotUrlToolMeta.name).toBe('screenshot_url')
  })

  it('has a non-empty description', () => {
    expect(typeof screenshotUrlToolMeta.description).toBe('string')
    expect(screenshotUrlToolMeta.description.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// generate_image schema validation
// ---------------------------------------------------------------------------

describe('generateImageSchema validation', () => {
  const schema = z.object(generateImageSchema)

  it('accepts valid input with only the required html field', () => {
    const result = schema.safeParse({ html: '<h1>Hello</h1>' })
    expect(result.success).toBe(true)
  })

  it('accepts all optional fields when provided with correct types', () => {
    const result = schema.safeParse({
      html: '<p>test</p>',
      css: 'body { color: red; }',
      width: 800,
      height: 600,
      format: 'png',
      quality: 90,
      deviceScale: 2,
      timeout: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts input without html (html is now optional for template mode)', () => {
    const result = schema.safeParse({ width: 800 })
    expect(result.success).toBe(true)
  })

  it('rejects invalid format values', () => {
    const result = schema.safeParse({ html: '<p>x</p>', format: 'gif' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid deviceScale values', () => {
    const result = schema.safeParse({ html: '<p>x</p>', deviceScale: 4 })
    expect(result.success).toBe(false)
  })

  it('accepts deviceScale of 1, 2, or 3', () => {
    for (const scale of [1, 2, 3] as const) {
      const result = schema.safeParse({ html: '<p>x</p>', deviceScale: scale })
      expect(result.success).toBe(true)
    }
  })

  it('accepts fonts array', () => {
    const result = schema.safeParse({ html: '<p>x</p>', fonts: ['Inter', 'Roboto'] })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// screenshot_url schema validation
// ---------------------------------------------------------------------------

describe('screenshotUrlSchema validation', () => {
  const schema = z.object(screenshotUrlSchema)

  it('accepts valid input with only the required url field', () => {
    const result = schema.safeParse({ url: 'https://example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts all optional fields when provided with correct types', () => {
    const result = schema.safeParse({
      url: 'https://example.com',
      width: 1280,
      height: 800,
      format: 'jpg',
      quality: 85,
      fullPage: true,
      deviceScale: 1,
      timeout: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects input missing the required url field', () => {
    const result = schema.safeParse({ width: 1280 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid format values', () => {
    const result = schema.safeParse({ url: 'https://example.com', format: 'bmp' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid deviceScale values', () => {
    const result = schema.safeParse({ url: 'https://example.com', deviceScale: 0 })
    expect(result.success).toBe(false)
  })

  it('accepts valid format values: png, jpg', () => {
    for (const format of ['png', 'jpg'] as const) {
      const result = schema.safeParse({ url: 'https://example.com', format })
      expect(result.success).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// handleGenerateImage — calls ApiClient correctly
// ---------------------------------------------------------------------------

describe('handleGenerateImage', () => {
  it('calls client.generateImage with the provided args', async () => {
    const mockFetch = makeFetchMock(200, {
      url: 'https://cdn.example.com/img.png',
      width: 1080,
      height: 1080,
      format: 'png',
      size: 8192,
    })
    vi.stubGlobal('fetch', mockFetch)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.rendshot.com' })
    const args = { html: '<h1>Hello</h1>', width: 1080, height: 1080 }

    const response = await handleGenerateImage(client, args as any)

    // Verify fetch was called to POST /v1/image
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.rendshot.com/v1/image')
    expect((init as any).method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.html).toBe('<h1>Hello</h1>')

    // Verify the MCP response shape
    expect(response.content).toHaveLength(1)
    expect(response.content[0].type).toBe('text')
    expect((response.content[0] as any).text).toContain('https://cdn.example.com/img.png')
    expect((response.content[0] as any).text).toContain('Image generated successfully')
  })

  it('returns error for empty html (treated as missing)', async () => {
    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.rendshot.com' })
    const result = await handleGenerateImage(client, { html: '' } as any)
    expect((result as any).isError).toBe(true)
    expect(result.content[0].text).toContain('Provide either html or template_id')
  })
})

// ---------------------------------------------------------------------------
// handleScreenshotUrl — calls ApiClient correctly
// ---------------------------------------------------------------------------

describe('handleScreenshotUrl', () => {
  it('calls client.screenshotUrl with the provided args', async () => {
    const mockFetch = makeFetchMock(200, {
      url: 'https://cdn.example.com/shot.jpg',
      width: 1280,
      height: 800,
      format: 'jpg',
      size: 20480,
    })
    vi.stubGlobal('fetch', mockFetch)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.rendshot.com' })
    const args = { url: 'https://example.com', fullPage: true, format: 'jpg' }

    const response = await handleScreenshotUrl(client, args as any)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.rendshot.com/v1/screenshot')
    expect((init as any).method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.url).toBe('https://example.com')
    expect(body.fullPage).toBe(true)

    expect(response.content).toHaveLength(1)
    expect(response.content[0].type).toBe('text')
    expect((response.content[0] as any).text).toContain('https://cdn.example.com/shot.jpg')
    expect((response.content[0] as any).text).toContain('Screenshot taken')
  })

  it('propagates errors from the API client', async () => {
    const mockFetch = makeFetchMock(422, { error: { message: 'Invalid URL' } })
    vi.stubGlobal('fetch', mockFetch)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.rendshot.com' })
    await expect(
      handleScreenshotUrl(client, { url: 'not-a-url' } as any)
    ).rejects.toThrow('Invalid URL')
  })
})

// ---------------------------------------------------------------------------
// generate_image with template_id
// ---------------------------------------------------------------------------

describe('generateImageSchema validation (template mode)', () => {
  const schema = z.object(generateImageSchema)

  it('accepts template_id without html', () => {
    const result = schema.safeParse({ template_id: 'tpl_abc123' })
    expect(result.success).toBe(true)
  })

  it('accepts template_id with variables', () => {
    const result = schema.safeParse({
      template_id: 'tpl_abc123',
      variables: { title: 'Hello', count: 42 },
    })
    expect(result.success).toBe(true)
  })

  it('accepts html without template_id (backward compat)', () => {
    const result = schema.safeParse({ html: '<h1>Hello</h1>' })
    expect(result.success).toBe(true)
  })
})

describe('handleGenerateImage with template_id', () => {
  it('returns success for template_id render', async () => {
    const f = makeFetchMock(200, {
      imageId: 'img_t1',
      url: 'https://cdn/tpl.png',
      width: 1200,
      height: 630,
      format: 'png',
      size: 4096,
      createdAt: '2026-03-29',
    })
    vi.stubGlobal('fetch', f)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleGenerateImage(client, {
      template_id: 'tpl_abc123',
      variables: { title: 'Test' },
    } as any)

    expect(result.content[0].text).toContain('Image generated successfully')
    expect(result.content[0].text).toContain('https://cdn/tpl.png')
  })

  it('returns error when neither html nor template_id provided', async () => {
    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleGenerateImage(client, {} as any)
    expect((result as any).isError).toBe(true)
    expect(result.content[0].text).toContain('Provide either html or template_id')
  })

  it('returns error when both html and template_id provided', async () => {
    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleGenerateImage(client, {
      html: '<h1>x</h1>',
      template_id: 'tpl_x',
    } as any)
    expect((result as any).isError).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// generate_image with prompt (AI mode)
// ---------------------------------------------------------------------------

describe('generate_image with prompt', () => {
  it('calls aiRender when prompt is provided', async () => {
    const aiResult: AiRenderResult = {
      imageId: 'img_ai1',
      url: 'https://cdn.example.com/ai-img.png',
      width: 1080,
      height: 1080,
      format: 'png',
      size: 12345,
      createdAt: '2026-04-09T00:00:00Z',
      html: '<div>AI generated</div>',
      variables: [],
    }

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    client.aiRender = vi.fn().mockResolvedValue(aiResult)
    client.renderImage = vi.fn()

    const result = await handleGenerateImage(client, {
      prompt: 'Make a cover',
      platform: 'xiaohongshu',
    } as any)

    expect(client.aiRender).toHaveBeenCalledWith({
      prompt: 'Make a cover',
      platform: 'xiaohongshu',
      templateId: undefined,
      width: undefined,
      height: undefined,
      format: undefined,
      quality: undefined,
      deviceScale: undefined,
      fonts: undefined,
      locale: undefined,
      timeout: undefined,
    })
    expect(client.renderImage).not.toHaveBeenCalled()
    expect(result.content[0].text).toContain('https://cdn.example.com/ai-img.png')
  })

  it('errors when both html and prompt provided', async () => {
    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })

    const result = await handleGenerateImage(client, {
      prompt: 'x',
      html: '<div/>',
    } as any)

    expect((result as any).isError).toBe(true)
    expect(result.content[0].text).toMatch(/cannot combine prompt with html/i)
  })
})

// ---------------------------------------------------------------------------
// list_templates
// ---------------------------------------------------------------------------

describe('list_templates tool', () => {
  it('has the correct name and description', () => {
    expect(listTemplatesToolMeta.name).toBe('list_templates')
    expect(listTemplatesToolMeta.description.length).toBeGreaterThan(0)
  })

  it('schema accepts empty object', () => {
    const schema = z.object(listTemplatesSchema)
    expect(schema.safeParse({}).success).toBe(true)
  })

  it('schema accepts all filter params', () => {
    const schema = z.object(listTemplatesSchema)
    expect(schema.safeParse({
      platform: 'twitter',
      category: 'social',
      q: 'card',
      limit: 10,
    }).success).toBe(true)
  })

  it('returns formatted template list', async () => {
    const f = makeFetchMock(200, {
      templates: [
        {
          id: 'tpl_abc',
          name: 'Social Card',
          width: 1200,
          height: 630,
          variables: [{ key: 'title', type: 'text', label: 'Title', default: 'Hi' }],
          author: { name: 'Jane' },
        },
      ],
      nextCursor: null,
    })
    vi.stubGlobal('fetch', f)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleListTemplates(client, {})

    expect(result.content[0].text).toContain('tpl_abc')
    expect(result.content[0].text).toContain('Social Card')
    expect(result.content[0].text).toContain('title(text)')
  })

  it('returns "no templates" message for empty results', async () => {
    const f = makeFetchMock(200, { templates: [], nextCursor: null })
    vi.stubGlobal('fetch', f)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleListTemplates(client, {})

    expect(result.content[0].text).toContain('No templates found')
  })
})

// ---------------------------------------------------------------------------
// get_template
// ---------------------------------------------------------------------------

describe('get_template tool', () => {
  it('has the correct name', () => {
    expect(getTemplateToolMeta.name).toBe('get_template')
  })

  it('schema requires template_id', () => {
    const schema = z.object(getTemplateSchema)
    expect(schema.safeParse({}).success).toBe(false)
    expect(schema.safeParse({ template_id: 'tpl_abc' }).success).toBe(true)
  })

  it('returns formatted template details', async () => {
    const f = makeFetchMock(200, {
      id: 'tpl_abc',
      name: 'Social Card',
      description: 'A card template',
      platform: 'twitter',
      width: 1200,
      height: 630,
      tags: ['social'],
      variables: [
        { key: 'title', type: 'text', label: 'Title', default: 'Hello', required: true },
        { key: 'bgColor', type: 'color', label: 'BG', default: '#fff' },
      ],
      author: { name: 'Jane' },
    })
    vi.stubGlobal('fetch', f)

    const client = new RendshotClient({ apiKey: 'rs_test_key', baseUrl: 'https://api.test.com' })
    const result = await handleGetTemplate(client, { template_id: 'tpl_abc' })

    const text = result.content[0].text
    expect(text).toContain('Social Card')
    expect(text).toContain('title (text)')
    expect(text).toContain('(required)')
    expect(text).toContain('bgColor (color)')
    expect(text).toContain('default="Hello"')
  })
})

// ---------------------------------------------------------------------------
// create_template
// ---------------------------------------------------------------------------

describe('create_template', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls SDK createTemplate and returns formatted response', async () => {
    const mockCreateTemplate = vi.fn().mockResolvedValue({
      id: 'tpl_new',
      name: 'Cover',
      status: 'draft',
      visibility: 'private',
      platform: 'xiaohongshu',
      width: 1080,
      height: 1440,
      createdAt: '2026-04-09T00:00:00Z',
    })
    const client = { createTemplate: mockCreateTemplate } as any

    const result = await handleCreateTemplate(client, {
      name: 'Cover',
      html: '<div>{{title}}</div>',
      variables: [{ key: 'title', type: 'text', label: 'T', default: 'x' }],
    })

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cover',
        html: '<div>{{title}}</div>',
      }),
    )
    expect(result.content[0].text).toContain('tpl_new')
    expect(result.content[0].text).toContain('Cover')
    expect(result.structuredContent).toMatchObject({ id: 'tpl_new' })
  })

  it('has a descriptive toolMeta with workflow guidance', () => {
    expect(createTemplateToolMeta.name).toBe('create_template')
    expect(createTemplateToolMeta.description).toContain('template')
  })
})
