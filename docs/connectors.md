# Connectors

连接器让 AI App 进入你的星灯书房。

它不是把整本书发给 AI。它只提供工具，让 AI 读取你已经读过的部分。

你的 AI 还不知道你的书房在哪。给它两行配置，它就能进来。

## 连接器需要填写什么

如果你只是在本机浏览器里读书，可以使用 `http://127.0.0.1:8787`。
如果你要让 ChatGPT web、Claude.ai 等远程 AI 客户端连接，必须使用公网可达的 HTTPS 地址。

支持自定义 header 的客户端通常需要两项。不同 AI 客户端的字段名会不同，但都来自这两个值：

```text
Server URL: https://your-domain.example/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

有些网页端连接器界面只让你填一个 URL。这时可以用带 token 的一行 URL：

```text
https://your-domain.example/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

这个 URL 本身也等同于钥匙，不要公开截图。

令牌像你书房的钥匙。谁拿到它，谁就能让 AI 读取你已经读过的内容。不要把它发到网上。

配置页应该长这样：

```text
连接 AI

Lumina 地址
https://your-domain.example/mcp        [拷贝]

连接器令牌
[粘贴令牌到这里]                     [保存令牌]
lrr_abcd1234••••••••••                [显示] [拷贝]
Authorization: Bearer lrr_abcd...      [拷贝]
https://.../mcp?token=lrr_abcd...      [拷贝]

这是你书房的钥匙。不要发到网上。
```

令牌保存后，输入框会清空，只留下遮罩预览。拷贝后，到你的 AI 客户端里填写这两项。

## ChatGPT / OpenAI

ChatGPT 的界面通常会让你填写远程 MCP server 地址和授权信息。OpenAI API 里的字段长这样：

```json
{
  "type": "mcp",
  "server_label": "lumina",
  "server_description": "Lumina Reading Room connector. It reads only the reader-unlocked book context and notes.",
  "server_url": "https://your-domain.example/mcp",
  "authorization": "lrr_xxxxxxxxxxxxxxxxxxxxx",
  "require_approval": "always"
}
```

如果 ChatGPT 当前界面只给你表单，不需要粘 JSON，就填：

```text
MCP URL: https://your-domain.example/mcp
Authorization token: lrr_xxxxxxxxxxxxxxxxxxxxx
```

如果界面只让你填一个远程 MCP URL，就填：

```text
https://your-domain.example/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

## Claude.ai / Claude Desktop

Claude.ai、Claude Desktop 和 Claude mobile 的远程 connector 是同一套账号级配置。添加 custom connector 时填：

```text
Connector name: Lumina
Connector URL: https://your-domain.example/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

Claude 的远程 connector 从 Anthropic 云端访问你的 server，所以 `localhost` 不可用。先用 Cloudflare Tunnel 或自己的域名拿到公网 HTTPS 地址。

如果你是从 Claude Messages API 直连 MCP server，配置片段是：

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://your-domain.example/mcp",
      "name": "lumina",
      "authorization_token": "lrr_xxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "tools": [{ "type": "mcp_toolset", "mcp_server_name": "lumina" }]
}
```

## Claude Code / Codex

Claude Code / SDK 的 HTTP MCP 配置通常把 token 放在 HTTP header：

```bash
claude mcp add --transport http lumina https://your-domain.example/mcp \
  --header "Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx"
```

```json
{
  "mcpServers": {
    "lumina": {
      "type": "http",
      "url": "https://your-domain.example/mcp",
      "headers": {
        "Authorization": "Bearer lrr_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Codex 的用户级配置可以写成：

```toml
[mcp_servers.lumina]
url = "https://your-domain.example/mcp"
http_headers = { Authorization = "Bearer lrr_xxxxxxxxxxxxxxxxxxxxx" }
```

## 连接是否正常

部署完成后，可以先打开：

```text
https://your-domain.example/health
```

正常会看到类似：

```json
{
  "ok": true,
  "service": "lumina-server"
}
```

这只说明服务器活着。AI 能不能进书房，还要看 `/mcp` 的令牌配置是否正确。

## 工具列表

本地开发阶段，`/mcp` 接收一个简单 JSON 请求：

```json
{
  "tool": "get_current_passage",
  "arguments": {}
}
```

返回格式：

```json
{
  "tool": "get_current_passage",
  "result": {
    "section_title": "Start",
    "paragraph_index": 0,
    "text": "..."
  }
}
```

### get_current_reading_state

返回当前书、当前章节、当前段落、阅读水位线。

### get_current_passage

返回当前正在读的片段。

### get_unlocked_context

返回已解锁内容。不会返回未读章节。

这是防剧透的核心工具。AI 想聊前文时，只能从这里拿到你已经读过的内容。

### get_reading_notes

返回水位线以内、用户和 AI 已经写下的笔记。未读段落上的笔记不会返回。

### save_ai_note

让 AI 写一条读书笔记。

笔记类型只能是：

```text
reflection
highlight
quote
question
review_card
```

这些类型会在网页里显示成不同样式：感受、重点、金句、问题、复习卡。

### advance_reading_progress

推进阅读水位线。这个工具应该谨慎使用，默认由网页阅读器更新。

## 给 AI 的工具说明原则

工具说明里要写清楚：

- 只能基于工具返回的内容讨论。
- 不要假设自己知道后文。
- 如果用户问未读内容，应该说“我们还没读到那里”。
- 可以写感受、重点、金句、问题、复习卡。
