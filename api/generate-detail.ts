type AssistantAnswers = {
  audience?: string
  capabilities?: string
  cta?: string
  problem?: string
  scenes?: string
  tone?: string
}

type DraftPayload = {
  intro: string
  sections: Array<{
    paragraphs: string[]
    title: string
  }>
}

function sendJson(res: any, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function extractJson(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return content.slice(start, end + 1)
  }

  return content.trim()
}

function normalizeDraftPayload(payload: any): DraftPayload {
  const intro =
    typeof payload?.intro === 'string' && payload.intro.trim()
      ? payload.intro.trim()
      : '这款插件的核心价值建议先用一段简洁说明进行概括。'

  const sections = Array.isArray(payload?.sections)
    ? payload.sections
        .map((section: any) => ({
          title:
            typeof section?.title === 'string' && section.title.trim()
              ? section.title.trim()
              : '',
          paragraphs: Array.isArray(section?.paragraphs)
            ? section.paragraphs
                .map((item: any) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean)
            : [],
        }))
        .filter((section: DraftPayload['sections'][number]) => section.title && section.paragraphs.length)
    : []

  return { intro, sections }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' })
  }

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY
  const baseUrl = (
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '')
  const model =
    process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  if (!apiKey) {
    return sendJson(res, 500, {
      error: '未配置 AI_API_KEY 或 OPENAI_API_KEY',
    })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const answers = (body?.answers || {}) as AssistantAnswers

    const prompt = [
      '你是一个中文 SaaS 商品详情页写作助手。',
      '目标：帮助 ISV 在平台富文本编辑器中生成一版自然、可信、适合直接粘贴的商品详情草稿。',
      '风格要求：专业、清晰、克制，不要夸张营销，不要像独立站落地页。',
      '输出必须是 JSON，不要附加解释。',
      'JSON 结构如下：',
      '{"intro":"", "sections":[{"title":"", "paragraphs":["", ""]}]}',
      '要求：',
      '1. intro 为开头总述，1段即可。',
      '2. sections 固定输出 4 段左右，优先包含：适合谁使用、核心能力、典型使用场景、补充说明。',
      '3. 每个 section 的 paragraphs 为 1-3 段自然语言，不要输出 markdown、序号标题或 HTML。',
      '4. 语言统一为中文。',
      '',
      `问题：${answers.problem || ''}`,
      `受众：${answers.audience || ''}`,
      `核心能力：${answers.capabilities || ''}`,
      `使用场景：${answers.scenes || ''}`,
      `语气：${answers.tone || ''}`,
      `期望动作：${answers.cta || ''}`,
    ].join('\n')

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              '你是擅长为企业软件、插件和 SaaS 产品写详情介绍的中文助手。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    const raw = await response.json()

    if (!response.ok) {
      const providerMessage =
        raw?.error?.message ||
        raw?.message ||
        'AI 服务请求失败'
      return sendJson(res, 500, { error: providerMessage })
    }

    const content = raw?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return sendJson(res, 500, { error: 'AI 未返回可用内容' })
    }

    const parsed = JSON.parse(extractJson(content))
    const draft = normalizeDraftPayload(parsed)

    return sendJson(res, 200, {
      draft,
      model,
    })
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'AI 生成失败',
    })
  }
}
