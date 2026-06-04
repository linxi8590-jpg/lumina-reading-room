# Lumina Reading Room

Lumina Reading Room is a self-hosted AI co-reading room.

中文名：星灯书房。

AI reads only the pages you've read.

AI 只读你已经读过的页。

核心原则：

- AI 只能读你已经读过的内容。
- 书、笔记、连接器令牌都归用户自己保管。
- AI 可以写读书笔记、圈重点、摘金句，但不能偷看你还没读到的章节。

## 这是什么

你在网页里读书。网页会记录你读到哪里、写了什么笔记。

你在 ChatGPT、Claude、Codex、Claude Code 等 AI 工具里连接 Lumina 后，AI 可以通过连接器读取“你已经读过的部分”和“你的读书笔记”，然后陪你继续读。

AI 不是拿到整本书以后装作不知道结局。它从数据层就只能拿到你的阅读水位线以内的内容。

## 适合谁

- 想让 AI 陪自己读小说、传记、散文的人。
- 想让 AI 帮忙圈重点、摘金句、做复习笔记的人。
- 想自托管，不希望把自己的书和笔记交给平台的人。

## 现在的状态

这是项目骨架第一刀，先固定部署方式、数据表、连接器工具和帮助文档结构。

UI 规格会放在：

```text
~/.yuheng/shared/lumina-reading-room-ui-spec.md
```

## 选择一种安装方式

### 方式 A：Supabase 模式

适合不想买服务器的人。

你需要：

- 一个 Supabase 账号。
- 一个静态网页托管服务，例如 Cloudflare Pages、Vercel 或 GitHub Pages。
- 一个轻量连接器服务。它可以是 Supabase Edge Function，也可以是你自己部署的 `apps/server`。

注意：网页可以直接读写你自己的 Supabase 数据，但 AI 连接器不能只靠静态网页完成。连接器需要一个服务端入口来检查令牌、过滤已读内容、保护数据库写权限。

看这里：

```text
docs/deploy-supabase.md
```

### 方式 B：服务器 / Docker 模式

适合有 VPS、NAS、家用服务器或 Coolify/Railway 的人。

你需要：

- 一台能跑 Docker 的机器。
- 一个可以访问的 HTTPS 域名。

看这里：

```text
docs/deploy-docker.md
```

## 什么是连接器令牌

连接器令牌就是你书房的钥匙。

谁拿到这个令牌，谁就可以让 AI 进入你的书房读取“你已经读过的内容”。所以它必须自己保存，不能公开贴到网页、帖子或 GitHub issue 里。

生成一个令牌：

```bash
node scripts/generate-token.mjs
```

## 连接器地址格式

部署完成后，你会得到两个东西：

```text
Lumina URL: https://your-domain.example
Connector Token: lrr_xxxxxxxxxxxxxxxxxxxxx
```

连接器地址通常是：

```text
https://your-domain.example/mcp
```

在支持远程 MCP / ChatGPT Apps 的客户端里填写：

```text
Server URL: https://your-domain.example/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

## 项目结构

```text
apps/web              # 网页阅读器，UI 由枢主刀
apps/server           # API + MCP server
packages/core         # 阅读水位线、分页、权限规则
deploy/supabase       # Supabase SQL 和策略
deploy/docker         # Docker 部署模板
scripts               # 一键脚本和检查工具
docs                  # 面向普通用户的帮助文档
```

## 最重要的安全边界

- 不要把书上传到 Lumina 官方服务器；本项目默认不提供官方托管书库。
- 不要公开连接器令牌。
- MCP 工具只能返回已读内容，不能返回未读章节。
- AI 写笔记是写入用户自己的存储，不写到项目维护者的服务器。
