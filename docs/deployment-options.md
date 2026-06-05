# Deployment Options

Lumina can run in three different ways. Pick the smallest path that matches
what you want to test.

## Quick Choice

| Goal | Needs domain? | Good for |
| --- | --- | --- |
| Read locally in the browser | No | Trying Lumina on your own computer |
| Let a remote AI client reach your local server | No owned domain, but needs a temporary HTTPS URL | Testing ChatGPT Apps, Claude.ai, or other remote MCP clients |
| Run Lumina long term for yourself | Yes, or a hosted HTTPS subdomain | Daily use and stable AI connector setup |

## Option A: Local Reading Only

Use this when you just want to upload a book, read it, and write notes in the
web app.

You need:

- Node.js.
- This repository.

You do not need:

- A domain.
- A VPS.
- HTTPS.

Start here:

```text
docs/local-dev.md
```

This mode can fully test the web reader, uploads, notes, export, and reading
waterline. It is not enough for ChatGPT web or Claude.ai to connect from the
internet, because those services cannot reach your `localhost`.

## Option B: Temporary HTTPS Tunnel

Use this when you want to test a remote AI client without buying a domain or
opening router/firewall ports.

You need:

- The local Lumina server running on your machine.
- A tunneling tool such as Cloudflare Tunnel.

Example:

```bash
node apps/server/src/index.js
cloudflared tunnel --url http://localhost:8787
```

Cloudflare will print a temporary HTTPS URL like:

```text
https://example-name.trycloudflare.com
```

Use this connector URL in the AI client:

```text
https://example-name.trycloudflare.com/mcp
```

This is the lowest-friction way to prove that a remote MCP client can reach
Lumina. The tradeoff is that the URL is temporary. When the tunnel stops, the
URL may change and the AI client configuration must be updated.

Start here:

```text
docs/deploy-cloudflare-tunnel.md
```

## Option C: Long-Term Self Hosting

Use this when you want a stable reading room that you can keep using.

You need one of these:

- A VPS, NAS, home server, or any machine that can run Docker.
- A PaaS service such as Railway, Fly.io, Render, Coolify, or similar.

You also need an HTTPS address. This can be:

- Your own domain, for example `lumina.example.com`.
- A platform-provided HTTPS subdomain.

The stable connector URL will be:

```text
https://lumina.example.com/mcp
```

Start here:

```text
docs/deploy-docker.md
```

## Why Remote AI Clients Need HTTPS

Localhost belongs to the machine where it is opened. Your browser can open
`http://localhost:5173`, but ChatGPT web and Claude.ai run outside your machine.
They need a public URL that can route back to your Lumina server.

For local-only reading, do not worry about this. For AI co-reading from a remote
client, plan for HTTPS.
