import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(path.join(root, '.env'));

const serverUrl = normalizeServerUrl(readArg('--server-url') || process.env.LUMINA_SERVER_URL || `http://127.0.0.1:${process.env.PORT || 8787}`);
const token = process.env.LUMINA_CONNECTOR_TOKEN || '';

if (!token) {
  console.error('Missing LUMINA_CONNECTOR_TOKEN. Run: bash scripts/quickstart.sh');
  process.exit(1);
}

const mcpUrl = `${serverUrl}/mcp`;
const sseUrl = `${serverUrl}/sse`;
const connectorUrl = `${mcpUrl}?token=${encodeURIComponent(token)}`;
const claudeConnectorUrl = `${sseUrl}?token=${encodeURIComponent(token)}`;
const authorization = `Bearer ${token}`;

const openAiTool = {
  type: 'mcp',
  server_label: 'lumina',
  server_description: 'Lumina Reading Room exposes only your unlocked reading context and reading notes.',
  server_url: mcpUrl,
  authorization: token,
  require_approval: 'always',
};

const anthropicMessagesApi = {
  mcp_servers: [
    {
      type: 'url',
      url: mcpUrl,
      name: 'lumina',
      authorization_token: token,
    },
  ],
  tools: [
    {
      type: 'mcp_toolset',
      mcp_server_name: 'lumina',
      default_config: {
        enabled: true,
        defer_loading: false,
      },
    },
  ],
};

const mcpJson = {
  mcpServers: {
    lumina: {
      type: 'http',
      url: mcpUrl,
      headers: {
        Authorization: authorization,
      },
    },
  },
};

const codexToml = `[mcp_servers.lumina]
url = "${mcpUrl}"
http_headers = { Authorization = "${authorization}" }`;

console.log('Lumina connector config');
console.log('');
console.log('Claude.ai connector URL');
console.log(claudeConnectorUrl);
console.log('');
console.log('ChatGPT web connector URL');
console.log(connectorUrl);
console.log('');
console.log('MCP URL');
console.log(mcpUrl);
console.log('');
console.log('Authorization header');
console.log(`Authorization: ${authorization}`);
console.log('');
console.log('OpenAI Responses API tool JSON');
console.log(JSON.stringify(openAiTool, null, 2));
console.log('');
console.log('Anthropic Messages API MCP JSON');
console.log(JSON.stringify(anthropicMessagesApi, null, 2));
console.log('');
console.log('Claude Code / SDK .mcp.json');
console.log(JSON.stringify(mcpJson, null, 2));
console.log('');
console.log('Codex config.toml');
console.log(codexToml);
console.log('');
console.log('Claude Code command');
console.log(`claude mcp add --transport http lumina ${mcpUrl} --header "Authorization: ${authorization}"`);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return '';
  return process.argv[index + 1] || '';
}

function normalizeServerUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = stripEnvQuotes(rawValue.trim());
  }
}

function stripEnvQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
