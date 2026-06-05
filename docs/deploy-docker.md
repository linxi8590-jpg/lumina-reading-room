# Deploy On A VPS

This is the recommended path for real use.

Lumina is useful when an AI client can reach your reading room through a stable
public HTTPS URL. For that, use a small VPS, a domain, Docker, and Caddy.

## What You Need

- A VPS running Ubuntu or Debian.
- Root SSH access.
- A domain or subdomain, for example `lumina.example.com`.
- A DNS `A` record pointing that domain to the VPS public IP.
- Ports `80` and `443` open on the VPS.

The server does not need to be large for one person. A small instance is enough
for books, notes, and one user's AI connector traffic.

## One-Command Install

SSH into the VPS:

```bash
ssh root@your-server-ip
```

Run the installer. Replace the domain with your real domain:

```bash
curl -fsSL https://raw.githubusercontent.com/linxi8590-jpg/lumina-reading-room/main/scripts/install-vps.sh | bash -s -- --domain lumina.example.com
```

If you are not logged in as `root`, replace `bash` with `sudo bash`.

The installer will:

- Install Docker and Docker Compose.
- Create a 2GB swap file on very small VPS instances if there is no swap yet.
- Clone or update the Lumina repository under `/opt/lumina-reading-room/repo`.
- Generate a connector token if one does not already exist.
- Store books and notes under `/opt/lumina-reading-room/data`.
- Add a small swap file on very low-memory VPS images before building.
- Build and start the Lumina container.
- Start Caddy on ports `80` and `443` for automatic HTTPS.

When it finishes, it prints:

```text
Open the reading room:
  https://lumina.example.com

MCP connector:
  Server URL: https://lumina.example.com/mcp
  Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

Open `https://lumina.example.com` in a phone or desktop browser.

## DNS Check

The installer checks whether your domain resolves. If the domain is not ready,
Caddy cannot issue an HTTPS certificate yet.

Create a DNS record like this:

```text
lumina.example.com  A  your.server.ip.address
```

If you use a CDN or proxy in front of the server, the DNS IP may not match the
VPS IP directly. That can be intentional, but the proxy must still forward
HTTP and HTTPS traffic to this VPS.

## Update Later

Run the same command again:

```bash
curl -fsSL https://raw.githubusercontent.com/linxi8590-jpg/lumina-reading-room/main/scripts/install-vps.sh | bash -s -- --domain lumina.example.com
```

The installer preserves the existing connector token and data directory, then
updates the code and restarts the containers.

## Manual Docker Mode

If you do not want to use the installer:

```bash
git clone https://github.com/linxi8590-jpg/lumina-reading-room.git
cd lumina-reading-room
cp deploy/docker/.env.example deploy/docker/.env
```

Edit `deploy/docker/.env`:

```text
LUMINA_DOMAIN=lumina.example.com
LUMINA_CONNECTOR_TOKEN=lrr_xxxxxxxxxxxxxxxxxxxxx
LUMINA_HOST_DATA_DIR=/opt/lumina-reading-room/data
LUMINA_MAX_JSON_BODY_BYTES=52428800
```

Generate a token if needed:

```bash
node scripts/generate-token.mjs
```

Start:

```bash
cd deploy/docker
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl https://lumina.example.com/health
```

Expected health shape:

```json
{
  "ok": true,
  "service": "lumina-server",
  "storage": "local-json",
  "auth": "configured"
}
```

## What Runs

- `server`: serves the web app, API, and `/mcp` connector on port `8787`.
- `caddy`: terminates HTTPS and reverse-proxies to `server`.

Books, notes, and progress live in the host directory configured by
`LUMINA_HOST_DATA_DIR`.

## Troubleshooting

### The web page does not load

```bash
cd /opt/lumina-reading-room/repo/deploy/docker
docker compose ps
docker compose logs caddy
docker compose logs server
```

Check that the DNS record points to the VPS and that ports `80` and `443` are
open in the cloud firewall.

### HTTPS certificate fails

Common causes:

- DNS does not point to this server.
- Ports `80` or `443` are blocked.
- Another web server is already using those ports.

### AI client says unauthorized

Use the exact connector token from:

```bash
sudo grep '^LUMINA_CONNECTOR_TOKEN=' /opt/lumina-reading-room/repo/deploy/docker/.env
```

Then configure the AI client with either:

```text
Server URL: https://lumina.example.com/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```

or:

```text
https://lumina.example.com/mcp?token=lrr_xxxxxxxxxxxxxxxxxxxxx
```

## Safety Notes

- Do not commit `deploy/docker/.env`.
- Do not publish screenshots that show your connector token.
- Keep token validation enabled for public deployments.
- Rotate the token if it appears in a public issue, README, screenshot, or log.
