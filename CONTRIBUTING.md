# Contributing

Thanks for helping improve Lumina Reading Room.

Lumina is a self-hosted AI co-reading room. The most important product rule is:

```text
AI can only see what the reader has already reached.
```

If a change weakens that boundary, it needs a very clear reason and tests.

## Local Setup

Use Node.js and pnpm.

```bash
pnpm install
npm run quickstart
npm run smoke:local
pnpm --filter @lumina/web build
```

`npm run quickstart` creates a local `.env` file with a connector token. Do not
commit `.env`, local book data, screenshots containing tokens, or logs with
tokens.

## Project Layout

```text
apps/web              # Web reading room UI
apps/server           # Local API and MCP server
deploy/supabase       # Supabase schema
deploy/docker         # Docker deployment template
docs                  # Product, deployment, and architecture docs
scripts               # Local setup and smoke tests
```

## Pull Request Checklist

Before opening a PR, run:

```bash
npm run smoke:local
pnpm --filter @lumina/web build
```

For docs-only changes, at least check that links and commands still match the
repo.

For server or connector changes, verify:

- unread text is not returned by MCP tools
- notes cannot be written to locked paragraphs
- connector tokens are not printed in logs
- `.lumina/`, `.env`, and temporary smoke data stay out of Git

For web changes, verify:

- text fits on mobile and desktop
- controls have accessible labels or native text labels
- Settings diagnostics and Connector setup still work without exposing tokens

## Documentation Style

Write for readers who may not know what API, MCP, Docker, or tokens are.
Explain the first use of a technical term in plain language.

Prefer concrete commands and examples over abstract setup prose.

## License

The project license has not been selected yet. Do not assume reuse or
redistribution rights until the repository contains a `LICENSE` file.
