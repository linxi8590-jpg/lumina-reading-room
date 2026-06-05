# Lumina Web

The consumer-grade reading room UI.

Components: bookshelf, reader, reading waterline, user notes, AI notes, connector setup page.

The implementation follows the UI spec at `docs/ui-spec.md`.

## Dev

```bash
pnpm install
pnpm --filter @lumina/web dev
```

By default the dev server expects the lumina backend at `http://localhost:8787`.
Override with `LUMINA_SERVER_URL` env var when running `pnpm dev`.

The dev server runs on port 5173 and proxies `/health`, `/mcp`, `/sse`, `/message`, `/api` to the backend.

Connector tokens are entered by the user from `bash scripts/quickstart.sh` or `.env`; the web app should not fetch the token from a public endpoint.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (color tokens map to CSS variables in `src/styles/global.css`)
- React Router
