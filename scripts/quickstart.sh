#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Lumina Reading Room quickstart"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

TOKEN="$(node "$ROOT/scripts/generate-token.mjs")"

echo "Generated connector token:"
echo "$TOKEN"
echo
echo "Copy this token into your .env file as LUMINA_CONNECTOR_TOKEN."
echo "Do not paste it into public issues, screenshots, or README files."

