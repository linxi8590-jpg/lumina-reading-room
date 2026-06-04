import { Link } from 'react-router-dom'
import { isConfigured } from '../lib/api'

const STEPS = [
  {
    title: '先放书',
    body: '贴入 TXT 或 Markdown，Lumina 会按标题和章节切成可阅读的段落。',
    href: '/upload',
    action: '上传一本书',
  },
  {
    title: '再接 AI',
    body: '把 Lumina 地址和连接器令牌贴到你常用的 AI 客户端里。',
    href: '/connector',
    action: '连接 AI',
  },
  {
    title: '自己管数据',
    body: '选择本地 / Docker 或 Supabase，书、笔记和进度都存在你选的地方。',
    href: '/settings',
    action: '选择存储',
  },
]

export default function Onboarding() {
  const configured = isConfigured()
  const primaryHref = configured ? '/shelf' : '/connector'
  const primaryLabel = configured ? '进入书架' : '先连接 AI'

  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <p className="text-sm text-sky-700 mb-2">Lumina Reading Room</p>
          <h1 className="text-4xl font-serif mb-4">星灯书房</h1>
          <p className="reading max-w-2xl text-ink-700">
            AI 只读你已经读过的页。你翻到哪里，它就跟到哪里。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={primaryHref}
              className="inline-block px-4 py-2 bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 transition-colors"
              aria-label={primaryLabel}
            >
              {primaryLabel}
            </Link>
            <Link
              to="/settings"
              className="inline-block px-4 py-2 border border-ink-500/30 rounded hover:bg-paper-100 transition-colors"
              aria-label="打开存储设置"
            >
              存储设置
            </Link>
          </div>
        </header>

        <section
          aria-label="开始使用"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          {STEPS.map((step, idx) => (
            <article
              key={step.title}
              className="bg-paper-100 border border-ink-500/15 rounded-lg p-4"
            >
              <div
                className="w-8 h-8 rounded-full bg-lamp-200 text-ink-900 flex items-center justify-center text-sm font-medium mb-3"
                aria-hidden="true"
              >
                {idx + 1}
              </div>
              <h2 className="font-medium mb-2">{step.title}</h2>
              <p className="text-sm text-ink-700 mb-4">{step.body}</p>
              <Link
                to={step.href}
                className="text-sm text-sky-700 underline"
                aria-label={step.action}
              >
                {step.action}
              </Link>
            </article>
          ))}
        </section>

        <section
          aria-label="共读边界"
          className="bg-paper-100 border border-ink-500/15 rounded-lg p-5"
        >
          <h2 className="font-medium mb-2">共读边界</h2>
          <p className="text-sm text-ink-700">
            连接器只把已解锁内容交给 AI。未读章节不会出现在当前页、笔记接口或
            MCP 工具返回里。
          </p>
          <Link
            to="/shelf"
            className="inline-block mt-4 text-sm text-sky-700 underline"
            aria-label="打开书架"
          >
            打开书架
          </Link>
        </section>
      </div>
    </main>
  )
}
