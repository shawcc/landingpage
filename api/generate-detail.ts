type AssistantAnswers = {
  audience?: string
  capabilities?: string
  cta?: string
  problem?: string
  scenes?: string
  tone?: string
}

type TemplateContext = {
  description?: string
  layoutHint?: string
  title?: string
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
  const normalized = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return normalized.slice(start, end + 1)
  }

  return normalized
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
    const template = (body?.template || {}) as TemplateContext

    const prompt = [
      '你是一个中文 SaaS 商品详情页写作助手。',
      '任务：帮助 ISV 为平台内的富文本编辑器生成一版可以直接粘贴的详情草稿。',
      '写作目标：自然、可信、克制、像产品说明，不像广告页，也不像独立站落地页。',
      '补充上下文：用户已经先选了一个详情模板，请让文字组织方式贴近模板。模板影响表达结构，不需要输出模板说明文字。',
      '必须只输出合法 JSON，不要输出任何解释、前言、后记、markdown、代码块、注释或多余文本。',
      '如果你想先思考，也不要把思考过程输出给用户。',
      'JSON 结构如下，字段名不要变：',
      '{"intro":"", "sections":[{"title":"", "paragraphs":["", ""]}]}',
      '要求：',
      '1. intro 为开头总述，1段即可，长度控制在 60-100 字。',
      '2. sections 固定输出 4 段，标题需贴近所选模板的组织方式，保持自然，不要太像营销标题。',
      '3. 每个 section 的 paragraphs 为 1-3 段自然语言，不要输出 markdown、序号标题、HTML 或项目符号。',
      '4. 语言统一为中文，不要出现“本产品”、“赋能”、“一站式闭环”、“颠覆式”这类过度营销表达。',
      '5. 尽量使用平实表达，像真实商品详情说明，而不是销售话术。',
      '6. 如果输入信息不完整，也要补齐一版合理草稿，但不要编造具体客户名、数据或案例。',
      '',
      `模板标题：${template.title || ''}`,
      `模板说明：${template.description || ''}`,
      `模板结构：${template.layoutHint || ''}`,
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
        temperature: 0.3,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content:
              '你是擅长为企业软件、插件和 SaaS 产品写详情介绍的中文助手。你只返回合法 JSON。',
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
