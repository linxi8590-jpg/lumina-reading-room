# Lumina Reading Room / 星灯书房

Lumina 是一个自托管的 AI 共读书房。

你把书上传到自己的服务器，在手机或电脑浏览器里阅读；ChatGPT、Claude 等 AI 通过连接器进入书房，只能看到你已经读到的位置以内的内容，陪你摘金句、写笔记、整理问题。

核心不是“再做一个本地阅读器”。核心是：**AI 陪你读书，但不能偷看你还没读到的章节。**

## 第一件事：准备服务器和域名

你需要：

- 一台小服务器，Ubuntu 或 Debian 系统即可。
- 一个域名或子域名，例如 `lumina.example.com`。
- 把这个域名的 `A` 记录指向服务器公网 IP。

服务器不需要很大。只给自己读书和连接 AI，用轻量 VPS 就够。

## 一键部署

SSH 登录服务器：

```bash
ssh root@your-server-ip
```

在服务器里运行，把域名换成你自己的：

```bash
curl -fsSL https://raw.githubusercontent.com/linxi8590-jpg/lumina-reading-room/main/scripts/install-vps.sh | bash -s -- --domain lumina.example.com
```

如果你不是用 `root` 登录，把 `bash` 换成 `sudo bash`。

脚本会自动完成：

- 安装 Docker 和 Docker Compose。
- 小内存服务器会尝试创建 2GB swap，创建不了也会继续安装。
- 拉取 Lumina 代码。
- 生成连接器令牌。
- 把书、笔记和进度存在 `/opt/lumina-reading-room/data`。
- 构建并启动 Lumina。
- 用 Caddy 自动申请 HTTPS 证书。

成功后会打印：

```text
Open the reading room:
  https://lumina.example.com

MCP connector:
  Server URL: https://lumina.example.com/mcp
  Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

保存好这段输出。`lrr_...` 是书房钥匙，不要公开发到 GitHub issue、论坛或截图里。

## 打开网页以后做什么？

1. 用手机或电脑浏览器打开脚本打印的 `https://你的域名`。
2. 进入连接配置页，把脚本打印的 `lrr_...` 令牌保存进去。
3. 回到书架，上传一本 TXT、Markdown 或 EPUB。
4. 打开书开始阅读。
5. 在正文旁边写笔记、摘句子、记问题。
6. 回到连接配置页，复制 ChatGPT 或 Claude 的连接器配置。
7. 在对应 AI 客户端里添加这个连接器，让 AI 陪你读当前进度以内的内容。

## 连接器怎么填？

部署完成后，你会得到两个值：

```text
Lumina URL: https://lumina.example.com
Connector Token: lrr_xxxxxxxxxxxxxxxxxxxxx
```

支持 header 的远程 MCP 客户端填写：

```text
Server URL: https://lumina.example.com/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

如果客户端只让你填写一个 URL，就用：

```text
https://lumina.example.com/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

网页里的连接配置页会按 ChatGPT、Claude、Codex、Claude Code 分别生成可复制配置。

## 适合谁？

- 想让 AI 陪自己读小说、传记、散文、论文或长文的人。
- 想自己保管书、笔记和阅读进度的人。
- 愿意准备一台小服务器和一个域名，但不想自己写整套系统的人。

不适合作为纯本地阅读器使用。只想在本机读书写笔记的话，市面上已经有很多成熟 App。

## 核心原则

- AI 只能读你已经读过的内容。
- 书、笔记、进度和连接令牌都归你自己保管。
- 公开服务器必须启用连接令牌，不能裸奔。

## 更新已经部署的服务器

再次 SSH 登录服务器，重新运行同一条安装命令即可：

```bash
curl -fsSL https://raw.githubusercontent.com/linxi8590-jpg/lumina-reading-room/main/scripts/install-vps.sh | bash -s -- --domain lumina.example.com
```

脚本会保留原来的连接令牌和数据目录，只更新代码和容器。

## 当前状态

这是早期可测试版本，已经支持：

- 上传 TXT、Markdown、EPUB。
- 网页阅读和写笔记。
- 阅读水位线：AI 只能看到已读内容。
- 生成 ChatGPT、Claude、Codex、Claude Code 的连接器配置。
- VPS + 域名 + Caddy HTTPS 一键部署。

项目 license 还没最终决定。正式复用或再分发前，请等仓库加入 `LICENSE` 文件。

## 更多文档

第一次使用只需要看上面的部署步骤。下面是进阶内容：

```text
docs/deploy-docker.md              # VPS / Docker 部署细节
docs/deployment-options.md         # 不同部署方式对比
docs/connectors.md                 # 各 AI 客户端连接说明
docs/local-dev.md                  # 开发者本地试跑
docs/deploy-cloudflare-tunnel.md   # 临时 HTTPS 隧道，只用于测试
docs/security.md                   # 公开部署的安全边界
```

## 本地开发

开发者可以在本机跑：

```bash
git clone https://github.com/linxi8590-jpg/lumina-reading-room.git
cd lumina-reading-room
npm run quickstart
npm run dev:mobile
```

本地开发路径不是普通用户主路径。远程 AI 客户端要稳定连接，仍然需要公网 HTTPS 地址。
