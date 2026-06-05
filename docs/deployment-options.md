# Deployment Options

Lumina's main value is AI co-reading through a connector. That means the
reading room should have a stable public HTTPS URL.

## Recommended Path

Use:

```text
VPS + your own domain + Docker + Caddy HTTPS
```

Start here:

```text
docs/deploy-docker.md
```

This gives you:

- A phone-friendly web reading room at `https://your-domain.example`.
- A stable ChatGPT/Codex connector endpoint at `https://your-domain.example/mcp`.
- A stable Claude.ai connector endpoint at `https://your-domain.example/sse`.
- User-owned books, notes, progress, and token storage.
- Automatic HTTPS through Caddy.

## Quick Choice

| Goal | Path | Status |
| --- | --- | --- |
| Use Lumina as intended with ChatGPT or Claude | VPS + domain + Caddy | Recommended |
| Develop or debug the web app locally | Local Node/Vite server | Developer-only |
| Temporarily test remote MCP reachability | Cloudflare Quick Tunnel | Temporary only |
| Avoid a server entirely | Static hosting only | Not enough for remote AI connectors |

## Why A Server Is The Main Path

ChatGPT web, Claude.ai, and similar remote AI clients run outside your laptop
and phone. They cannot reach `localhost` or a private Wi-Fi address. They need a
public HTTPS endpoint.

The connector is also the security boundary. It checks the token and only
returns reading waterline-safe content to the AI client.

## Local Development

Local mode is still useful for developers:

```bash
npm run quickstart
npm run dev:mobile
```

Read:

```text
docs/local-dev.md
```

Do not treat this as the product's main user path. A local-only reader does not
show Lumina's core value.

## Cloudflare Tunnel

Cloudflare Quick Tunnel can expose a local server through a temporary HTTPS URL:

```bash
cloudflared tunnel --url http://localhost:8787
```

This is useful for quick MCP experiments. It is not the recommended production
path because the URL is temporary and can change.

Read:

```text
docs/deploy-cloudflare-tunnel.md
```

## Static Hosting Alone Is Not Enough

The web app can be served as static files, but remote AI connectors need a
server endpoint that can:

- Validate the connector token.
- Read and write books, notes, and progress.
- Enforce the reading waterline before returning context to AI.

So static hosting alone is not a complete Lumina deployment.
