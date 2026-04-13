import { useMemo, useState } from 'react'
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
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react'
import { Element as SlateElement, Text, Transforms } from 'slate'
import './App.css'

type ThemeName = 'tech' | 'calm' | 'contrast'
type TemplateName = 'service' | 'growth' | 'ops'

type TemplateCard = {
  description: string
  label: string
  theme: ThemeName
  template: TemplateName
}

const customBlockTypes = new Set([
  'hero',
  'landing-section',
  'feature-grid',
  'feature-card',
  'metric-grid',
  'metric-card',
  'faq-group',
  'faq-item',
  'cta-block',
])

const templateCards: TemplateCard[] = [
  {
    template: 'service',
    theme: 'tech',
    label: '客服增长型',
    description: '适合客服、接待、咨询转化类插件',
  },
  {
    template: 'growth',
    theme: 'contrast',
    label: '营销转化型',
    description: '适合营销活动、投放、促销增长类插件',
  },
  {
    template: 'ops',
    theme: 'calm',
    label: '运营效率型',
    description: '适合自动化、流程、数据与履约类插件',
  },
]

function text(textValue: string, marks: Record<string, boolean> = {}) {
  return { text: textValue, ...marks }
}

function paragraph(content: string) {
  return { type: 'p', children: [text(content)] }
}

function heading1(content: string) {
  return { type: 'h1', children: [text(content)] }
}

function heading2(content: string) {
  return { type: 'h2', children: [text(content)] }
}

function heading3(content: string) {
  return { type: 'h3', children: [text(content)] }
}

function heroBlock(
  eyebrow: string,
  title: string,
  description: string,
  action: string
) {
  return {
    type: 'hero',
    children: [
      paragraph(eyebrow),
      heading1(title),
      paragraph(description),
      paragraph(action),
    ],
  }
}

function sectionBlock(title: string, description: string, children: any[]) {
  return {
    type: 'landing-section',
    children: [heading2(title), paragraph(description), ...children],
  }
}

function featureGrid(items: Array<{ title: string; description: string }>) {
  return {
    type: 'feature-grid',
    children: items.map((item) => ({
      type: 'feature-card',
      children: [heading3(item.title), paragraph(item.description)],
    })),
  }
}

function metricGrid(items: Array<{ title: string; description: string }>) {
  return {
    type: 'metric-grid',
    children: items.map((item) => ({
      type: 'metric-card',
      children: [heading3(item.title), paragraph(item.description)],
    })),
  }
}

function faqGroup(items: Array<{ title: string; description: string }>) {
  return {
    type: 'faq-group',
    children: items.map((item) => ({
      type: 'faq-item',
      children: [heading3(item.title), paragraph(item.description)],
    })),
  }
}

function ctaBlock(title: string, description: string, action: string) {
  return {
    type: 'cta-block',
    children: [heading2(title), paragraph(description), paragraph(action)],
  }
}

function createTemplate(template: TemplateName): Value {
  if (template === 'growth') {
    return [
      heroBlock(
        '适合营销增长与活动工具',
        '把活动卖点讲清楚，把转化动作放在最顺手的位置',
        '这套详情页模板强调“活动效果、转化收益、行动召唤”，适合营销插件、优惠工具和增长组件。',
        '主按钮建议：立即创建活动 / 领取演示方案'
      ),
      sectionBlock(
        '用户为什么会被打动',
        'AI 不只罗列功能，而是把复杂能力翻译成客户更容易感知的增长结果。',
        [
          featureGrid([
            {
              title: '活动价值先讲结果',
              description: '先强调报名率、转化率、复购机会，再解释功能细节。',
            },
            {
              title: '促销信息层级更清晰',
              description: '优惠规则、场景说明、适用对象分层展示，减少理解成本。',
            },
            {
              title: 'CTA 更像营销页',
              description: '按钮、强调文案、结尾收口都围绕“立即行动”设计。',
            },
          ]),
        ]
      ),
      sectionBlock(
        '适合放哪些内容',
        '这类详情页推荐优先展示活动玩法、适用场景、使用收益和客户背书。',
        [
          metricGrid([
            {
              title: '活动玩法',
              description: '满减、优惠券、组合购、会员激励等核心玩法说明。',
            },
            {
              title: '适用场景',
              description: '大促、新客拉新、节日营销、老客复购等典型场景。',
            },
            {
              title: '预期收益',
              description: '从转化提升、客单增长、活动效率三个角度表达价值。',
            },
          ]),
        ]
      ),
      sectionBlock(
        '常见顾虑',
        '这一段帮助 ISV 提前回答客户在购买前最常见的问题。',
        [
          faqGroup([
            {
              title: '需要复杂配置吗？',
              description: '建议强调安装快、配置路径短、支持模板化启用。',
            },
            {
              title: '适合哪些店铺使用？',
              description: '建议说明适合的店铺规模、营销阶段和活动频次。',
            },
          ]),
        ]
      ),
      ctaBlock(
        '让详情页更像一个能转化的商品页',
        '先让 AI 生成活动型首稿，再由运营微调卖点和图片，就能在平台里快速形成统一的营销详情页。',
        '建议按钮：立即咨询 / 获取方案 / 申请体验'
      ),
    ]
  }

  if (template === 'ops') {
    return [
      heroBlock(
        '适合运营效率与流程自动化工具',
        '把复杂流程能力转成清晰、可信、可落地的详情页表达',
        '这套模板更偏稳重和专业，适合数据工具、履约工具、流程自动化插件和运营后台能力。',
        '主按钮建议：预约演示 / 联系方案顾问'
      ),
      sectionBlock(
        '这类工具最该讲什么',
        '用户更关心效率提升、流程稳定、接入成本和团队可用性，而不是抽象技术名词。',
        [
          featureGrid([
            {
              title: '讲清楚流程被优化了什么',
              description: '把自动化流程拆成几个业务步骤，而不是只说系统能力。',
            },
            {
              title: '讲清楚团队如何协同',
              description: '表达插件如何帮助运营、客服、供应链或履约团队一起工作。',
            },
            {
              title: '讲清楚接入门槛',
              description: '用“多久能开始使用、要不要开发资源、上线风险大不大”回答用户顾虑。',
            },
          ]),
        ]
      ),
      sectionBlock(
        '建议的详情结构',
        '一个好看的效率型详情页，重点不是热闹，而是看起来专业、稳定、信息有层次。',
        [
          metricGrid([
            {
              title: '流程清晰',
              description: '推荐加入接入步骤、使用路径或操作前后对比说明。',
            },
            {
              title: '收益可信',
              description: '从减少人工操作、降低错误率、提升处理时效等角度表达。',
            },
            {
              title: '结尾有动作',
              description: '即使是偏后台工具，也需要明确下一步操作入口。',
            },
          ]),
        ]
      ),
      ctaBlock(
        '把“后台能力”也做成能让客户看懂的详情页',
        '有了结构化区块和统一主题，运营团队不需要懂设计，也能在平台里编辑出更专业的详情页。',
        '建议按钮：预约演示 / 获取接入说明'
      ),
    ]
  }

  return [
    heroBlock(
      '适合客服、问答与服务类插件',
      '用户不会表达也没关系，先让 AI 帮你写出一版像样的商品详情页',
      '这套模板突出“问题被解决了什么、效率提升在哪里、客户为什么要立即了解”，适合客服、AI 助手和服务型插件。',
      '主按钮建议：立即咨询 / 申请试用'
    ),
    sectionBlock(
      '为什么这个编辑器更适合商品详情页',
      '它不是空白富文本，而是平台控制样式、用户编辑内容、AI 帮忙生成表达的半结构化编辑器。',
      [
        featureGrid([
          {
            title: '预制区块先给结构',
            description: '首屏、卖点、场景、FAQ、CTA 都是现成区块，用户不再从空白开始。',
          },
          {
            title: '统一主题先保底好看',
            description: '样式由平台统一控制，用户只改内容，不容易把页面改丑。',
          },
          {
            title: 'AI 先产出首稿',
            description: 'AI 根据商品信息补齐内容骨架，先给出可编辑、可发布的第一版。',
          },
        ]),
      ]
    ),
    sectionBlock(
      '推荐表达哪些信息',
      'ISV 往往知道产品做了什么，但不知道怎么写成详情页。这里的区块就是为了解决这个问题。',
      [
        metricGrid([
          {
            title: '核心卖点',
            description: '把零散功能归纳成 3 到 4 个客户最容易理解的亮点。',
          },
          {
            title: '使用场景',
            description: '告诉客户它适合谁、在哪些业务节点最值得使用。',
          },
          {
            title: '预期收益',
            description: '把技术语言转成结果语言，例如效率提升、响应更快、规则更统一。',
          },
        ]),
      ]
    ),
    sectionBlock(
      '常见问题',
      'FAQ 是详情页里非常容易缺失的一段，但对转化很重要。',
      [
        faqGroup([
          {
            title: '如果我没有现成文案怎么办？',
            description: '先输入产品名称、功能、受众和场景，AI 会自动补出第一版详情页。',
          },
          {
            title: '如果我不会设计怎么办？',
            description: '平台只开放少量主题，样式由系统托底，保证最终页面始终专业统一。',
          },
        ]),
      ]
    ),
    ctaBlock(
      '把普通富文本升级成商品详情页编辑器',
      '你们平台负责区块和样式，AI 负责首稿和改写，ISV 只负责补充业务信息，就能在站内做出更好看的详情页。',
      '建议按钮：立即生成首稿 / 复制平台文档 JSON'
    ),
  ]
}

function copyValue(value: Value): Value {
  return JSON.parse(JSON.stringify(value))
}

function hasType(nodes: any[], type: string): boolean {
  for (const node of nodes) {
    if (!Text.isText(node) && node.type === type) {
      return true
    }
    if (!Text.isText(node) && Array.isArray(node.children) && hasType(node.children, type)) {
      return true
    }
  }
  return false
}

function addFaqSection(value: Value): Value {
  if (hasType(value as any[], 'faq-group')) return value
  const next = copyValue(value)
  next.push(
    sectionBlock('AI 补齐的 FAQ', '平台可以帮用户把最容易遗漏的问题自动补齐。', [
      faqGroup([
        {
          title: '是否一定要从模板开始？',
          description: '推荐从模板开始，因为这样能最快获得结构化、样式稳定的首稿。',
        },
        {
          title: '最终是存 HTML 还是富文本 JSON？',
          description: '更推荐保存 Plate 的结构化文档 JSON，再由前台统一渲染。',
        },
      ]),
    ]) as any
  )
  return next
}

function addTrustSection(value: Value): Value {
  if (hasType(value as any[], 'metric-grid')) return value
  const next = copyValue(value)
  next.splice(
    2,
    0,
    sectionBlock('AI 补齐的信任信息', '当 ISV 没有成熟案例时，也可以先用结构化收益信息来建立信任。', [
      metricGrid([
        {
          title: '表达更专业',
          description: '通过统一标题、正文、节奏和样式，让页面第一眼就显得更成熟。',
        },
        {
          title: '结构更完整',
          description: '自动补齐收益、FAQ、CTA 等容易被忽略却很关键的部分。',
        },
        {
          title: '平台更易维护',
          description: '用结构化文档存储和渲染，后续可以统一升级主题和规范。',
        },
      ]),
    ]) as any
  )
  return next
}

function addValueSection(value: Value): Value {
  if (hasType(value as any[], 'feature-grid')) return value
  const next = copyValue(value)
  next.splice(
    1,
    0,
    sectionBlock('AI 强化后的核心卖点', '当用户不会写时，系统先给出一版更偏销售表达的卖点结构。', [
      featureGrid([
        {
          title: '先讲客户得到什么',
          description: '页面优先表达价值，再承接具体功能说明，减少“只会堆功能”的问题。',
        },
        {
          title: '先给版式再给自由',
          description: '编辑器通过预制区块限定信息层次，保证用户随便改也不会太乱。',
        },
        {
          title: '先有结果再微调',
          description: 'AI 先生成首稿，用户只做局部修改，这样效率和质量都更稳定。',
        },
      ]),
    ]) as any
  )
  return next
}

function ensureCta(value: Value): Value {
  if (hasType(value as any[], 'cta-block')) return value
  const next = copyValue(value)
  next.push(
    ctaBlock(
      '给页面一个明确结尾',
      '每个详情页都应该有一个清晰的收口动作，让用户知道下一步做什么。',
      '建议按钮：立即咨询 / 申请体验 / 获取方案'
    ) as any
  )
  return next
}

function createOutline(nodes: Value) {
  return nodes
    .map((node: any, index) => `${String(index + 1).padStart(2, '0')} · ${node.type}`)
    .join('\n')
}

function getTextLength(nodes: any[]): number {
  return nodes.reduce((sum, node) => {
    if (Text.isText(node)) return sum + node.text.length
    if (Array.isArray(node.children)) return sum + getTextLength(node.children)
    return sum
  }, 0)
}

function copyToClipboard(content: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(content)
  }
}

function ParagraphElement(props: PlateElementProps) {
  return <PlateElement as="p" className="lp-p" {...props} />
}

function H1Element(props: PlateElementProps) {
  return <PlateElement as="h1" className="lp-h1" {...props} />
}

function H2Element(props: PlateElementProps) {
  return <PlateElement as="h2" className="lp-h2" {...props} />
}

function H3Element(props: PlateElementProps) {
  return <PlateElement as="h3" className="lp-h3" {...props} />
}

function HeroElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement as="section" className="lp-hero" {...props}>
      <div className="lp-hero__content">{children}</div>
      <div className="lp-hero__preview" contentEditable={false}>
        <div className="lp-hero__window">
          <div className="lp-hero__bar">
            <span />
            <span />
            <span />
          </div>
          <div className="lp-hero__screen">
            <div className="lp-hero__screen-title" />
            <div className="lp-hero__screen-line" />
            <div className="lp-hero__screen-line short" />
            <div className="lp-hero__screen-cards">
              <div />
              <div />
              <div />
            </div>
          </div>
        </div>
      </div>
    </PlateElement>
  )
}

function SectionElement(props: PlateElementProps) {
  return <PlateElement as="section" className="lp-section" {...props} />
}

function FeatureGridElement(props: PlateElementProps) {
  return <PlateElement as="div" className="lp-feature-grid" {...props} />
}

function FeatureCardElement(props: PlateElementProps) {
  return <PlateElement as="article" className="lp-feature-card" {...props} />
}

function MetricGridElement(props: PlateElementProps) {
  return <PlateElement as="div" className="lp-metric-grid" {...props} />
}

function MetricCardElement(props: PlateElementProps) {
  return <PlateElement as="article" className="lp-metric-card" {...props} />
}

function FaqGroupElement(props: PlateElementProps) {
  return <PlateElement as="div" className="lp-faq-group" {...props} />
}

function FaqItemElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement as="article" className="lp-faq-item" {...props}>
      <div className="lp-faq-item__badge" contentEditable={false}>
        Q
      </div>
      <div className="lp-faq-item__body">{children}</div>
    </PlateElement>
  )
}

function CtaBlockElement(props: PlateElementProps) {
  return <PlateElement as="section" className="lp-cta" {...props} />
}

const HeroPlugin = createPlatePlugin({
  key: 'hero',
  node: { isElement: true, type: 'hero', component: HeroElement },
})

const ParagraphPlugin = createPlatePlugin({
  key: 'p',
  node: { isElement: true, type: 'p', component: ParagraphElement },
})

const SectionPlugin = createPlatePlugin({
  key: 'landing-section',
  node: { isElement: true, type: 'landing-section', component: SectionElement },
})

const FeatureGridPlugin = createPlatePlugin({
  key: 'feature-grid',
  node: { isElement: true, type: 'feature-grid', component: FeatureGridElement },
})

const FeatureCardPlugin = createPlatePlugin({
  key: 'feature-card',
  node: { isElement: true, type: 'feature-card', component: FeatureCardElement },
})

const MetricGridPlugin = createPlatePlugin({
  key: 'metric-grid',
  node: { isElement: true, type: 'metric-grid', component: MetricGridElement },
})

const MetricCardPlugin = createPlatePlugin({
  key: 'metric-card',
  node: { isElement: true, type: 'metric-card', component: MetricCardElement },
})

const FaqGroupPlugin = createPlatePlugin({
  key: 'faq-group',
  node: { isElement: true, type: 'faq-group', component: FaqGroupElement },
})

const FaqItemPlugin = createPlatePlugin({
  key: 'faq-item',
  node: { isElement: true, type: 'faq-item', component: FaqItemElement },
})

const CtaBlockPlugin = createPlatePlugin({
  key: 'cta-block',
  node: { isElement: true, type: 'cta-block', component: CtaBlockElement },
})

const plugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.withComponent(H1Element),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  HeroPlugin,
  SectionPlugin,
  FeatureGridPlugin,
  FeatureCardPlugin,
  MetricGridPlugin,
  MetricCardPlugin,
  FaqGroupPlugin,
  FaqItemPlugin,
  CtaBlockPlugin,
]

function EditorCanvas({
  initialValue,
  onChange,
  theme,
}: {
  initialValue: Value
  onChange: (value: Value) => void
  theme: ThemeName
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
          SlateElement.isElement(node) &&
          !customBlockTypes.has((node as any).type),
      }
    )
  }

  return (
    <div className="canvas-shell" data-theme={theme}>
      <div className="canvas-toolbar">
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
        <PlateContent className="landing-editor" placeholder="开始编辑详情页内容" />
      </Plate>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeName>('tech')
  const [template, setTemplate] = useState<TemplateName>('service')
  const [seed, setSeed] = useState(1)
  const [value, setValue] = useState<Value>(() => createTemplate('service'))

  const outline = useMemo(() => createOutline(value), [value])
  const payload = useMemo(() => JSON.stringify(value, null, 2), [value])
  const textLength = useMemo(() => getTextLength(value as any[]), [value])

  const applyDraft = (nextValue: Value, nextTheme?: ThemeName, nextTemplate?: TemplateName) => {
    setValue(nextValue)
    if (nextTheme) setTheme(nextTheme)
    if (nextTemplate) setTemplate(nextTemplate)
    setSeed((current) => current + 1)
  }

  const insertFaq = () => applyDraft(addFaqSection(value))
  const insertTrust = () => applyDraft(addTrustSection(value))
  const insertValueSection = () => applyDraft(addValueSection(value))
  const insertCta = () => applyDraft(ensureCta(value))

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-badge">Plate + AI 商品详情页编辑器 Demo</div>
          <h1>在你们站内，用富文本编辑出更好看的商品详情页</h1>
          <p>
            这版实现把 Plate 当成编辑底座，再叠加结构化区块、统一主题和 AI
            辅助动作。用户不是从空白编辑器开始写，而是先拿到一版像样的详情页首稿。
          </p>
        </div>

        <div className="header-actions">
          <button className="primary" onClick={() => copyToClipboard(payload)}>
            复制平台 JSON
          </button>
          <button className="secondary" onClick={() => copyToClipboard(outline)}>
            复制区块大纲
          </button>
        </div>
      </header>

      <main className="app-layout">
        <aside className="side-panel">
          <section className="panel-card">
            <div className="panel-title">模板首稿</div>
            <div className="panel-subtitle">先选一个更接近业务场景的详情页方向</div>
            <div className="template-list">
              {templateCards.map((item) => (
                <button
                  key={item.template}
                  className={item.template === template ? 'template-card active' : 'template-card'}
                  onClick={() =>
                    applyDraft(createTemplate(item.template), item.theme, item.template)
                  }
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">主题风格</div>
            <div className="theme-switches">
              <button
                className={theme === 'tech' ? 'theme-pill active' : 'theme-pill'}
                onClick={() => setTheme('tech')}
              >
                科技专业
              </button>
              <button
                className={theme === 'calm' ? 'theme-pill active' : 'theme-pill'}
                onClick={() => setTheme('calm')}
              >
                简洁商务
              </button>
              <button
                className={theme === 'contrast' ? 'theme-pill active' : 'theme-pill'}
                onClick={() => setTheme('contrast')}
              >
                增长转化
              </button>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">AI 辅助动作</div>
            <div className="action-list">
              <button onClick={insertValueSection}>AI 强化卖点结构</button>
              <button onClick={insertTrust}>AI 补齐信任信息</button>
              <button onClick={insertFaq}>AI 自动补齐 FAQ</button>
              <button onClick={insertCta}>AI 自动补齐 CTA</button>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">当前文档</div>
            <div className="mini-metrics">
              <div>
                <strong>{value.length}</strong>
                <span>顶层区块</span>
              </div>
              <div>
                <strong>{textLength}</strong>
                <span>总字数</span>
              </div>
            </div>
          </section>
        </aside>

        <section className="center-panel">
          <div className="center-caption">
            <div>
              <strong>编辑画布</strong>
              <span>即所得编辑，区块结构和展示样式保持一致</span>
            </div>
            <div className="status-pill">当前主题：{theme}</div>
          </div>

          <EditorCanvas
            key={seed}
            initialValue={value}
            theme={theme}
            onChange={setValue}
          />
        </section>

        <aside className="side-panel">
          <section className="panel-card">
            <div className="panel-title">平台存储建议</div>
            <div className="panel-subtitle">
              推荐把结果保存为 Plate 文档 JSON，再由平台前台统一渲染
            </div>
            <pre className="payload-box">{payload}</pre>
          </section>

          <section className="panel-card">
            <div className="panel-title">区块大纲</div>
            <pre className="outline-box">{outline}</pre>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
