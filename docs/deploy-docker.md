# Deploy With Docker

Docker mode is the long-term self-hosting path. Use it when you have a VPS,
NAS, home server, Coolify machine, or any server that can run Docker.

If you only want to try Lumina locally, read:

```text
docs/local-dev.md
```

If you are not sure whether you need a domain, read:

```text
docs/deployment-options.md
```

## What You Need

For a stable public AI connector, you need:

- A server that can run Docker and Docker Compose.
- A domain or subdomain, for example `lumina.example.com`.
- DNS pointing that domain to the server.
- Ports `80` and `443` open on the server.

The included Docker setup runs:

- `postgres`: stores books, reading progress, and notes.
- `server`: serves the API and `/mcp` connector.
- `caddy`: terminates HTTPS and reverse-proxies to the server.

## 1. Copy The Environment File

From the repository root:

```bash
cp deploy/docker/.env.example deploy/docker/.env
```

Edit `deploy/docker/.env`:

```text
POSTGRES_PASSWORD=change_this_password
LUMINA_CONNECTOR_TOKEN=
LUMINA_DOMAIN=lumina.example.com
```

Generate a connector token:

```bash
node scripts/generate-token.mjs
```

Paste the generated token into `LUMINA_CONNECTOR_TOKEN`.

Set `LUMINA_DOMAIN` to your real domain or subdomain.

## 2. Point DNS To The Server

Create a DNS record:

```text
lumina.example.com  A  your.server.ip.address
```

If your server has IPv6, you can also add an `AAAA` record.

Wait until DNS resolves:

```bash
dig lumina.example.com
```

## 3. Start Lumina

```bash
cd deploy/docker
docker compose up -d
```

Check the containers:

```bash
docker compose ps
```

Caddy will request an HTTPS certificate automatically. The first start can take
a short moment while DNS and certificate issuance settle.

## 4. Check The Server

Open:

```text
https://lumina.example.com/health
```

Or run:

```bash
curl https://lumina.example.com/health
```

Expected result:

```json
{"ok":true,"service":"lumina-server"}
```

## 5. Connect The Web App

In the Lumina web app, use:

```text
Lumina URL: https://lumina.example.com
Connector Token: lrr_xxxxxxxxxxxxxxxxxxxxx
```

The connector endpoint is:

```text
https://lumina.example.com/mcp
```

## 6. Connect An AI Client

For ChatGPT Apps, Claude.ai, or another remote MCP client, use:

```text
Server URL: https://lumina.example.com/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

Remote AI clients cannot reach your `localhost`. They need this public HTTPS
URL.

## Temporary No-Domain Test

If you do not own a domain yet, you can test with Cloudflare Tunnel from your
local machine:

```bash
node apps/server/src/index.js
cloudflared tunnel --url http://localhost:8787
```

Use the printed `https://...trycloudflare.com/mcp` URL in the AI client.

This is good for testing, but not for long-term use. The tunnel URL can change.

## Troubleshooting

### `/health` does not load

Check containers:

```bash
cd deploy/docker
docker compose ps
docker compose logs caddy
docker compose logs server
```

Check that DNS points to the server and ports `80` and `443` are open.

### AI client says unauthorized

Check that the AI client sends:

```text
Authorization: Bearer <your-token>
```

The token must match `LUMINA_CONNECTOR_TOKEN` in `deploy/docker/.env`.

### Caddy cannot get a certificate

Common causes:

- The domain does not point to this server.
- Ports `80` or `443` are blocked.
- Another web server is already using those ports.

## Safety Notes

- Do not commit `deploy/docker/.env`.
- Do not publish screenshots that show your connector token.
- Keep token validation enabled for public deployments.
- Rotate the token if it appears in a public issue, README, screenshot, or log.

