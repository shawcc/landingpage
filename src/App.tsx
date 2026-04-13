import { useState } from 'react'
import type { Value } from 'platejs'
import {
  Plate,
  PlateContent,
  PlateElement,
  createPlatePlugin,
  type PlateElementProps,
  usePlateEditor,
} from 'platejs/react'
import {
  BoldPlugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react'
import { Element as SlateElement, Text, Transforms } from 'slate'
import './App.css'

type AssistantAnswers = {
  audience: string
  capabilities: string
  cta: string
  problem: string
  scenes: string
  tone: string
}

type DraftPayload = {
  intro: string
  sections: Array<{
    paragraphs: string[]
    title: string
  }>
}

type AssistantExample = {
  answers: AssistantAnswers
  description: string
  title: string
}

const assistantPrompts = [
  {
    key: 'problem',
    title: '这个插件主要解决什么问题？',
    placeholder: '例如：帮助企业把跨部门服务流程统一起来，减少沟通成本和信息断层。',
  },
  {
    key: 'audience',
    title: '它更适合什么类型的客户？',
    placeholder: '例如：服务团队、运营团队、流程复杂的中大型企业。',
  },
  {
    key: 'capabilities',
    title: '最核心的 3 个能力是什么？',
    placeholder: '例如：工单协同、权限管理、SLA 管控。',
  },
  {
    key: 'scenes',
    title: '最常见的使用场景是什么？',
    placeholder: '例如：跨部门协作、客户服务处理、流程升级与跟踪。',
  },
  {
    key: 'tone',
    title: '希望整体是什么语气？',
    placeholder: '例如：专业、可信、简洁，不要太营销。',
  },
  {
    key: 'cta',
    title: '希望用户看完后做什么？',
    placeholder: '例如：了解更多、联系咨询、预约演示。',
  },
] as const

const assistantExamples: AssistantExample[] = [
  {
    title: '客服协同插件',
    description: '适合服务团队、工单、协同处理类产品。',
    answers: {
      problem: '帮助企业把跨部门服务流程统一起来，减少沟通成本和信息断层。',
      audience: '适合服务团队、运营团队，以及流程较复杂的中大型企业。',
      capabilities: '工单协同、权限管理、SLA 管控',
      scenes: '跨部门协作、客户服务处理、流程升级与跟踪',
      tone: '专业、可信、简洁，不要太营销',
      cta: '了解更多或预约演示',
    },
  },
  {
    title: '营销活动插件',
    description: '适合优惠、促销、活动配置类产品。',
    answers: {
      problem: '帮助商家更快配置营销活动，降低活动配置门槛并减少执行错误。',
      audience: '适合需要频繁做营销活动的电商商家、运营人员和增长团队。',
      capabilities: '活动配置、规则校验、数据看板',
      scenes: '大促活动、日常促销、新品上线',
      tone: '清晰、直接、偏业务说明，不要过度销售化',
      cta: '查看演示或联系咨询',
    },
  },
  {
    title: '数据分析插件',
    description: '适合经营分析、报表与看板类产品。',
    answers: {
      problem: '帮助团队统一查看经营数据，减少多系统切换和口径不一致的问题。',
      audience: '适合运营、管理层和需要经常查看报表的业务团队。',
      capabilities: '核心指标看板、报表汇总、异常提醒',
      scenes: '经营复盘、业务监控、日报周报分析',
      tone: '稳重、专业、强调可信度',
      cta: '了解方案或申请试用',
    },
  },
]

const defaultAnswers: AssistantAnswers = {
  problem: '帮助企业把跨部门服务流程统一起来，减少沟通成本和信息断层。',
  audience: '适合服务团队、运营团队，以及流程较复杂的中大型企业。',
  capabilities: '工单协同、权限管理、SLA 管控',
  scenes: '跨部门协作、客户服务处理、流程升级与跟踪',
  tone: '专业、可信、简洁，不要太营销',
  cta: '了解更多或预约演示',
}

const customBlockTypes = new Set(['detail-section'])

function text(textValue: string, marks: Record<string, boolean> = {}) {
  return { text: textValue, ...marks }
}

function paragraph(content: string) {
  return { type: 'p', children: [text(content)] }
}

function heading2(content: string) {
  return { type: 'h2', children: [text(content)] }
}

function detailSection(title: string, paragraphs: string[]) {
  return {
    type: 'detail-section',
    children: [heading2(title), ...paragraphs.map((item) => paragraph(item))],
  }
}

function copyValue(value: Value): Value {
  return JSON.parse(JSON.stringify(value))
}

function serializeValueToText(value: Value) {
  return value
    .map((node: any) => {
      if (!node) return ''
      if (node.type === 'detail-section') {
        return node.children.map((child: any) => getNodeText(child)).join('\n')
      }
      return getNodeText(node)
    })
    .filter(Boolean)
    .join('\n\n')
}

function escapeHtml(content: string) {
  return content
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function serializeValueToHtml(value: Value) {
  return value
    .map((node: any) => {
      if (!node) return ''
      if (node.type === 'detail-section') {
        const [titleNode, ...paragraphNodes] = node.children ?? []
        const title = `<h2>${escapeHtml(getNodeText(titleNode))}</h2>`
        const paragraphs = paragraphNodes
          .map((child: any) => `<p>${escapeHtml(getNodeText(child))}</p>`)
          .join('')
        return `${title}${paragraphs}`
      }

      return `<p>${escapeHtml(getNodeText(node))}</p>`
    })
    .filter(Boolean)
    .join('')
}

function appendDraft(base: Value, draft: Value): Value {
  return [...copyValue(base), ...copyValue(draft)]
}

function buildDraft(answers: AssistantAnswers): Value {
  const capabilities = answers.capabilities
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const scenes = answers.scenes
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return [
    paragraph(
      `这款插件主要用于${answers.problem}整体表达建议保持${answers.tone}，更适合放在平台商品详情区中自然阅读。`
    ),
    detailSection('适合谁使用', [
      answers.audience,
      '如果读者还不确定自己是否适用，可以继续通过能力说明和使用场景来判断。',
    ]),
    detailSection(
      '核心能力',
      capabilities.length
        ? capabilities.map((item, index) => `${index + 1}. ${item}。`)
        : ['建议从协作、权限、流程和服务管理几个方向展开说明。']
    ),
    detailSection(
      '典型使用场景',
      scenes.length
        ? scenes.map((item, index) => `${index + 1}. ${item}。`)
        : ['建议结合真实业务环节，说明插件最适合出现在哪些流程节点。']
    ),
    detailSection('补充说明', [
      '建议在这里补充接入方式、配置成本、适用边界或客户最常见的疑问。',
      `如果用户看完后希望继续了解，可以引导他${answers.cta}。`,
    ]),
  ]
}

function draftPayloadToValue(payload: DraftPayload): Value {
  const sections = Array.isArray(payload.sections) ? payload.sections : []
  const result: Value = []

  if (payload.intro?.trim()) {
    result.push(paragraph(payload.intro.trim()))
  }

  sections.forEach((section) => {
    const title = section.title?.trim()
    const paragraphs = Array.isArray(section.paragraphs)
      ? section.paragraphs.map((item) => item.trim()).filter(Boolean)
      : []

    if (title && paragraphs.length) {
      result.push(detailSection(title, paragraphs))
    }
  })

  return result.length ? result : buildDraft(defaultAnswers)
}

function getNodeText(node: any): string {
  if (!node) return ''
  if (Text.isText(node)) return node.text
  if (Array.isArray(node.children)) return node.children.map(getNodeText).join('')
  return ''
}

async function copyDraftToClipboard(value: Value) {
  const plainText = serializeValueToText(value)
  const htmlText = serializeValueToHtml(value)

  if (!navigator.clipboard) return

  if ('ClipboardItem' in window) {
    const item = new ClipboardItem({
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'text/html': new Blob([htmlText], { type: 'text/html' }),
    })
    await navigator.clipboard.write([item])
    return
  }

  await navigator.clipboard.writeText(plainText)
}

function ParagraphElement(props: PlateElementProps) {
  return <PlateElement as="p" className="editor-p" {...props} />
}

function H2Element(props: PlateElementProps) {
  return <PlateElement as="h2" className="editor-h2" {...props} />
}

function H3Element(props: PlateElementProps) {
  return <PlateElement as="h3" className="editor-h3" {...props} />
}

function DetailSectionElement(props: PlateElementProps) {
  return <PlateElement as="section" className="editor-section" {...props} />
}

const ParagraphPlugin = createPlatePlugin({
  key: 'p',
  node: { isElement: true, type: 'p', component: ParagraphElement },
})

const DetailSectionPlugin = createPlatePlugin({
  key: 'detail-section',
  node: { isElement: true, type: 'detail-section', component: DetailSectionElement },
})

const plugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  DetailSectionPlugin,
]

function AiSparkIcon() {
  return <span className="ai-spark">AI</span>
}

function EditorCanvas({
  initialValue,
  onChange,
  onOpenAi,
}: {
  initialValue: Value
  onChange: (value: Value) => void
  onOpenAi: () => void
}) {
  const editor = usePlateEditor({
    plugins,
    value: initialValue,
  })

  if (!editor) return null
  const plateEditor = editor as any

  const setBlockType = (type: 'p' | 'h2' | 'h3') => {
    Transforms.setNodes(
      plateEditor,
      { type } as any,
      {
        match: (node) =>
          SlateElement.isElement(node) && !customBlockTypes.has((node as any).type),
      }
    )
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            plateEditor.tf.toggle.mark({ key: 'bold' })
          }}
        >
          B
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            plateEditor.tf.toggle.mark({ key: 'italic' })
          }}
        >
          I
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            plateEditor.tf.toggle.mark({ key: 'underline' })
          }}
        >
          U
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            setBlockType('p')
          }}
        >
          正文
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            setBlockType('h2')
          }}
        >
          标题
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            setBlockType('h3')
          }}
        >
          小标题
        </button>
        <div className="toolbar-spacer" />
        <button className="editor-ai-button" type="button" onClick={onOpenAi}>
          <AiSparkIcon />
          AI 生成详情
        </button>
      </div>

      <Plate
        editor={plateEditor}
        onChange={({ value }) => {
          onChange(value as Value)
        }}
      >
        <PlateContent
          className="editor-content"
          placeholder="请输入插件详情（图片支持缩放）"
        />
      </Plate>
    </div>
  )
}

function PreviewBlock({ node }: { node: any }) {
  if (!node || Text.isText(node)) return null

  if (node.type === 'detail-section') {
    return (
      <section className="draft-section">
        <h3 className="draft-title">{getNodeText(node.children?.[0])}</h3>
        {node.children?.slice(1).map((child: any, index: number) => (
          <p key={`${node.type}-${index}`} className="draft-paragraph">
            {getNodeText(child)}
          </p>
        ))}
      </section>
    )
  }

  return <p className="draft-paragraph">{getNodeText(node)}</p>
}

function DraftPreview({ draft }: { draft: Value }) {
  return (
    <div className="draft-preview">
      {draft.map((node: any, index) => (
        <PreviewBlock key={`draft-${index}`} node={node} />
      ))}
    </div>
  )
}

function AssistantDrawer({
  answers,
  currentStep,
  errorMessage,
  draft,
  isGenerating,
  isOpen,
  onApply,
  onChangeAnswer,
  onClose,
  onCopy,
  onGenerate,
  onNextStep,
  onPrevStep,
  onReplace,
  onUseExample,
  statusLabel,
}: {
  answers: AssistantAnswers
  currentStep: number
  errorMessage: string | null
  draft: Value
  isGenerating: boolean
  isOpen: boolean
  onApply: () => void
  onChangeAnswer: (key: keyof AssistantAnswers, value: string) => void
  onClose: () => void
  onCopy: () => void
  onGenerate: () => void
  onNextStep: () => void
  onPrevStep: () => void
  onReplace: () => void
  onUseExample: (example: AssistantExample) => void
  statusLabel: string
}) {
  const activePrompt = assistantPrompts[currentStep]
  const isLastStep = currentStep === assistantPrompts.length - 1

  return (
    <>
      <div
        className={isOpen ? 'drawer-mask visible' : 'drawer-mask'}
        onClick={onClose}
      />
      <aside className={isOpen ? 'assistant-drawer open' : 'assistant-drawer'}>
        <div className="assistant-drawer__header">
          <div>
            <strong>AI 助手</strong>
            <span>在当前详情编辑页里，边问边写，最后插入富文本。</span>
          </div>
          <button className="drawer-close" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="assistant-status-row">
          <span className="assistant-status">{statusLabel}</span>
          {errorMessage ? <span className="assistant-error">{errorMessage}</span> : null}
        </div>

        <div className="assistant-block">
          <div className="assistant-block__title">范例</div>
          <div className="example-list">
            {assistantExamples.map((example) => (
              <button
                key={example.title}
                className="example-card"
                onClick={() => onUseExample(example)}
                disabled={isGenerating}
              >
                <strong>{example.title}</strong>
                <span>{example.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="assistant-block grow">
          <div className="assistant-block__title">对话引导</div>
          <div className="conversation-list">
            {assistantPrompts.slice(0, currentStep).map((item, index) => (
              <div key={item.key} className="conversation-item">
                <div className="assistant-bubble">
                  {index + 1}. {item.title}
                </div>
                <div className="user-bubble">{answers[item.key]}</div>
              </div>
            ))}

            <div className="conversation-item current">
              <div className="assistant-bubble">
                {currentStep + 1}. {activePrompt.title}
              </div>
              <textarea
                className="assistant-input"
                disabled={isGenerating}
                value={answers[activePrompt.key]}
                placeholder={activePrompt.placeholder}
                onChange={(event) =>
                  onChangeAnswer(activePrompt.key as keyof AssistantAnswers, event.target.value)
                }
              />
            </div>
          </div>

          <div className="step-actions">
            <button
              className="secondary-action"
              onClick={onPrevStep}
              disabled={isGenerating || currentStep === 0}
            >
              上一步
            </button>
            <div className="step-indicator">
              {currentStep + 1} / {assistantPrompts.length}
            </div>
            <button className="secondary-action" onClick={onNextStep} disabled={isGenerating}>
              {isLastStep ? '完成提问' : '下一题'}
            </button>
          </div>
        </div>

        <div className="assistant-block">
          <div className="assistant-result-head">
            <div className="assistant-block__title">生成结果</div>
            <button className="ghost-button" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? '生成中...' : '生成草稿'}
            </button>
          </div>
          <DraftPreview draft={draft} />
          <div className="assistant-actions">
            <button className="primary-action" onClick={onApply} disabled={isGenerating}>
              插入到编辑器
            </button>
            <button className="secondary-action" onClick={onReplace} disabled={isGenerating}>
              替换编辑器
            </button>
            <button className="secondary-action" onClick={onCopy} disabled={isGenerating}>
              复制结果
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function App() {
  const [seed, setSeed] = useState(1)
  const [currentStep, setCurrentStep] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [value, setValue] = useState<Value>([
    paragraph('这里是插件详情编辑区。你可以直接编写内容，也可以使用 AI 助手辅助生成。'),
  ])
  const [answers, setAnswers] = useState<AssistantAnswers>(defaultAnswers)
  const [draft, setDraft] = useState<Value>(() => buildDraft(defaultAnswers))
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusLabel, setStatusLabel] = useState('当前使用本地草稿生成逻辑')

  const updateAnswer = (key: keyof AssistantAnswers, nextValue: string) => {
    setAnswers((current) => ({ ...current, [key]: nextValue }))
  }

  const nextStep = () => {
    setCurrentStep((current) => Math.min(current + 1, assistantPrompts.length - 1))
  }

  const prevStep = () => {
    setCurrentStep((current) => Math.max(current - 1, 0))
  }

  const useExample = (example: AssistantExample) => {
    setAnswers(example.answers)
    setDraft(buildDraft(example.answers))
    setCurrentStep(assistantPrompts.length - 1)
    setStatusLabel(`已套用范例：${example.title}`)
    setErrorMessage(null)
    setDrawerOpen(true)
  }

  const generateDraft = async () => {
    setIsGenerating(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/generate-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'AI 服务暂时不可用')
      }

      const payload = (await response.json()) as { draft: DraftPayload; model?: string }
      setDraft(draftPayloadToValue(payload.draft))
      setStatusLabel(payload.model ? `已使用 AI 模型：${payload.model}` : '已使用 AI 生成草稿')
    } catch (error) {
      setDraft(buildDraft(answers))
      setStatusLabel('未命中 AI 服务，已回退到本地草稿')
      setErrorMessage(error instanceof Error ? error.message : 'AI 服务调用失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const insertDraft = () => {
    setValue((current) => appendDraft(current, draft))
    setSeed((current) => current + 1)
    setDrawerOpen(false)
  }

  const replaceWithDraft = () => {
    setValue(copyValue(draft))
    setSeed((current) => current + 1)
    setDrawerOpen(false)
  }

  const copyDraft = async () => {
    try {
      await copyDraftToClipboard(draft)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '复制失败')
    }
  }

  return (
    <div className="sim-page">
      <header className="sim-topbar">
        <div className="sim-topbar__left">
          <div className="brand-square">M</div>
          <div className="sim-topbar__title">0402</div>
          <div className="status-chip">企业</div>
        </div>
        <div className="sim-topbar__right">
          <div className="notice-chip">修改需要插件版本发布生效，请前往插件发布创建版本</div>
          <div className="avatar-chip">PM</div>
        </div>
      </header>

      <div className="sim-layout">
        <aside className="sim-sidebar">
          <div className="sim-nav-group">
            <div className="sim-nav-title">基本信息</div>
            <div className="sim-nav-item active">基本信息</div>
            <div className="sim-nav-item">开发</div>
            <div className="sim-nav-item">插件功能</div>
            <div className="sim-nav-item">权限管理</div>
          </div>
          <div className="sim-nav-group">
            <div className="sim-nav-title">发布</div>
            <div className="sim-nav-item">插件发布</div>
            <div className="sim-nav-item">付费管理</div>
          </div>
          <div className="sim-nav-group">
            <div className="sim-nav-title">数据</div>
            <div className="sim-nav-item">安装统计</div>
            <div className="sim-nav-item">日志检索</div>
          </div>
        </aside>

        <main className="sim-content">
          <section className="sim-card compact">
            <div className="sim-card__title">插件凭证</div>
            <div className="credential-row">
              <div>Plugin ID</div>
              <div>MiL69CDF1A6EB400CC0</div>
              <div>Plugin Secret</div>
              <div>**********************</div>
            </div>
          </section>

          <section className="sim-card">
            <div className="sim-card__header">
              <div>
                <div className="sim-card__title">基础信息</div>
                <div className="sim-card__meta">基本信息（中文）</div>
              </div>
              <div className="sim-card__tools">
                <span>国际化配置</span>
                <span>预览</span>
              </div>
            </div>

            <div className="sim-form">
              <div className="sim-row">
                <label>图标</label>
                <div className="logo-box">+</div>
                <div className="field-tip">支持 svg、png、jpeg 格式；大小不超过 2 MB；建议尺寸 240*240 px</div>
              </div>

              <div className="sim-row">
                <label>插件名称</label>
                <input className="sim-input" value="0402" readOnly />
              </div>

              <div className="sim-row">
                <label>插件短描述</label>
                <input className="sim-input" value="AI 协助生成更自然的插件详情内容" readOnly />
              </div>

              <div className="sim-row">
                <label>插件分类</label>
                <div className="sim-select">最多可选 3 个插件分类</div>
              </div>

              <div className="sim-row editor-row">
                <label>插件详情</label>
                <div className="editor-field">
                  <div className="editor-hint-row">
                    <span>通过 AI 助手辅助整理文案，再插入到富文本中</span>
                    <button className="inline-ai-entry" type="button" onClick={() => setDrawerOpen(true)}>
                      <AiSparkIcon />
                      AI 助手
                    </button>
                  </div>
                  <div className="editor-card embedded">
                    <EditorCanvas
                      key={seed}
                      initialValue={value}
                      onChange={setValue}
                      onOpenAi={() => setDrawerOpen(true)}
                    />
                  </div>
                  <div className="field-error">此项为必填项</div>
                </div>
              </div>

              <div className="sim-row">
                <label>封面图</label>
                <div className="upload-box">点击上传或拖拽文件到该区域</div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <button className="floating-ai-button" type="button" onClick={() => setDrawerOpen(true)}>
        <AiSparkIcon />
        帮写
      </button>

      <AssistantDrawer
        answers={answers}
        currentStep={currentStep}
        errorMessage={errorMessage}
        draft={draft}
        isGenerating={isGenerating}
        isOpen={drawerOpen}
        onApply={insertDraft}
        onChangeAnswer={updateAnswer}
        onClose={() => setDrawerOpen(false)}
        onCopy={copyDraft}
        onGenerate={generateDraft}
        onNextStep={nextStep}
        onPrevStep={prevStep}
        onReplace={replaceWithDraft}
        onUseExample={useExample}
        statusLabel={statusLabel}
      />
    </div>
  )
}

export default App
