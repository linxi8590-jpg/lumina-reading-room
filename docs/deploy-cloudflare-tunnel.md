# Deploy With Cloudflare Tunnel

Cloudflare Tunnel is a developer testing path for Lumina. Use it when you want
to check a remote AI client before setting up a real VPS domain.

It gives your local Lumina server a temporary HTTPS URL such as:

```text
https://example-name.trycloudflare.com
```

Use this path when you want to test ChatGPT Apps, Claude.ai, or another remote
MCP client for a short time.

## What You Need

- A local Lumina server running on your computer.
- `cloudflared` installed.
- Your connector token from `.env`.

For this temporary test, you do not need:

- A domain.
- A VPS.
- Router port forwarding.
- Manual TLS certificates.

Cloudflare's Quick Tunnel command is:

```bash
cloudflared tunnel --url http://localhost:8787
```

## 1. Start Lumina Locally

From the repository root:

```bash
bash scripts/quickstart.sh
node apps/server/src/index.js
```

Check that the server is alive:

```bash
curl http://127.0.0.1:8787/health
```

Expected result:

```json
{"ok":true,"service":"lumina-server"}
```

## 2. Start The Tunnel

Open another terminal:

```bash
cloudflared tunnel --url http://localhost:8787
```

Copy the printed `https://...trycloudflare.com` URL.

If the printed URL is:

```text
https://example-name.trycloudflare.com
```

then your connector URL is:

```text
https://example-name.trycloudflare.com/mcp
```

## 3. Connect An AI Client

In ChatGPT Apps, Claude.ai, or another remote MCP client, use:

```text
Server URL: https://example-name.trycloudflare.com/mcp
Authorization: Bearer <your-token>
```

`<your-token>` is the `LUMINA_CONNECTOR_TOKEN` value in your local `.env`.

Do not publish this token in screenshots, GitHub issues, blog posts, or public
chat logs.

## 4. Use The Web Reader

You can keep using the web reader locally:

```bash
pnpm --filter @lumina/web dev --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

In the connection page, you can use either:

```text
Lumina URL: http://127.0.0.1:8787
```

or the tunnel URL:

```text
Lumina URL: https://example-name.trycloudflare.com
```

Use the tunnel URL if you want the web diagnostics to check the same public
entrypoint that the AI client uses.

## Important Limits

Quick Tunnel is for testing.

- The `trycloudflare.com` URL can change when you restart the tunnel.
- If the URL changes, update the AI client configuration.
- If your computer sleeps or disconnects, the AI client cannot reach Lumina.
- Long-term use should move to `docs/deploy-docker.md`.
- A stable named Cloudflare Tunnel still needs your own domain or subdomain.

## Why This Works

Remote AI clients cannot access your `localhost`. `cloudflared` creates an
outbound connection from your machine to Cloudflare, and Cloudflare gives you a
temporary public HTTPS URL. Requests to that URL are forwarded back to your
local Lumina server.
