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

function getNodeText(node: any): string {
  if (!node) return ''
  if (Text.isText(node)) return node.text
  if (Array.isArray(node.children)) return node.children.map(getNodeText).join('')
  return ''
}

function copyToClipboard(content: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(content)
  }
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

function EditorCanvas({ initialValue, onChange }: { initialValue: Value; onChange: (value: Value) => void }) {
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
          加粗
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            plateEditor.tf.toggle.mark({ key: 'italic' })
          }}
        >
          斜体
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            plateEditor.tf.toggle.mark({ key: 'underline' })
          }}
        >
          下划线
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
      </div>

      <Plate
        editor={plateEditor}
        onChange={({ value }) => {
          onChange(value as Value)
        }}
      >
        <PlateContent
          className="editor-content"
          placeholder="请输入插件详情，或使用右侧 AI 助手共同生成内容"
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

function AssistantPanel({
  answers,
  draft,
  onApply,
  onChangeAnswer,
  onCopy,
  onGenerate,
  onReplace,
}: {
  answers: AssistantAnswers
  draft: Value
  onApply: () => void
  onChangeAnswer: (key: keyof AssistantAnswers, value: string) => void
  onCopy: () => void
  onGenerate: () => void
  onReplace: () => void
}) {
  return (
    <aside className="assistant-panel">
      <div className="assistant-card">
        <div className="assistant-card__header">
          <div>
            <strong>AI 助手</strong>
            <span>通过引导式交流，先把详情内容梳理出来。</span>
          </div>
          <button className="ghost-button" onClick={onGenerate}>
            生成草稿
          </button>
        </div>

        <div className="conversation-list">
          {assistantPrompts.map((item, index) => (
            <div key={item.key} className="conversation-item">
              <div className="assistant-bubble">
                {index + 1}. {item.title}
              </div>
              <textarea
                className="assistant-input"
                value={answers[item.key]}
                placeholder={item.placeholder}
                onChange={(event) =>
                  onChangeAnswer(item.key as keyof AssistantAnswers, event.target.value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="assistant-card">
        <div className="assistant-card__header stacked">
          <div>
            <strong>生成结果</strong>
            <span>确认内容顺序和语气没问题后，再插入到左侧编辑器。</span>
          </div>
        </div>

        <DraftPreview draft={draft} />

        <div className="assistant-actions">
          <button className="primary-action" onClick={onApply}>
            插入到编辑器
          </button>
          <button className="secondary-action" onClick={onReplace}>
            替换编辑器内容
          </button>
          <button className="secondary-action" onClick={onCopy}>
            复制结果
          </button>
        </div>
      </div>
    </aside>
  )
}

function App() {
  const [seed, setSeed] = useState(1)
  const [value, setValue] = useState<Value>([
    paragraph('这里是插件详情编辑区。你可以直接编写内容，也可以使用右侧 AI 助手辅助生成。'),
  ])
  const [answers, setAnswers] = useState<AssistantAnswers>(defaultAnswers)
  const [draft, setDraft] = useState<Value>(() => buildDraft(defaultAnswers))

  const updateAnswer = (key: keyof AssistantAnswers, nextValue: string) => {
    setAnswers((current) => ({ ...current, [key]: nextValue }))
  }

  const generateDraft = () => {
    setDraft(buildDraft(answers))
  }

  const insertDraft = () => {
    setValue((current) => appendDraft(current, draft))
    setSeed((current) => current + 1)
  }

  const replaceWithDraft = () => {
    setValue(copyValue(draft))
    setSeed((current) => current + 1)
  }

  const copyDraft = () => {
    copyToClipboard(serializeValueToText(draft))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-badge">插件详情编辑</div>
          <h1>在富文本编辑器里，用 AI 助手共同制作详情页</h1>
          <p>
            更贴近真实后台场景：左侧是原有的详情富文本编辑器，右侧是 AI 助手，通过几轮引导帮 ISV
            先把详情内容讲清楚，然后插入或复制到编辑器中。
          </p>
        </div>
      </header>

      <main className="editor-page">
        <section className="product-card">
          <div className="form-grid">
            <div className="field-group">
              <label>插件名称</label>
              <input value="0402" readOnly />
            </div>
            <div className="field-group">
              <label>插件短描述</label>
              <input value="AI 协助生成更自然的插件详情内容" readOnly />
            </div>
          </div>

          <div className="editor-card">
            <div className="editor-card__header">
              <div>
                <strong>插件详情</strong>
                <span>这里继续人工微调，或者直接接收 AI 生成结果。</span>
              </div>
            </div>
            <EditorCanvas key={seed} initialValue={value} onChange={setValue} />
          </div>
        </section>

        <AssistantPanel
          answers={answers}
          draft={draft}
          onApply={insertDraft}
          onChangeAnswer={updateAnswer}
          onCopy={copyDraft}
          onGenerate={generateDraft}
          onReplace={replaceWithDraft}
        />
      </main>
    </div>
  )
}

export default App
