# Lumina Web

The consumer-grade reading room UI.

Components: bookshelf, reader, reading waterline, user notes, AI notes, connector setup page.

The implementation follows the UI spec at `docs/ui-spec.md`.

## Dev

```bash
pnpm install
pnpm --filter @lumina/web dev
```

By default the dev server expects the lumina backend at `http://localhost:3000`.
Override with `LUMINA_SERVER_URL` env var when running `pnpm dev`.

The dev server runs on port 5173 and proxies `/health`, `/mcp`, `/api` to the backend.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (color tokens map to CSS variables in `src/styles/global.css`)
- React Router
