# Lumina Reading Room / 星灯书房

这是一个可以自己运行的网页阅读器。你把书放进去，在网页里阅读、写笔记；再把它连到 ChatGPT、Claude 等 AI，AI 就能陪你读书。

最重要的一点：**AI 只能看到你已经读过的内容**，不能提前偷看后面的章节。

## 我刚来，第一步做什么？

先不要管部署、域名、AI 连接方式、Docker。第一次只需要把本地阅读器跑起来。

你需要先装好 Node.js。然后打开终端，照抄下面几行：

```bash
git clone https://github.com/linxi8590-jpg/lumina-reading-room.git
cd lumina-reading-room
npm run quickstart
npm run dev:mobile
```

`quickstart` 会自动安装依赖，并生成一串 `lrr_...` 开头的连接令牌。先留着这串令牌，等一下网页里要粘贴。

`dev:mobile` 会同时启动后台服务和网页。它会打印两个地址：

- 电脑打开：`http://localhost:5173/`
- 手机打开：类似 `http://192.168.1.20:5173/`

手机和电脑要连同一个 Wi-Fi。手机不要打开 `localhost`，要打开脚本打印的 `192.168...` 地址。

## 打开网页以后做什么？

第一次打开网页，按这个顺序走：

1. 进入连接配置页。
2. 确认 Lumina URL 已经填好。电脑一般是 `http://127.0.0.1:8787`，手机一般是 `http://192.168...:8787`。
3. 把 `quickstart` 打印的 `lrr_...` 令牌粘进去，点保存。
4. 回到书架。
5. 上传一本 TXT、Markdown 或 EPUB。
6. 打开书，开始阅读。
7. 在正文旁边写一条笔记。

这一圈跑通以后，你已经有了一个可用的本地阅读器。

## 什么时候连接 AI？

第一圈先别急着连 AI。先确认你能上传书、阅读、写笔记。

第二圈再去连接配置页，复制 ChatGPT 或 Claude 那一栏生成的配置，填到对应 AI 客户端里。ChatGPT web、Claude.ai 这类云端服务需要一个公网 HTTPS 地址；只在自己电脑或手机同 Wi-Fi 阅读，不需要域名。

## 这项目适合谁？

- 想让 AI 陪自己读小说、传记、散文的人。
- 想让 AI 帮忙圈重点、摘金句、做复习笔记的人。
- 想自己保管书和笔记，不想全部交给平台的人。

## 核心原则

- AI 只能读你已经读过的内容。
- 书、笔记、连接令牌都归用户自己保管。
- AI 可以写读书笔记、圈重点、摘金句，但不能偷看你还没读到的章节。

## 当前状态

这是早期可测试版本，已经能本地跑起来：

- 上传 TXT、Markdown、EPUB。
- 在网页里阅读、写笔记。
- 在电脑浏览器或手机同 Wi-Fi 浏览器里使用。
- 生成 ChatGPT、Claude、Codex、Claude Code 等客户端可复制的连接配置。

项目 license 还没最终决定。正式复用或再分发前，请等仓库加入 `LICENSE` 文件。

## 选择一种安装方式

下面是进阶内容。第一次试用时可以先跳过，先按上面的步骤把本地阅读器跑起来。

不确定自己需不需要域名，先看这里：

```text
docs/deployment-options.md
```

最短结论：

- 只在自己电脑上读书和写笔记：不需要域名。
- 想让 ChatGPT web、Claude.ai 等远程 AI 客户端连接：需要公网 HTTPS 地址。
- 不想买域名也能临时测试：可以用 Cloudflare Tunnel 这类临时 HTTPS 隧道。

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

### 方式 B：Cloudflare Tunnel 临时 HTTPS

适合不想买域名，但想让 ChatGPT web、Claude.ai 等远程 AI 客户端临时连进来试用的人。

你需要：

- 本机 Lumina server。
- `cloudflared`。

看这里：

```text
docs/deploy-cloudflare-tunnel.md
```

### 方式 C：服务器 / Docker 模式

适合有 VPS、NAS、家用服务器或 Coolify/Railway 的人。

你需要：

- 一台能跑 Docker 的机器。
- 一个可以访问的 HTTPS 地址。长期使用建议绑定自己的域名；临时测试可以用隧道或平台自带子域名。

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

## 手机实测

手机和电脑连同一个 Wi-Fi 后，可以直接跑：

```bash
npm run dev:mobile
```

脚本会打印两个地址：

- 手机浏览器打开的 Web 地址，例如 `http://192.168.1.20:5173/`。
- 连接配置页要填写的 Lumina URL，例如 `http://192.168.1.20:8787`。

手机上的 `localhost` 指的是手机自己，不是你的电脑。所以手机实测不要填 `http://localhost:8787`。

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

在支持 header 的远程 MCP 客户端里填写：

```text
Server URL: https://your-domain.example/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

如果客户端只让你填写一个远程 MCP URL，使用带 token 的连接器 URL：

```text
https://your-domain.example/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

本地也可以直接打印每个客户端的配置：

```bash
npm run connector:config
```

## 项目结构

```text
apps/web              # 网页阅读器
apps/server           # API + MCP server
packages/core         # 阅读水位线、分页、权限规则
deploy/supabase       # Supabase SQL 和策略
deploy/docker         # Docker 部署模板
scripts               # 一键脚本和检查工具
docs                  # 面向普通用户的帮助文档
```

## 本地开发

```bash
pnpm install
npm run quickstart
npm run smoke:local
pnpm --filter @lumina/web build
```

更多说明：

```text
docs/local-dev.md
CONTRIBUTING.md
```

## 最重要的安全边界

- 不要把书上传到 Lumina 官方服务器；本项目默认不提供官方托管书库。
- 不要公开连接器令牌。
- MCP 工具只能返回已读内容，不能返回未读章节。
- AI 写笔记是写入用户自己的存储，不写到项目维护者的服务器。
