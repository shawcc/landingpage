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
import heroImage from './assets/hero.png'
import capabilityImage from './assets/screenshot-capability.svg'
import decisionImage from './assets/screenshot-decision.svg'
import integrationImage from './assets/screenshot-integration.svg'
import opsImage from './assets/screenshot-ops.svg'
import scenarioImage from './assets/screenshot-scenario.svg'

type AssistantAnswers = {
  audience: string
  capabilities: string
  concerns: string
  cta: string
  problem: string
  scenes: string
}

type DetailTemplateId = 'scenario' | 'capability' | 'integration' | 'decision'

type DraftPayload = {
  intro: string
  sections: Array<{
    paragraphs: string[]
    title: string
  }>
}

type DetailImage = {
  alt: string
  caption: string
  label: string
  src: string
  title: string
  value: string
}

type DetailTemplate = {
  answers: AssistantAnswers
  description: string
  id: DetailTemplateId
  images: DetailImage[]
  layoutHint: string
  title: string
}

type AssistantExample = {
  answers: AssistantAnswers
  description: string
  templateId: DetailTemplateId
  title: string
}

const assistantPrompts: Array<{
  key: keyof AssistantAnswers
  placeholder: string
  title: string
}> = [
  {
    key: 'problem',
    title: '这个插件先解决什么业务问题？',
    placeholder: '例如：让客服、运营和实施在同一条工单链路里协同，不再靠群消息追进度。',
  },
  {
    key: 'audience',
    title: '谁会使用它？最好具体到角色。',
    placeholder: '例如：客服主管、一线客服、实施顾问和运营负责人。',
  },
  {
    key: 'scenes',
    title: '它最常出现在哪几个流程节点？',
    placeholder: '例如：工单受理、升级处理、跨部门协同、SLA 跟踪。',
  },
  {
    key: 'capabilities',
    title: '最值得截图展示的 3 个界面或动作是什么？',
    placeholder: '例如：统一工单台、权限视图、超时预警面板。',
  },
  {
    key: 'concerns',
    title: '客户决策前最关心什么？',
    placeholder: '例如：接入周期、权限范围、是否影响现有流程、支持哪些版本。',
  },
  {
    key: 'cta',
    title: '看完后希望对方做什么？',
    placeholder: '例如：预约演示、联系实施顾问、查看完整能力清单。',
  },
]

const detailTemplates: DetailTemplate[] = [
  {
    id: 'scenario',
    title: '场景型',
    description: '适合先讲谁在什么流程里使用，再用一张界面图证明产品确实能落地。',
    layoutHint: '一句定位 + 使用流程 + 界面证据 + 上线变化 + 接入边界',
    images: [
      {
        src: scenarioImage,
        alt: '工单协同界面示意',
        label: '界面证据',
        title: '统一工单协同台',
        caption: '把受理、分派、升级和跟进放到同一个界面里，减少跨系统切换。',
        value: '适合用来证明这不是概念介绍，而是已经能支撑真实协同流程的产品。',
      },
      {
        src: opsImage,
        alt: '告警与 SLA 看板示意',
        label: '流程证据',
        title: '队列与 SLA 监控',
        caption: '把待处理队列、告警和超时状态收进同一个运营视图里。',
        value: '适合补充说明团队不是只“看见工单”，而是真的在持续运营流程。',
      },
      {
        src: integrationImage,
        alt: '权限与配置界面示意',
        label: '接入证据',
        title: '权限与配置边界',
        caption: '把角色权限、字段映射和接入步骤集中说明，方便企业客户评估上线成本。',
        value: '适合回答“能不能接、谁能看、影响不影响现有流程”这类问题。',
      },
    ],
    answers: {
      problem: '让客服、运营和实施在同一条工单链路里协同，不再靠群消息追进度。',
      audience: '客服主管、一线客服、实施顾问和运营负责人。',
      scenes: '工单受理、升级处理、跨部门协同、SLA 跟踪',
      capabilities: '统一工单台、升级协同面板、超时预警视图',
      concerns: '接入周期多久、权限怎么分、是否影响现有流程、支持哪些版本',
      cta: '预约演示或联系实施顾问',
    },
  },
  {
    id: 'capability',
    title: '能力型',
    description: '适合核心界面很有说服力的插件，重点把 3 个关键界面讲透。',
    layoutHint: '一句定位 + 关键界面 + 能力亮点 + 使用流程 + 接入边界',
    images: [
      {
        src: capabilityImage,
        alt: '营销配置界面示意',
        label: '关键界面',
        title: '活动配置台',
        caption: '规则、条件和生效范围集中在一个工作台完成，降低复杂活动配置的理解成本。',
        value: '适合用来证明产品的价值来自界面和动作设计，而不是堆概念。',
      },
      {
        src: heroImage,
        alt: '规则校验界面示意',
        label: '能力证据',
        title: '规则校验提醒',
        caption: '上线前先暴露规则冲突和条件覆盖问题，减少人工回查。',
        value: '适合补充说明产品不只是“能配”，而且能减少出错。',
      },
      {
        src: decisionImage,
        alt: '活动效果看板示意',
        label: '结果证据',
        title: '效果看板',
        caption: '把关键活动数据和异常变化收在一个视图里，方便快速复盘。',
        value: '适合说明配置动作最终会如何反馈到业务结果上。',
      },
    ],
    answers: {
      problem: '让商家更快配置复杂营销活动，减少人工校验和上线错误。',
      audience: '电商运营、增长团队、活动配置人员和业务负责人。',
      scenes: '大促准备、日常促销、新品冷启动、活动复盘',
      capabilities: '活动配置台、规则校验提醒、数据效果看板',
      concerns: '上线前是否要改现有活动流程、是否支持灰度、学习成本高不高',
      cta: '查看完整能力清单或申请试用',
    },
  },
  {
    id: 'integration',
    title: '接入型',
    description: '适合客户最关心接入成本和权限边界的插件，先把风险说清楚。',
    layoutHint: '一句定位 + 接入方式 + 权限范围 + 界面证据 + 适用边界',
    images: [
      {
        src: integrationImage,
        alt: '接入与权限界面示意',
        label: '接入证明',
        title: '配置与权限面板',
        caption: '把权限、字段映射和流程配置集中管理，降低上线前沟通成本。',
        value: '适合用来回答企业客户最常问的“要接多久、谁能看、会不会影响现有系统”。',
      },
      {
        src: scenarioImage,
        alt: '流程串联界面示意',
        label: '流程证明',
        title: '接入后的业务链路',
        caption: '把接入后的业务流程串起来看，避免只讲配置、不讲使用效果。',
        value: '适合证明接入完成后，前线团队实际会怎样用到这套能力。',
      },
      {
        src: opsImage,
        alt: '灰度试运行界面示意',
        label: '上线证明',
        title: '灰度与运行状态',
        caption: '上线前后可以从统一视图观察运行状态，降低切换风险。',
        value: '适合回答企业客户对灰度、回滚和运行稳定性的担心。',
      },
    ],
    answers: {
      problem: '帮助企业在不改动原有主流程的前提下接入新插件，并把权限和配置边界说清楚。',
      audience: '实施团队、系统管理员、IT 管理员和业务 owner。',
      scenes: '上线评估、权限配置、字段映射、灰度试运行',
      capabilities: '配置面板、权限视图、字段映射页',
      concerns: '是否需要额外账号、权限颗粒度够不够、兼容哪些环境、回滚难不难',
      cta: '联系实施支持或查看接入说明',
    },
  },
  {
    id: 'decision',
    title: '决策型',
    description: '适合给负责人快速判断值不值得上，突出上线后的变化和决策边界。',
    layoutHint: '一句定位 + 适用团队 + 界面证据 + 上线变化 + 决策前确认项',
    images: [
      {
        src: decisionImage,
        alt: '经营分析界面示意',
        label: '结果证明',
        title: '经营分析总览页',
        caption: '核心指标、异常变化和跟进动作放在同一屏，减少管理者来回切换系统。',
        value: '适合用来帮助负责人判断这类产品会不会真正改变团队日常工作方式。',
      },
      {
        src: capabilityImage,
        alt: '下钻分析界面示意',
        label: '能力证明',
        title: '指标下钻分析',
        caption: '关键数字背后能继续往下看，不会停留在总览层面。',
        value: '适合帮助决策者判断它是不是“看板好看但不可执行”。',
      },
      {
        src: integrationImage,
        alt: '数据接入界面示意',
        label: '边界证明',
        title: '数据与权限边界',
        caption: '把数据来源、权限和接入边界说清楚，更利于负责人做最终判断。',
        value: '适合回答“值不值得上”背后的真实顾虑，而不是只展示结果。',        
      },
    ],
    answers: {
      problem: '让管理者和运营团队在同一个界面看到关键经营数据，减少口径不一致和系统切换。',
      audience: '运营负责人、部门管理者、数据分析人员和业务 owner。',
      scenes: '日报周报查看、异常追踪、经营复盘、管理汇报',
      capabilities: '总览看板、异常提醒、指标下钻分析',
      concerns: '数据口径怎么统一、接入哪些数据源、是否支持权限隔离、上线后维护成本如何',
      cta: '了解方案或预约产品演示',
    },
  },
]

const assistantExamples: AssistantExample[] = [
  {
    title: '客服协同插件',
    description: '适合客服、工单、协同处理类产品。',
    templateId: 'scenario',
    answers: detailTemplates[0].answers,
  },
  {
    title: '营销活动插件',
    description: '适合活动配置、规则引擎类产品。',
    templateId: 'capability',
    answers: detailTemplates[1].answers,
  },
  {
    title: '数据分析插件',
    description: '适合管理者决策、经营分析类产品。',
    templateId: 'decision',
    answers: detailTemplates[3].answers,
  },
]

const defaultTemplate = detailTemplates[0]
const defaultAnswers: AssistantAnswers = defaultTemplate.answers
const editorImageLibrary: DetailImage[] = Array.from(
  new Map(
    detailTemplates
      .flatMap((template) => template.images)
      .map((image) => [image.src, image])
  ).values()
)

const customBlockTypes = new Set([
  'detail-section',
  'detail-image',
  'two-column-section',
  'column-item',
  'callout-box',
])

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

function detailImage(image: DetailImage) {
  return {
    type: 'detail-image',
    image,
    children: [text('')],
  }
}

function columnItem(title: string, description: string) {
  return {
    type: 'column-item',
    children: [heading2(title), paragraph(description)],
  }
}

function twoColumnSection() {
  return {
    type: 'two-column-section',
    children: [
      columnItem('左侧说明', '适合放场景、流程节点或某个重点能力的解释。'),
      columnItem('右侧说明', '适合放补充信息、截图解读，或者与左侧形成对照。'),
    ],
  }
}

function calloutBox(tone: 'teal' | 'purple' = 'teal') {
  return {
    type: 'callout-box',
    tone,
    children: [
      heading2('强调信息'),
      paragraph('适合放关键提醒、上线边界、接入条件，或需要重点突出的说明。'),
    ],
  }
}

function copyValue(value: Value): Value {
  return JSON.parse(JSON.stringify(value))
}

function getTemplateById(templateId: DetailTemplateId) {
  return detailTemplates.find((item) => item.id === templateId) || defaultTemplate
}

function splitInput(value: string) {
  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildProofImage(
  template: DetailTemplate,
  answers: AssistantAnswers,
  capabilities = splitInput(answers.capabilities),
  scenes = splitInput(answers.scenes)
): DetailImage {
  const baseImage = template.images[0]
  const firstCapability = capabilities[0] || baseImage.title
  const firstScene = scenes[0] || '关键业务流程'

  return {
    ...baseImage,
    title: firstCapability,
    caption: `在${firstScene}里，读者最应该看到的是“${firstCapability}”这个动作或界面。`,
    value: `这张图主要证明：${answers.problem}`,
  }
}

function serializeValueToText(value: Value) {
  return value
    .map((node: any) => {
      if (!node) return ''
      if (node.type === 'detail-image') {
        const image = node.image || {}
        return `[图片] ${image.title || image.alt || '界面截图'}\n${image.caption || ''}\n${image.value || ''}`
      }
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
      if (node.type === 'detail-image') {
        const image = node.image || {}
        return [
          '<figure>',
          `<img src="${escapeHtml(image.src || '')}" alt="${escapeHtml(image.alt || '')}" />`,
          '<figcaption>',
          image.title ? `<strong>${escapeHtml(image.title)}</strong>` : '',
          image.caption ? `<p>${escapeHtml(image.caption)}</p>` : '',
          image.value ? `<p>${escapeHtml(image.value)}</p>` : '',
          '</figcaption>',
          '</figure>',
        ].join('')
      }
      if (node.type === 'two-column-section') {
        const columns = (node.children ?? [])
          .map((column: any) => {
            const titleNode = column.children?.[0]
            const bodyNodes = column.children?.slice(1) ?? []
            const title = `<h3>${escapeHtml(getNodeText(titleNode))}</h3>`
            const paragraphs = bodyNodes
              .map((child: any) => `<p>${escapeHtml(getNodeText(child))}</p>`)
              .join('')
            return `<div>${title}${paragraphs}</div>`
          })
          .join('')
        return `<section>${columns}</section>`
      }
      if (node.type === 'callout-box') {
        const [titleNode, ...bodyNodes] = node.children ?? []
        const title = `<h3>${escapeHtml(getNodeText(titleNode))}</h3>`
        const paragraphs = bodyNodes
          .map((child: any) => `<p>${escapeHtml(getNodeText(child))}</p>`)
          .join('')
        return `<section>${title}${paragraphs}</section>`
      }
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

function buildChangeParagraphs(problem: string, capabilities: string[]) {
  const firstCapability = capabilities[0] || '关键动作'
  const secondCapability = capabilities[1] || '信息同步'

  return [
    `上线后最直观的变化，通常不是“功能更多”，而是团队在处理${problem}时不需要再依赖额外沟通来补流程。`,
    `${firstCapability}和${secondCapability}会直接影响日常使用感受，让一线执行者和负责人看到同一套状态。`,
  ]
}

function buildDecisionParagraphs(concerns: string, cta: string) {
  const concernPoints = splitInput(concerns)

  return [
    concernPoints.length
      ? `决策前建议重点确认：${concernPoints.slice(0, 3).join('、')}。`
      : '决策前建议至少确认接入周期、权限范围、兼容环境和后续维护方式。',
    `如果需要继续推进，建议下一步${cta}。`,
  ]
}

function buildDraft(answers: AssistantAnswers, template: DetailTemplate = defaultTemplate): Value {
  const capabilities = splitInput(answers.capabilities)
  const scenes = splitInput(answers.scenes)
  const proofImage = buildProofImage(template, answers, capabilities, scenes)
  const intro = `这款插件主要用于${answers.problem}。下面的内容会按 B 端市场页常见方式，先讲适用流程，再用界面证明产品，再补充接入边界。`

  if (template.id === 'capability') {
    return [
      paragraph(intro),
      detailImage(proofImage),
      detailSection('这类团队会先看什么', [
        `更适合${answers.audience}。如果读者正在判断值不值得继续了解，通常会先看最能代表产品价值的界面。`,
      ]),
      detailSection(
        '最值得展示的 3 个界面',
        capabilities.length
          ? capabilities.map((item) => `${item}：建议用一张截图配一句解释，讲清这个动作在实际流程里替团队省掉了什么。`)
          : ['建议优先展示一个主工作台、一个规则或权限界面、一个结果或提醒界面。']
      ),
      detailSection(
        '这些界面通常出现在哪些流程里',
        scenes.length
          ? scenes.map((item) => `${item}：说明谁在这个节点打开插件，以及他需要在界面里完成什么。`)
          : ['建议至少说明产品出现在什么环节、谁来操作、操作后产生什么结果。']
      ),
      detailSection('上线后的变化', buildChangeParagraphs(answers.problem, capabilities)),
      detailSection('接入与边界', buildDecisionParagraphs(answers.concerns, answers.cta)),
    ]
  }

  if (template.id === 'integration') {
    return [
      paragraph(intro),
      detailSection('上线前通常由谁评估', [
        `${answers.audience}会更关注它如何接入现有系统、是否影响现有权限模型，以及上线前要准备什么。`,
      ]),
      detailSection(
        '接入通常发生在哪些节点',
        scenes.length
          ? scenes.map((item) => `${item}：建议写清这个环节要做的配置动作，而不是只说“支持接入”。`)
          : ['建议写清从评估、配置、试运行到正式上线的基本顺序。']
      ),
      detailImage(proofImage),
      detailSection(
        '最值得展示的配置或权限界面',
        capabilities.length
          ? capabilities.map((item) => `${item}：截图应该证明配置是收敛的、权限是可控的，而不是只展示页面样式。`)
          : ['建议至少展示配置面板、权限视图和字段映射或流程管理界面。']
      ),
      detailSection('决策前要确认的边界', buildDecisionParagraphs(answers.concerns, answers.cta)),
    ]
  }

  if (template.id === 'decision') {
    return [
      paragraph(intro),
      detailSection('这类团队为什么会继续看下去', [
        `${answers.audience}通常不是来读完整功能清单，而是要判断这个插件会不会真正改变${answers.problem}这件事。`,
      ]),
      detailImage(proofImage),
      detailSection(
        '最常出现的管理或复盘场景',
        scenes.length
          ? scenes.map((item) => `${item}：建议写清读者在这个时刻最想看到什么信息，以及插件如何把它集中呈现。`)
          : ['建议优先说明管理者在哪些时刻会打开插件，以及他需要用它确认什么。']
      ),
      detailSection('上线后的变化', buildChangeParagraphs(answers.problem, capabilities)),
      detailSection(
        '决策前最值得确认的 3 个点',
        splitInput(answers.concerns).length
          ? splitInput(answers.concerns).map((item) => `${item}：建议用一句实话说明，不要写成营销口号。`)
          : ['建议确认数据来源、权限边界和后续维护方式。']
      ),
      detailSection('下一步', [`如果这类变化正是你当前想解决的问题，建议${answers.cta}。`]),
    ]
  }

  return [
    paragraph(intro),
    detailSection('适合谁使用', [
      `${answers.audience}更容易从这类产品中获得价值。这里不要泛泛写“适合企业”，而是要写清角色和职责。`,
    ]),
    detailSection(
      '它通常出现在什么流程里',
      scenes.length
        ? scenes.map((item) => `${item}：建议交代谁在这个节点打开插件，为什么必须在这里用。`)
        : ['建议优先写清产品最常出现的 2 到 3 个业务节点。']
    ),
    detailImage(proofImage),
    detailSection(
      '界面里最值得看的点',
      capabilities.length
        ? capabilities.map((item) => `${item}：每个点都应该配截图和一句业务价值，而不是只列功能名。`)
        : ['建议先挑一个主界面、一个配置界面和一个结果界面。']
    ),
    detailSection('上线后的变化', buildChangeParagraphs(answers.problem, capabilities)),
    detailSection('接入与边界', buildDecisionParagraphs(answers.concerns, answers.cta)),
  ]
}

function draftPayloadToValue(
  payload: DraftPayload,
  template: DetailTemplate = defaultTemplate,
  answers: AssistantAnswers = defaultAnswers
): Value {
  const sections = Array.isArray(payload.sections) ? payload.sections : []
  const result: Value = []
  const proofImage = buildProofImage(template, answers)

  if (payload.intro?.trim()) {
    result.push(paragraph(payload.intro.trim()))
  }

  sections.forEach((section, index) => {
    const title = section.title?.trim()
    const paragraphs = Array.isArray(section.paragraphs)
      ? section.paragraphs.map((item) => item.trim()).filter(Boolean)
      : []

    if (!title || !paragraphs.length) return

    result.push(detailSection(title, paragraphs))

    if (index === 1) {
      result.push(detailImage(proofImage))
    }
  })

  if (!result.some((node: any) => node?.type === 'detail-image')) {
    result.splice(Math.min(result.length, 2), 0, detailImage(proofImage))
  }

  return result.length ? result : buildDraft(answers, template)
}

function getNodeText(node: any): string {
  if (!node) return ''
  if (node.type === 'detail-image') return node.image?.title || node.image?.caption || node.image?.alt || ''
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

function DetailImageElement(props: PlateElementProps) {
  const image = (props.element as any).image || {}
  const [pickerOpen, setPickerOpen] = useState(false)

  const replaceImage = (nextImage: DetailImage) => {
    Transforms.setNodes(
      props.editor as any,
      {
        image: {
          ...image,
          src: nextImage.src,
          alt: nextImage.alt,
        },
      } as any,
      { at: props.path }
    )
    setPickerOpen(false)
  }

  return (
    <PlateElement as="figure" className="editor-image-block" {...props}>
      <div className="editor-image-frame" contentEditable={false}>
        <div className="editor-image-badge">{image.label || '界面证据'}</div>
        <img className="editor-image" src={image.src} alt={image.alt || '详情配图'} />
        <figcaption className="editor-image-copy">
          <strong className="editor-image-title">{image.title}</strong>
          <p className="editor-image-caption">{image.caption}</p>
          <p className="editor-image-value">{image.value}</p>
          <div className="editor-image-actions">
            <button
              className="editor-image-action"
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                setPickerOpen((current) => !current)
              }}
            >
              替换图片
            </button>
          </div>
          {pickerOpen ? (
            <div className="editor-image-picker">
              {editorImageLibrary.map((item, index) => (
                <button
                  key={`${item.src}-${index}`}
                  className="editor-image-option"
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    replaceImage(item)
                  }}
                >
                  <img src={item.src} alt={item.alt} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          ) : null}
        </figcaption>
      </div>
      <span className="editor-image-anchor">{props.children}</span>
    </PlateElement>
  )
}

function TwoColumnSectionElement(props: PlateElementProps) {
  return <PlateElement as="section" className="editor-two-column" {...props} />
}

function ColumnItemElement(props: PlateElementProps) {
  return <PlateElement as="div" className="editor-column-item" {...props} />
}

function CalloutBoxElement(props: PlateElementProps) {
  const tone = ((props.element as any).tone || 'teal') as 'teal' | 'purple'

  const setTone = (nextTone: 'teal' | 'purple') => {
    Transforms.setNodes(props.editor as any, { tone: nextTone } as any, { at: props.path })
  }

  return (
    <PlateElement as="section" className={`editor-callout tone-${tone}`} {...props}>
      <div className="editor-callout-actions" contentEditable={false}>
        <span>底色</span>
        <button
          className={tone === 'teal' ? 'editor-tone-chip active' : 'editor-tone-chip'}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            setTone('teal')
          }}
        >
          青色
        </button>
        <button
          className={tone === 'purple' ? 'editor-tone-chip active' : 'editor-tone-chip'}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            setTone('purple')
          }}
        >
          紫色
        </button>
      </div>
      {props.children}
    </PlateElement>
  )
}

const ParagraphPlugin = createPlatePlugin({
  key: 'p',
  node: { isElement: true, type: 'p', component: ParagraphElement },
})

const DetailSectionPlugin = createPlatePlugin({
  key: 'detail-section',
  node: { isElement: true, type: 'detail-section', component: DetailSectionElement },
})

const DetailImagePlugin = createPlatePlugin({
  key: 'detail-image',
  node: { isElement: true, type: 'detail-image', component: DetailImageElement },
})

const TwoColumnSectionPlugin = createPlatePlugin({
  key: 'two-column-section',
  node: { isElement: true, type: 'two-column-section', component: TwoColumnSectionElement },
})

const ColumnItemPlugin = createPlatePlugin({
  key: 'column-item',
  node: { isElement: true, type: 'column-item', component: ColumnItemElement },
})

const CalloutBoxPlugin = createPlatePlugin({
  key: 'callout-box',
  node: { isElement: true, type: 'callout-box', component: CalloutBoxElement },
})

const plugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  DetailSectionPlugin,
  DetailImagePlugin,
  TwoColumnSectionPlugin,
  ColumnItemPlugin,
  CalloutBoxPlugin,
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

  const insertImageBlock = () => {
    Transforms.insertNodes(plateEditor, detailImage(editorImageLibrary[0]) as any)
  }

  const insertTwoColumnBlock = () => {
    Transforms.insertNodes(plateEditor, twoColumnSection() as any)
  }

  const insertCalloutBlock = () => {
    Transforms.insertNodes(plateEditor, calloutBox() as any)
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
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            insertImageBlock()
          }}
        >
          插图
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            insertTwoColumnBlock()
          }}
        >
          分栏
        </button>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            insertCalloutBlock()
          }}
        >
          底色
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
          placeholder="按 B 端市场页的方式组织：一句定位、使用流程、界面证据、上线变化、接入边界。"
        />
      </Plate>
    </div>
  )
}

function PreviewBlock({ node }: { node: any }) {
  if (!node || Text.isText(node)) return null

  if (node.type === 'detail-image') {
    const image = node.image || {}
    return (
      <figure className="draft-image-card">
        <img className="draft-image" src={image.src} alt={image.alt || '详情配图'} />
        <figcaption className="draft-image-copy">
          <span className="draft-image-label">{image.label || '界面证据'}</span>
          <strong className="draft-image-title">{image.title}</strong>
          <p className="draft-image-caption">{image.caption}</p>
          <p className="draft-image-value">{image.value}</p>
        </figcaption>
      </figure>
    )
  }

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

function TemplateGallery({
  activeTemplateId,
  onSelect,
  variant,
}: {
  activeTemplateId: DetailTemplateId
  onSelect: (template: DetailTemplate) => void
  variant: 'compact' | 'drawer'
}) {
  const listClassName = variant === 'compact' ? 'template-list compact' : 'template-list'

  return (
    <div className={listClassName}>
      {detailTemplates.map((template) => {
        const isActive = activeTemplateId === template.id
        const cardClassName = isActive
          ? `template-card ${variant} active`
          : `template-card ${variant}`

        return (
          <button
            key={template.id}
            className={cardClassName}
            type="button"
            onClick={() => onSelect(template)}
          >
            {variant === 'compact' ? (
              <>
                <strong>{template.title}</strong>
                <span>{template.description}</span>
              </>
            ) : (
              <>
                <div className="template-copy">
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                </div>
              </>
            )}
          </button>
        )
      })}
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
  onSelectTemplate,
  onUseExample,
  selectedTemplateId,
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
  onSelectTemplate: (template: DetailTemplate) => void
  onUseExample: (example: AssistantExample) => void
  selectedTemplateId: DetailTemplateId
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
            <span>先补关键事实，再生成更像 B 端市场页的产品说明。</span>
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
          <div className="assistant-block__title">表达模板</div>
          <TemplateGallery
            activeTemplateId={selectedTemplateId}
            onSelect={onSelectTemplate}
            variant="drawer"
          />
        </div>

        <div className="assistant-block">
          <div className="assistant-block__title">快捷范例</div>
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
          <div className="assistant-block__title">关键事实</div>
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
                onChange={(event) => onChangeAnswer(activePrompt.key, event.target.value)}
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
            <div className="assistant-block__title">草稿预览</div>
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<DetailTemplateId>(defaultTemplate.id)
  const [seed, setSeed] = useState(1)
  const [currentStep, setCurrentStep] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [value, setValue] = useState<Value>(() => copyValue(buildDraft(defaultAnswers, defaultTemplate)))
  const [answers, setAnswers] = useState<AssistantAnswers>(defaultAnswers)
  const [draft, setDraft] = useState<Value>(() => buildDraft(defaultAnswers, defaultTemplate))
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusLabel, setStatusLabel] = useState(`当前模板：${defaultTemplate.title}`)

  const selectedTemplate = getTemplateById(selectedTemplateId)

  const updateAnswer = (key: keyof AssistantAnswers, nextValue: string) => {
    setAnswers((current) => ({ ...current, [key]: nextValue }))
  }

  const nextStep = () => {
    setCurrentStep((current) => Math.min(current + 1, assistantPrompts.length - 1))
  }

  const prevStep = () => {
    setCurrentStep((current) => Math.max(current - 1, 0))
  }

  const applyTemplate = (template: DetailTemplate) => {
    setSelectedTemplateId(template.id)
    setAnswers(template.answers)
    setDraft(buildDraft(template.answers, template))
    setCurrentStep(0)
    setStatusLabel(`已切换模板：${template.title}`)
    setErrorMessage(null)
    setDrawerOpen(true)
  }

  const useExample = (example: AssistantExample) => {
    const template = getTemplateById(example.templateId)
    setSelectedTemplateId(template.id)
    setAnswers(example.answers)
    setDraft(buildDraft(example.answers, template))
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
        body: JSON.stringify({
          answers,
          template: {
            title: selectedTemplate.title,
            description: selectedTemplate.description,
            layoutHint: selectedTemplate.layoutHint,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'AI 服务暂时不可用')
      }

      const payload = (await response.json()) as { draft: DraftPayload; model?: string }
      setDraft(draftPayloadToValue(payload.draft, selectedTemplate, answers))
      setStatusLabel(
        payload.model
          ? `已使用 ${selectedTemplate.title} · AI 模型：${payload.model}`
          : `已使用 ${selectedTemplate.title} 生成草稿`
      )
    } catch (error) {
      setDraft(buildDraft(answers, selectedTemplate))
      setStatusLabel(`未命中 AI 服务，已回退到本地 ${selectedTemplate.title} 草稿`)
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
                <input className="sim-input" value="AI 辅助生成更像 B 端市场页的插件详情内容" readOnly />
              </div>

              <div className="sim-row">
                <label>插件分类</label>
                <div className="sim-select">最多可选 3 个插件分类</div>
              </div>

              <div className="sim-row editor-row">
                <label>插件详情</label>
                <div className="editor-field">
                  <div className="editor-hint-row">
                    <span>通过 AI 助手选择模板、补关键事实，再生成详情。</span>
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
        onSelectTemplate={applyTemplate}
        onUseExample={useExample}
        selectedTemplateId={selectedTemplateId}
        statusLabel={statusLabel}
      />
    </div>
  )
}

export default App
