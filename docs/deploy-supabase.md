# Deploy with Supabase

Supabase 模式适合不想维护服务器的人。

你需要准备：

- 一个 Supabase 项目。
- 一个网页托管服务，比如 Cloudflare Pages、Vercel 或 GitHub Pages。
- 一个连接器服务。可以用 Supabase Edge Function，也可以单独部署 `apps/server`。
- 一个连接器令牌。

## 第 1 步：创建 Supabase 项目

打开 Supabase，创建一个新项目。

记下两个值：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

这些值在 Supabase 项目的 Project Settings 里可以找到。

`SUPABASE_ANON_KEY` 可以给网页使用。

`SUPABASE_SERVICE_ROLE_KEY` 只能放在连接器服务端，不能写进前端代码，也不能提交到 GitHub。

## 第 2 步：运行数据库脚本

打开 Supabase SQL Editor，把下面文件里的内容复制进去运行：

```text
deploy/supabase/schema.sql
```

这个脚本会创建书籍、章节、阅读进度、笔记和连接器令牌相关的数据表。

## 第 3 步：生成连接器令牌

在本项目目录运行：

```bash
node scripts/generate-token.mjs
```

你会得到一个类似这样的令牌：

```text
lrr_abc123...
```

令牌像钥匙，谁有它谁就能让 AI 进入你的书房。不要公开。

## 第 4 步：配置网页环境变量

创建 `.env`：

```bash
cp deploy/supabase/.env.example .env
```

填入：

```text
SUPABASE_URL=你的 Supabase URL
SUPABASE_ANON_KEY=你的 Supabase anon key
LUMINA_CONNECTOR_TOKEN=你刚生成的令牌
```

如果你部署的是连接器服务，还需要在服务端环境变量里填：

```text
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role key
```

这条只给服务端用。网页不要读取它。

## 第 5 步：部署网页

把 `apps/web` 部署到你的网页托管服务。

后续 UI 完成后，这里会补充 Cloudflare Pages / Vercel 的截图步骤。

## 第 6 步：部署连接器服务

连接器服务负责给 ChatGPT、Claude、Codex、Claude Code 等 AI 客户端提供工具。

它至少要做三件事：

- 检查 `Authorization: Bearer <connector-token>`。
- 只返回阅读水位线以内的内容。
- 允许 AI 写笔记，但不能让 AI 读取未读章节。

MVP 阶段可以先部署 `apps/server`。后续会补 Supabase Edge Function 的复制粘贴版本。

## 常见问题

### 书会传到 Lumina 官方服务器吗？

不会。Supabase 是你自己的账号，书存在你自己的项目里。

### AI 能看到整本书吗？

不能。连接器工具只返回你已经读到的部分。

### 令牌丢了怎么办？

重新生成一个，并在 Supabase 里更新连接器配置。旧令牌应该删除。
