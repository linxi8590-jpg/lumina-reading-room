#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8787}"
WEB_PORT="${WEB_PORT:-5173}"

if [[ ! -f "$ROOT/.env" ]] || ! grep -q '^LUMINA_CONNECTOR_TOKEN=' "$ROOT/.env"; then
  bash "$ROOT/scripts/quickstart.sh"
fi

LAN_IP="${LUMINA_LAN_IP:-}"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]] && command -v hostname >/dev/null 2>&1; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi

if [[ -z "$LAN_IP" ]]; then
  echo "Could not detect a LAN IP. Set it manually, for example:"
  echo "  LUMINA_LAN_IP=192.168.1.20 npm run dev:mobile"
  exit 1
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo "Lumina mobile dev"
echo
echo "Open on your phone, on the same Wi-Fi:"
echo "  http://$LAN_IP:$WEB_PORT/"
echo
echo "Connector page should use this Lumina URL:"
echo "  http://$LAN_IP:$PORT"
echo
echo "If your phone cannot open it, check that the Mac firewall allows local network access."
echo

PORT="$PORT" node apps/server/src/index.js &
SERVER_PID="$!"

pnpm --filter @lumina/web dev --host 0.0.0.0 --port "$WEB_PORT" &
WEB_PID="$!"

wait "$SERVER_PID" "$WEB_PID"
