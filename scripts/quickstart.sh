#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

echo "Lumina Reading Room quickstart"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js first, then run this script again."
  exit 1
fi

if ! node "$ROOT/scripts/check-env.mjs" --deps-only >/dev/null 2>&1; then
  echo "Installing dependencies..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm install
  elif command -v npx >/dev/null 2>&1; then
    npx --yes pnpm@10.0.0 install
  else
    echo "Dependencies are not installed, and pnpm/corepack/npx was not found."
    echo "Install pnpm, then run: pnpm install"
    exit 1
  fi
fi

if [[ -f "$ENV_FILE" ]] && grep -q '^LUMINA_CONNECTOR_TOKEN=' "$ENV_FILE"; then
  TOKEN="$(grep '^LUMINA_CONNECTOR_TOKEN=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  echo ".env already has a connector token."
else
  TOKEN="$(node "$ROOT/scripts/generate-token.mjs")"
  {
    echo "PORT=8787"
    echo "LUMINA_CONNECTOR_TOKEN=$TOKEN"
    echo "LUMINA_DATA_DIR=.lumina"
  } > "$ENV_FILE"
  echo "Created .env"
fi

node "$ROOT/scripts/check-env.mjs"

echo
echo "Start the web app and server for phone testing:"
echo "  npm run dev:mobile"
echo
echo "Or start only the local server:"
echo "  npm run server:dev"
echo
echo "Health check:"
echo "  http://127.0.0.1:8787/health"
echo
echo "Connector settings:"
echo "  MCP URL: http://127.0.0.1:8787/mcp"
echo "  Authorization: Bearer $TOKEN"
echo
echo "Claude.ai connector URL:"
echo "  http://127.0.0.1:8787/sse?token=$TOKEN"
echo
echo "ChatGPT connector URL:"
echo "  http://127.0.0.1:8787/mcp?token=$TOKEN"
echo
echo "Print copy-ready connector snippets:"
echo "  npm run connector:config"
echo
echo "Keep this token private. It is the key to your reading room."
