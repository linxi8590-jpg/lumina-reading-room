# Deploy with Docker

Docker 模式适合有服务器的人。

你需要：

- 一台能运行 Docker 的机器。
- 一个域名。
- HTTPS。ChatGPT Apps / 远程 MCP 通常需要公网 HTTPS 地址。

## 第 1 步：复制环境变量

```bash
cp deploy/docker/.env.example deploy/docker/.env
```

生成连接器令牌：

```bash
node scripts/generate-token.mjs
```

把输出填入：

```text
LUMINA_CONNECTOR_TOKEN=
```

## 第 2 步：启动服务

```bash
cd deploy/docker
docker compose up -d
```

## 第 3 步：检查服务

```bash
curl https://your-domain.example/health
```

如果返回：

```json
{"ok":true}
```

说明服务活着。

## 第 4 步：连接 AI App

连接器地址：

```text
https://your-domain.example/mcp
```

认证方式：

```text
Authorization: Bearer <your-token>
```

## 部署提醒

- 不要把 `.env` 提交到 GitHub。
- 不要在公开教程截图里露出 token。
- 服务器要开 HTTPS。
- 如果你的服务器暴露到公网，要保留 token 校验和基础限流。

