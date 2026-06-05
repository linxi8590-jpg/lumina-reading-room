#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/linxi8590-jpg/lumina-reading-room.git"
BRANCH="main"
INSTALL_DIR="/opt/lumina-reading-room"
DOMAIN=""
YES=0
STRICT_DNS=0

usage() {
  echo "Usage: bash scripts/install-vps.sh --domain lumina.example.com [--yes]"
  echo
  echo "Options:"
  echo "  --domain DOMAIN       Domain or subdomain that points to this server"
  echo "  --install-dir DIR     Install directory, default: /opt/lumina-reading-room"
  echo "  --branch BRANCH       Git branch, default: main"
  echo "  --repo-url URL        Git repository URL"
  echo "  --strict-dns          Fail when DNS does not point to this server IP"
  echo "  --yes                 Do not ask confirmation on DNS warnings"
  echo "  -h, --help            Show this help"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

warn() {
  echo "Warning: $*" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      [[ -n "${2:-}" ]] || die "--domain requires a value."
      DOMAIN="${2:-}"
      shift 2
      ;;
    --install-dir)
      [[ -n "${2:-}" ]] || die "--install-dir requires a value."
      INSTALL_DIR="${2:-}"
      shift 2
      ;;
    --branch)
      [[ -n "${2:-}" ]] || die "--branch requires a value."
      BRANCH="${2:-}"
      shift 2
      ;;
    --repo-url)
      [[ -n "${2:-}" ]] || die "--repo-url requires a value."
      REPO_URL="${2:-}"
      shift 2
      ;;
    --strict-dns)
      STRICT_DNS=1
      shift
      ;;
    --yes|-y)
      YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "Run this script as root on the VPS, for example: ssh root@your-server"
  fi
}

normalize_domain() {
  local value="$1"
  value="${value#http://}"
  value="${value#https://}"
  value="${value%%/*}"
  value="${value%.}"
  echo "$value"
}

prompt_domain() {
  if [[ -n "$DOMAIN" ]]; then return; fi
  if [[ ! -t 0 ]]; then
    die "Pass --domain when using the curl installer, for example: bash -s -- --domain lumina.example.com"
  fi
  read -r -p "Domain or subdomain for Lumina, for example lumina.example.com: " DOMAIN
}

validate_domain() {
  DOMAIN="$(normalize_domain "$DOMAIN")"
  [[ -n "$DOMAIN" ]] || die "Domain is required."
  [[ "$DOMAIN" != "localhost" ]] || die "Use a real domain, not localhost."
  if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
    die "Use a domain or subdomain. Public HTTPS certificates do not work with a bare IP here."
  fi
  if [[ "$DOMAIN" == *":"* || "$DOMAIN" == *"/"* || "$DOMAIN" == *" "* ]]; then
    die "Invalid domain: $DOMAIN"
  fi
}

confirm_continue() {
  local question="$1"
  if [[ "$YES" -eq 1 ]]; then return 0; fi
  if [[ ! -t 0 ]]; then
    warn "No interactive stdin available; continuing. Use --strict-dns if you want DNS warnings to fail."
    return 0
  fi
  read -r -p "$question [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" || "$answer" == "yes" || "$answer" == "YES" ]]
}

install_packages() {
  if ! command -v apt-get >/dev/null 2>&1; then
    die "This installer currently supports Ubuntu/Debian VPS images with apt-get."
  fi

  export DEBIAN_FRONTEND=noninteractive
  echo "Installing required apt packages..."
  apt-get update </dev/null
  apt-get install -y ca-certificates curl git openssl docker.io util-linux </dev/null

  if ! docker compose version </dev/null >/dev/null 2>&1; then
    if apt-cache show docker-compose-plugin </dev/null >/dev/null 2>&1; then
      echo "Installing Docker Compose plugin..."
      apt-get install -y docker-compose-plugin </dev/null
    else
      echo "docker-compose-plugin is not available in this apt repo; installing docker-compose fallback."
      apt-get install -y docker-compose </dev/null
    fi
  fi

  echo "Starting Docker service..."
  if command -v systemctl >/dev/null 2>&1; then
    if ! systemctl enable --now docker </dev/null; then
      warn "systemctl could not start Docker; trying service docker start."
      if command -v service >/dev/null 2>&1; then
        service docker start </dev/null || true
      fi
    fi
  elif command -v service >/dev/null 2>&1; then
    service docker start </dev/null || true
  fi

  if ! docker info </dev/null >/dev/null 2>&1; then
    die "Docker daemon is not running. Try: systemctl start docker"
  fi
}

ensure_swap_for_small_vps() {
  local mem_mb
  mem_mb="$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "$mem_mb" -ge 1800 ]]; then
    return
  fi
  if swapon --show 2>/dev/null | grep -q .; then
    return
  fi

  echo "Small VPS detected (${mem_mb}MB RAM). Trying to create 2GB swap for Docker builds."

  if [[ -e /swapfile ]]; then
    if swapon --show=NAME --noheadings 2>/dev/null | awk '{print $1}' | grep -qx '/swapfile'; then
      echo "  /swapfile is already enabled, skipping."
      return
    fi
    if ! rm -f /swapfile; then
      warn "Cannot remove existing /swapfile; continuing without adding swap."
      return 0
    fi
  fi

  local created=0
  if command -v fallocate >/dev/null 2>&1; then
    echo "  [1/4] allocating /swapfile (fallocate -l 2G)..."
    if fallocate -l 2G /swapfile 2>/dev/null; then
      created=1
    else
      warn "fallocate failed; falling back to dd."
    fi
  fi
  if [[ "$created" -eq 0 ]]; then
    echo "  [1/4] allocating /swapfile (dd 2048 MB, may take 30-60s)..."
    if ! dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; then
      warn "Could not create /swapfile; continuing without swap. Docker build may need a larger VPS."
      rm -f /swapfile 2>/dev/null || true
      return 0
    fi
  fi

  echo "  [2/4] chmod 600 /swapfile"
  if ! chmod 600 /swapfile; then
    warn "Could not set permissions on /swapfile; continuing without swap."
    rm -f /swapfile 2>/dev/null || true
    return 0
  fi
  echo "  [3/4] mkswap /swapfile"
  if ! mkswap /swapfile >/dev/null 2>&1; then
    warn "mkswap failed; continuing without swap. Docker build may need a larger VPS."
    rm -f /swapfile 2>/dev/null || true
    return 0
  fi
  echo "  [4/4] swapon /swapfile"
  if ! swapon /swapfile; then
    warn "swapon failed; continuing without swap. Docker build may need a larger VPS."
    rm -f /swapfile 2>/dev/null || true
    return 0
  fi
  if ! grep -q '^/swapfile ' /etc/fstab 2>/dev/null; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  echo "  Swap ready ($(free -h | awk '/Swap:/ {print $2}'))."
}

compose_cmd() {
  if docker compose version </dev/null >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    die "Docker Compose is not installed."
  fi
}

check_dns() {
  local server_ip dns_ips
  server_ip="$(curl -4fsS --max-time 8 https://api.ipify.org 2>/dev/null || true)"
  dns_ips="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"

  if [[ -z "$dns_ips" ]]; then
    echo "DNS warning: $DOMAIN does not resolve yet."
    [[ "$STRICT_DNS" -eq 0 ]] || die "DNS is not ready."
    confirm_continue "Continue anyway? Caddy will get HTTPS only after DNS is ready." || exit 1
    return
  fi

  echo "DNS for $DOMAIN resolves to: $dns_ips"
  if [[ -n "$server_ip" ]]; then
    echo "This server public IPv4 appears to be: $server_ip"
    if [[ " $dns_ips " != *" $server_ip "* ]]; then
      echo "DNS warning: $DOMAIN does not appear to point directly to this server IP."
      echo "If you use a CDN/proxy, this can be intentional. Otherwise fix the A record first."
      [[ "$STRICT_DNS" -eq 0 ]] || die "DNS does not point to this server."
      confirm_continue "Continue anyway?" || exit 1
    fi
  fi
}

sync_repo() {
  local repo_dir="$INSTALL_DIR/repo"
  mkdir -p "$INSTALL_DIR"

  if [[ -d "$repo_dir/.git" ]]; then
    git -C "$repo_dir" fetch --prune origin "$BRANCH"
    git -C "$repo_dir" checkout "$BRANCH"
    git -C "$repo_dir" reset --hard "origin/$BRANCH"
  else
    git clone --branch "$BRANCH" "$REPO_URL" "$repo_dir"
  fi
}

write_env() {
  local repo_dir="$INSTALL_DIR/repo"
  local env_file="$repo_dir/deploy/docker/.env"
  local data_dir="$INSTALL_DIR/data"
  local token=""

  if [[ -f "$env_file" ]]; then
    token="$(grep '^LUMINA_CONNECTOR_TOKEN=' "$env_file" | tail -n 1 | cut -d= -f2- || true)"
  fi
  if [[ -z "$token" ]]; then
    token="lrr_$(openssl rand -hex 24)"
  fi

  mkdir -p "$data_dir"
  chown 10001:10001 "$data_dir"
  chmod 700 "$data_dir"

  {
    echo "LUMINA_DOMAIN=$DOMAIN"
    echo "LUMINA_CONNECTOR_TOKEN=$token"
    echo "LUMINA_HOST_DATA_DIR=$data_dir"
    echo "LUMINA_MAX_JSON_BODY_BYTES=52428800"
  } > "$env_file"
  chmod 600 "$env_file"
}

start_lumina() {
  local repo_dir="$INSTALL_DIR/repo"
  local compose
  compose="$(compose_cmd)"
  cd "$repo_dir/deploy/docker"
  $compose up -d --build
}

wait_for_health() {
  local attempt
  for attempt in {1..30}; do
    if curl -fsS --max-time 3 http://127.0.0.1:8787/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

print_summary() {
  local env_file="$INSTALL_DIR/repo/deploy/docker/.env"
  local token
  token="$(grep '^LUMINA_CONNECTOR_TOKEN=' "$env_file" | tail -n 1 | cut -d= -f2-)"

  echo
  echo "Lumina is installed."
  echo
  echo "Open the reading room:"
  echo "  https://$DOMAIN"
  echo
  echo "MCP connector:"
  echo "  Server URL: https://$DOMAIN/mcp"
  echo "  Authorization: Bearer $token"
  echo
  echo "If a client only accepts one URL:"
  echo "  https://$DOMAIN/mcp?token=$token"
  echo
  echo "Books and notes are stored in:"
  echo "  $INSTALL_DIR/data"
}

main() {
  require_root
  prompt_domain
  validate_domain

  echo "Installing Lumina for domain: $DOMAIN"
  echo "Install directory: $INSTALL_DIR"
  echo

  install_packages
  ensure_swap_for_small_vps
  check_dns
  sync_repo
  write_env
  start_lumina

  if ! wait_for_health; then
    echo "Lumina containers started, but local health check did not become ready."
    echo "Run: cd $INSTALL_DIR/repo/deploy/docker && docker compose logs"
    exit 1
  fi

  print_summary
}

main "$@"
