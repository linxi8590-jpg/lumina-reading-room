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
echo "Start the local server:"
echo "  node apps/server/src/index.js"
echo
echo "Health check:"
echo "  http://127.0.0.1:8787/health"
echo
echo "Connector settings:"
echo "  Server URL: http://127.0.0.1:8787/mcp"
echo "  Authorization: Bearer $TOKEN"
echo
echo "Keep this token private. It is the key to your reading room."
