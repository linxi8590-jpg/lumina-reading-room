import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

await loadDotEnv();

const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(rootDir, process.env.LUMINA_DATA_DIR || '.lumina');
const dataFile = path.join(dataDir, 'data.json');
const webDistDir = path.resolve(rootDir, process.env.LUMINA_WEB_DIST || 'apps/web/dist');
const connectorToken = process.env.LUMINA_CONNECTOR_TOKEN || '';
const maxJsonBodyBytes = Number(process.env.LUMINA_MAX_JSON_BODY_BYTES || 50 * 1024 * 1024);

const mcpProtocolVersion = '2024-11-05';
const mcpSseSessions = new Map();
const noteTypes = new Set(['reflection', 'highlight', 'quote', 'question', 'review_card']);
const authorTypes = new Set(['user', 'ai']);
const readOnlyToolAnnotations = { readOnlyHint: true };
const writeToolAnnotations = { readOnlyHint: false, openWorldHint: false, destructiveHint: false };
const mcpTools = [
  {
    name: 'get_current_reading_state',
    description: 'Get the current book, reading position, and unlocked reading position.',
    annotations: readOnlyToolAnnotations,
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' }
      }
    }
  },
  {
    name: 'get_current_passage',
    description: 'Read the paragraph the reader is currently on.',
    annotations: readOnlyToolAnnotations,
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' }
      }
    }
  },
  {
    name: 'get_unlocked_context',
    description: 'Read only the part of the book that the reader has already unlocked.',
    annotations: readOnlyToolAnnotations,
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' },
        limit: { type: 'number', description: 'Maximum characters to return.', default: 12000 }
      }
    }
  },
  {
    name: 'get_reading_notes',
    description: 'List notes that are not beyond the reader unlocked position.',
    annotations: readOnlyToolAnnotations,
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' },
        section_id: { type: 'string', description: 'Optional section id to filter notes.' }
      }
    }
  },
  {
    name: 'save_ai_note',
    description: 'Save an AI note at or before the reader unlocked position.',
    annotations: writeToolAnnotations,
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' },
        section_id: { type: 'string', description: 'Optional section id.' },
        section_index: { type: 'number', description: 'Optional section number, starting at 0.' },
        paragraph_index: { type: 'number', description: 'Optional paragraph number, starting at 0.' },
        note_type: {
          type: 'string',
          enum: [...noteTypes],
          description: 'Kind of note to save.'
        },
        content: { type: 'string', description: 'Note text.' },
        model_name: { type: 'string', description: 'Optional AI model name.' }
      },
      required: ['content']
    }
  },
  {
    name: 'advance_reading_progress',
    description: 'Move the reader position and unlock text up to that point.',
    annotations: { ...writeToolAnnotations, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        book_id: { type: 'string', description: 'Optional book id. If omitted, Lumina uses the current book.' },
        section_index: { type: 'number', description: 'Section number, starting at 0.' },
        paragraph_index: { type: 'number', description: 'Paragraph number, starting at 0.' }
      },
      required: ['section_index', 'paragraph_index']
    }
  }
];
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false
});

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'lumina-server',
        storage: 'local-json',
        auth: connectorToken ? 'configured' : 'missing_token'
      });
      return;
    }

    if (url.pathname.startsWith('/api/') || isConnectorPath(url.pathname)) {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: 'unauthorized' });
        return;
      }
    }

    if (url.pathname === '/mcp') {
      await handleMcp(req, res);
      return;
    }

    if (url.pathname === '/sse') {
      await handleMcpSse(req, res, url);
      return;
    }

    if (url.pathname === '/message' || url.pathname === '/messages') {
      await handleMcpSseMessage(req, res, url);
      return;
    }

    if (await serveStaticWeb(req, res, url)) {
      return;
    }

    await handleApi(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: 'server_error', message: error.message });
  }
});

server.listen(port, () => {
  console.log(`Lumina server listening on http://127.0.0.1:${port}`);
});

async function loadDotEnv() {
  const envPaths = [
    process.env.LUMINA_ENV_FILE,
    path.join(rootDir, '.env'),
    path.join(process.cwd(), '.env')
  ].filter(Boolean);

  for (const envPath of envPaths) {
    try {
      const raw = await fs.readFile(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;
        const [, key, value] = match;
        if (process.env[key] === undefined) {
          process.env[key] = stripEnvQuotes(value.trim());
        }
      }
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function stripEnvQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(body, null, 2));
}

function isConnectorPath(pathname) {
  return pathname === '/mcp' ||
    pathname === '/sse' ||
    pathname === '/message' ||
    pathname === '/messages';
}

async function serveStaticWeb(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method || '')) return false;

  const pathname = safeDecodePath(url.pathname);
  if (!pathname) {
    sendJson(res, 400, { error: 'bad_path' });
    return true;
  }
  if (pathname.startsWith('/api/') || isConnectorPath(pathname) || pathname === '/health') return false;

  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.resolve(webDistDir, `.${cleanPath}`);
  if (!isPathInside(filePath, webDistDir)) {
    sendJson(res, 403, { error: 'forbidden' });
    return true;
  }

  let stat = await statFile(filePath);
  if (!stat || stat.isDirectory()) {
    if (path.extname(cleanPath)) return false;
    filePath = path.join(webDistDir, 'index.html');
    stat = await statFile(filePath);
  }

  if (!stat || !stat.isFile()) return false;

  res.writeHead(200, {
    'content-type': contentTypeFor(filePath),
    'content-length': stat.size,
    'cache-control': filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable'
  });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  res.end(await fs.readFile(filePath));
  return true;
}

function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

async function statFile(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function isPathInside(filePath, parentDir) {
  const relative = path.relative(parentDir, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[ext] || 'application/octet-stream';
}

function isAuthorized(req) {
  if (!connectorToken) return false;
  if (req.headers.authorization === `Bearer ${connectorToken}`) return true;

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return url.searchParams.get('token') === connectorToken;
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > maxJsonBodyBytes) {
      throw new Error('request_body_too_large');
    }
  }
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      version: 1,
      books: [],
      sections: [],
      reading_states: [],
      reading_notes: []
    };
  }
}

async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

function deleteBook(store, bookId) {
  store.books = store.books.filter((book) => book.id !== bookId);
  store.sections = store.sections.filter((section) => section.book_id !== bookId);
  store.reading_notes = store.reading_notes.filter((note) => note.book_id !== bookId);
  store.reading_states = store.reading_states.filter((state) => state.book_id !== bookId);
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/api/books') {
    const store = await readStore();
    const books = store.books.map((book) => {
      const state = store.reading_states.find((s) => s.book_id === book.id) || null;
      const sections = store.sections
        .filter((s) => s.book_id === book.id)
        .sort((a, b) => a.section_index - b.section_index);
      const totalParagraphs = sections.reduce((sum, s) => sum + s.paragraphs.length, 0);
      const totalSections = sections.length;
      let readParagraphs = 0;
      if (state) {
        for (const s of sections) {
          if (s.section_index < state.current_section_index) readParagraphs += s.paragraphs.length;
          else if (s.section_index === state.current_section_index)
            readParagraphs += Math.min(state.current_paragraph_index + 1, s.paragraphs.length);
        }
      }
      const currentSection = sections[state?.current_section_index ?? 0] || null;
      return {
        ...book,
        progress: {
          total_sections: totalSections,
          total_paragraphs: totalParagraphs,
          read_paragraphs: readParagraphs,
          current_section_index: state?.current_section_index ?? 0,
          current_paragraph_index: state?.current_paragraph_index ?? 0,
          current_section_title: currentSection?.title ?? null,
        },
      };
    });
    sendJson(res, 200, { books });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/books/import') {
    const body = await readJsonBody(req);
    const store = await readStore();
    const importBody = await normalizeImportBody(body);
    const result = importBook(store, importBody);
    await writeStore(store);
    sendJson(res, 201, result);
    return;
  }

  if (parts.length >= 3 && parts[0] === 'api' && parts[1] === 'books') {
    const bookId = parts[2];
    const action = parts[3];
    const store = await readStore();

    if (!findBook(store, bookId)) {
      sendJson(res, 404, { error: 'book_not_found' });
      return;
    }

    if (req.method === 'GET' && parts.length === 3) {
      sendJson(res, 200, getBookPayload(store, bookId));
      return;
    }

    if (req.method === 'DELETE' && parts.length === 3) {
      deleteBook(store, bookId);
      await writeStore(store);
      sendJson(res, 200, { deleted: bookId });
      return;
    }

    if (req.method === 'GET' && action === 'state') {
      sendJson(res, 200, { state: getReadingState(store, bookId) });
      return;
    }

    if (req.method === 'POST' && action === 'progress') {
      const body = await readJsonBody(req);
      const state = advanceReadingProgress(store, bookId, body.section_index, body.paragraph_index);
      await writeStore(store);
      sendJson(res, 200, { state });
      return;
    }

    if (req.method === 'GET' && action === 'current-passage') {
      sendJson(res, 200, { passage: getCurrentPassage(store, bookId) });
      return;
    }

    if (req.method === 'GET' && action === 'unlocked-context') {
      const limit = Number(url.searchParams.get('limit') || 12000);
      sendJson(res, 200, { context: getUnlockedContext(store, bookId, limit) });
      return;
    }

    if (req.method === 'GET' && action === 'notes') {
      sendJson(res, 200, { notes: getReadingNotes(store, bookId, url.searchParams.get('section_id')) });
      return;
    }

    if (req.method === 'POST' && action === 'notes') {
      const body = await readJsonBody(req);
      const note = saveReadingNote(store, bookId, body);
      await writeStore(store);
      sendJson(res, 201, { note });
      return;
    }
  }

  sendJson(res, 404, { error: 'not_found' });
}

async function handleMcp(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, {
      tools: mcpTools.map((tool) => tool.name)
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const tool = body.tool || body.name;
  const args = body.arguments || body.args || {};
  const { result } = await callLuminaTool(tool, args);

  sendJson(res, 200, { tool, result });
}

async function handleMcpSse(req, res, url) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const sessionId = crypto.randomUUID();
  const token = url.searchParams.get('token') || '';
  const endpointPath = `/message?sessionId=${encodeURIComponent(sessionId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  const messageEndpoint = publicUrlFor(req, endpointPath);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 25000);
  keepAlive.unref?.();

  mcpSseSessions.set(sessionId, { res, keepAlive, created_at: Date.now() });
  req.on('close', () => {
    const session = mcpSseSessions.get(sessionId);
    if (session) clearInterval(session.keepAlive);
    mcpSseSessions.delete(sessionId);
  });

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  res.flushHeaders?.();
  res.write(': connected\n\n');
  writeSseEvent(res, 'endpoint', messageEndpoint);
}

async function handleMcpSseMessage(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const sessionId = url.searchParams.get('sessionId');
  const session = sessionId ? mcpSseSessions.get(sessionId) : null;
  if (!session || session.res.writableEnded) {
    sendJson(res, 404, { error: 'sse_session_not_found' });
    return;
  }

  const body = await readJsonBody(req);
  const messages = Array.isArray(body) ? body : [body];
  let sent = 0;
  for (const message of messages) {
    const response = await handleMcpJsonRpc(message);
    if (response) {
      writeSseEvent(session.res, 'message', response);
      sent += 1;
    }
  }
  sendJson(res, 202, { accepted: true, sent });
}

async function handleMcpJsonRpc(message) {
  const id = message?.id;
  if (!message || typeof message.method !== 'string') {
    return id === undefined ? null : jsonRpcError(id, -32600, 'Invalid Request');
  }

  try {
    switch (message.method) {
      case 'initialize':
        return jsonRpcResult(id, {
          protocolVersion: mcpProtocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'Lumina Reading Room', version: '0.1.0' }
        });
      case 'notifications/initialized':
        return null;
      case 'ping':
        return jsonRpcResult(id, {});
      case 'tools/list':
        return jsonRpcResult(id, { tools: mcpTools });
      case 'tools/call': {
        const params = message.params || {};
        const toolName = params.name;
        const toolArgs = params.arguments || {};
        // Verbose debug logging — temporary, to diagnose why ChatGPT's MCP
        // connector breaks specifically on save_ai_note while Claude.ai is fine.
        // Logs the request id, tool name, argument keys (not values, to avoid
        // dumping note text into journalctl), and full error stacks on failure.
        const argKeys = Object.keys(toolArgs).join(',') || '(none)';
        console.log(`[mcp tools/call] id=${id} tool=${toolName} arg_keys=${argKeys}`);
        try {
          const toolResult = await callLuminaTool(toolName, toolArgs);
          const response = jsonRpcResult(id, formatToolResultForMcp(toolResult));
          console.log(
            `[mcp tools/call] id=${id} tool=${toolName} ok response_keys=${Object.keys(response.result || {}).join(',')}`
          );
          return response;
        } catch (error) {
          console.error(
            `[mcp tools/call] id=${id} tool=${toolName} FAILED: ${error.message}\n${error.stack || '(no stack)'}`
          );
          return jsonRpcResult(id, {
            content: [{ type: 'text', text: `Lumina error: ${error.message}` }],
            isError: true
          });
        }
      }
      default:
        return jsonRpcError(id, -32601, `Method not found: ${message.method}`);
    }
  } catch (error) {
    return jsonRpcError(id, -32603, error.message);
  }
}

async function callLuminaTool(tool, args = {}) {
  if (!mcpTools.some((item) => item.name === tool)) {
    const error = new Error('unknown_tool');
    error.tool = tool;
    throw error;
  }

  const store = await readStore();
  let result;
  let didWrite = false;

  switch (tool) {
    case 'get_current_reading_state':
      result = getReadingState(store, args.book_id || inferBookId(store));
      break;
    case 'get_current_passage':
      result = getCurrentPassage(store, args.book_id || inferBookId(store));
      break;
    case 'get_unlocked_context':
      result = getUnlockedContext(store, args.book_id || inferBookId(store), Number(args.limit || 12000));
      break;
    case 'get_reading_notes':
      result = getReadingNotes(store, args.book_id || inferBookId(store), args.section_id);
      break;
    case 'save_ai_note':
      result = saveReadingNote(store, args.book_id || inferBookId(store), {
        ...args,
        author_type: 'ai'
      });
      didWrite = true;
      break;
    case 'advance_reading_progress':
      result = advanceReadingProgress(
        store,
        args.book_id || inferBookId(store),
        args.section_index,
        args.paragraph_index
      );
      didWrite = true;
      break;
    default:
      throw new Error('unknown_tool');
  }

  if (didWrite) await writeStore(store);
  return { tool, result };
}

function formatToolResultForMcp(result) {
  if (result?.tool === 'save_ai_note') {
    const noteId = result.result?.id;
    return {
      content: [{ type: 'text', text: noteId ? `Note saved. note_id=${noteId}` : 'Note saved.' }]
    };
  }

  const structuredContent = typeof result === 'object' && result !== null ? result : { tool: 'unknown', result };
  return {
    structuredContent,
    content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }]
  };
}

function jsonRpcResult(id, result) {
  if (id === undefined) return null;
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  if (id === undefined) return null;
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message }
  };
}

function writeSseEvent(res, event, data) {
  if (res.writableEnded) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);
  for (const line of payload.split(/\r?\n/)) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
}

function publicUrlFor(req, pathname) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `127.0.0.1:${port}`);
  const localHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host);
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : (localHost ? 'http' : 'https'));
  return `${proto}://${host}${pathname}`;
}

async function normalizeImportBody(body) {
  const format = String(body.format || '').toLowerCase();
  const sourceFilename = body.source_filename || body.filename || null;
  const looksLikeEpub = format === 'epub' ||
    /\.epub$/i.test(sourceFilename || '') ||
    body.media_type === 'application/epub+zip';

  if (!looksLikeEpub) return body;

  const parsed = await parseEpubBody(body);
  return {
    ...body,
    title: body.title || parsed.title || titleFromFilename(sourceFilename) || 'Untitled EPUB',
    author: body.author || parsed.author || null,
    text: parsed.text,
    source_filename: sourceFilename
  };
}

async function parseEpubBody(body) {
  const encoded = body.file_base64 || body.epub_base64;
  if (typeof encoded !== 'string' || encoded.trim().length === 0) {
    throw new Error('epub_base64_is_required');
  }

  const base64 = encoded.replace(/^data:[^,]+,/, '');
  const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
  const containerXml = await readZipText(zip, 'META-INF/container.xml');
  const container = xmlParser.parse(containerXml);
  const rootfile = firstItem(
    container?.container?.rootfiles?.rootfile
  );
  const opfPath = rootfile?.['@_full-path'];
  if (!opfPath) throw new Error('epub_missing_opf_path');

  const opfXml = await readZipText(zip, opfPath);
  const opf = xmlParser.parse(opfXml);
  const pkg = opf.package || opf['opf:package'];
  if (!pkg) throw new Error('epub_invalid_opf');

  const metadata = pkg.metadata || {};
  const manifestItems = toArray(pkg.manifest?.item);
  const spineItems = toArray(pkg.spine?.itemref);
  const manifestById = new Map(
    manifestItems
      .filter((item) => item?.['@_id'] && item?.['@_href'])
      .map((item) => [item['@_id'], item])
  );

  const baseDir = path.posix.dirname(opfPath);
  const blocks = [];
  let chapterCounter = 0;
  for (const itemref of spineItems) {
    const idref = itemref?.['@_idref'];
    const item = manifestById.get(idref);
    if (!item || !isReadableHtmlItem(item)) continue;
    const htmlPath = resolveZipPath(baseDir, item['@_href']);
    const html = await readZipText(zip, htmlPath);
    const itemBlocks = extractXhtmlBlocks(html);
    if (itemBlocks.length === 0) continue;
    chapterCounter += 1;
    // Use EPUB spine structure as chapter boundary: each spine item is a chapter.
    // If the item already starts with its own heading (h1/h2/h3 → markdown "# "),
    // skip the injected one to avoid duplicate titles.
    if (!/^#{1,3}\s/.test(itemBlocks[0])) {
      blocks.push(`# Chapter ${chapterCounter}`);
    }
    blocks.push(...itemBlocks);
  }

  const text = blocks.join('\n\n').trim();
  if (!text) throw new Error('epub_has_no_readable_text');

  return {
    title: firstText(metadata['dc:title'] || metadata.title),
    author: firstText(metadata['dc:creator'] || metadata.creator),
    text
  };
}

async function readZipText(zip, filename) {
  const file = zip.file(filename);
  if (!file) throw new Error(`epub_missing_file:${filename}`);
  return file.async('text');
}

function isReadableHtmlItem(item) {
  const mediaType = item['@_media-type'] || '';
  const href = item['@_href'] || '';
  return mediaType === 'application/xhtml+xml' ||
    mediaType === 'text/html' ||
    /\.x?html?$/i.test(href);
}

function resolveZipPath(baseDir, href) {
  const cleanHref = decodeURIComponent(String(href).split('#')[0]);
  const joined = baseDir === '.'
    ? cleanHref
    : path.posix.join(baseDir, cleanHref);
  return path.posix.normalize(joined).replace(/^(\.\.\/)+/, '');
}

function extractXhtmlBlocks(html) {
  const parsed = xmlParser.parse(html);
  const body = findXmlNode(parsed, 'body') || parsed;
  const blocks = [];
  collectXhtmlBlocks(body, blocks);
  if (blocks.length > 0) return blocks;
  const fallback = collectText(body);
  return fallback ? [fallback] : [];
}

function collectXhtmlBlocks(node, blocks, key = '') {
  if (Array.isArray(node)) {
    for (const item of node) collectXhtmlBlocks(item, blocks, key);
    return;
  }

  const localName = localXmlName(key);
  if (isHeadingTag(localName)) {
    const text = collectText(node);
    if (text) blocks.push(`${'#'.repeat(Number(localName.slice(1)))} ${text}`);
    return;
  }
  if (['p', 'li', 'blockquote'].includes(localName)) {
    const text = collectText(node);
    if (text) blocks.push(text);
    return;
  }

  if (!node || typeof node !== 'object') return;
  for (const [childKey, value] of Object.entries(node)) {
    if (childKey.startsWith('@_') || childKey === '#text') continue;
    collectXhtmlBlocks(value, blocks, childKey);
  }
}

function findXmlNode(node, wantedLocalName) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findXmlNode(item, wantedLocalName);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  for (const [key, value] of Object.entries(node)) {
    if (localXmlName(key) === wantedLocalName) return value;
    const found = findXmlNode(value, wantedLocalName);
    if (found) return found;
  }
  return null;
}

function collectText(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(node)) {
    return node.map(collectText).filter(Boolean).join(' ').trim();
  }
  if (!node || typeof node !== 'object') return '';
  return Object.entries(node)
    .filter(([key]) => !key.startsWith('@_'))
    .map(([, value]) => collectText(value))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(value) {
  const item = firstItem(value);
  if (!item) return null;
  const text = collectText(item);
  return text || null;
}

function firstItem(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function localXmlName(name) {
  return String(name || '').split(':').pop().toLowerCase();
}

function isHeadingTag(name) {
  return /^h[1-6]$/.test(name);
}

function titleFromFilename(filename) {
  if (!filename) return null;
  return path.basename(filename).replace(/\.(epub|txt|md|markdown)$/i, '');
}

function importBook(store, body) {
  const title = requireString(body.title, 'title');
  const text = requireString(body.text, 'text');
  const author = body.author || null;
  const sourceFilename = body.source_filename || null;
  const sourceKey = makeBookSourceKey(body, title, author, sourceFilename);
  const contentHash = sha256Hex(normalizeStableText(text));
  const now = new Date().toISOString();
  const splitSections = splitIntoSections(text);

  if (splitSections.length === 0) {
    throw new Error('book_has_no_readable_text');
  }

  let book = findImportTargetBook(store, body.id, sourceKey, title, author, sourceFilename);
  const imported = book ? 'updated' : 'created';
  if (!book) {
    book = {
      id: stableUuid('book', sourceKey),
      created_at: now
    };
    store.books.push(book);
  }

  Object.assign(book, {
    title,
    author,
    source_filename: sourceFilename,
    source_key: sourceKey,
    content_hash: contentHash,
    updated_at: now
  });

  const oldSections = getSections(store, book.id);
  const oldSectionsById = new Map(oldSections.map((section) => [section.id, section]));
  const sections = buildStableSections(book.id, splitSections, oldSectionsById, now);
  remapNotesForReimport(store, book.id, oldSections, sections);
  store.sections = store.sections.filter((section) => section.book_id !== book.id);
  store.sections.push(...sections);

  let state = store.reading_states.find((item) => item.book_id === book.id);
  if (!state) {
    state = {
      id: crypto.randomUUID(),
      book_id: book.id,
      current_section_index: 0,
      current_paragraph_index: 0,
      unlocked_section_index: 0,
      unlocked_paragraph_index: 0,
      updated_at: now
    };
    store.reading_states.push(state);
  } else {
    clampReadingStateToSections(state, sections);
    state.updated_at = now;
  }

  return { book, sections_count: sections.length, imported };
}

function findImportTargetBook(store, explicitId, sourceKey, title, author, sourceFilename) {
  if (explicitId) {
    const explicit = findBook(store, explicitId);
    if (explicit) return explicit;
  }
  const bySourceKey = store.books.find((book) => book.source_key === sourceKey);
  if (bySourceKey) return bySourceKey;
  if (sourceFilename) {
    const byFilename = store.books.find((book) =>
      book.source_filename === sourceFilename &&
      normalizeStableText(book.title) === normalizeStableText(title) &&
      normalizeStableText(book.author || '') === normalizeStableText(author || '')
    );
    if (byFilename) return byFilename;
  }
  return null;
}

function buildStableSections(bookId, splitSections, oldSectionsById, now) {
  const titleOccurrences = new Map();
  return splitSections.map((section, index) => {
    const titleKey = normalizeStableText(section.title || `Section ${index + 1}`);
    const occurrence = titleOccurrences.get(titleKey) || 0;
    titleOccurrences.set(titleKey, occurrence + 1);
    const stableKey = `${titleKey}#${occurrence}`;
    const id = stableUuid('section', `${bookId}\0${stableKey}`);
    const previous = oldSectionsById.get(id);

    return {
      id,
      stable_key: stableKey,
      book_id: bookId,
      section_index: index,
      title: section.title,
      text: section.paragraphs.join('\n\n'),
      paragraphs: section.paragraphs,
      paragraph_keys: section.paragraphs.map((_, paragraphIndex) =>
        stableUuid('paragraph', `${id}\0${paragraphIndex}`)
      ),
      created_at: previous?.created_at || now,
      updated_at: now
    };
  });
}

function remapNotesForReimport(store, bookId, oldSections, newSections) {
  if (oldSections.length === 0) return;
  const oldById = new Map(oldSections.map((section) => [section.id, section]));
  for (const note of store.reading_notes) {
    if (note.book_id !== bookId || !note.section_id) continue;
    if (newSections.some((section) => section.id === note.section_id)) continue;
    const oldSection = oldById.get(note.section_id);
    if (!oldSection) continue;
    const replacement = newSections.find((section) =>
      section.section_index === oldSection.section_index &&
      normalizeStableText(section.title) === normalizeStableText(oldSection.title)
    );
    if (replacement) {
      note.section_id = replacement.id;
      if (note.paragraph_index !== null && note.paragraph_index !== undefined) {
        note.paragraph_key = replacement.paragraph_keys?.[note.paragraph_index] || null;
      }
      note.updated_at = new Date().toISOString();
    }
  }
}

function clampReadingStateToSections(state, sections) {
  const maxSectionIndex = Math.max(0, sections.length - 1);
  state.current_section_index = Math.min(state.current_section_index, maxSectionIndex);
  state.unlocked_section_index = Math.min(state.unlocked_section_index, maxSectionIndex);

  const currentSection = sections[state.current_section_index];
  const unlockedSection = sections[state.unlocked_section_index];
  state.current_paragraph_index = clampParagraphIndex(
    state.current_paragraph_index,
    currentSection
  );
  state.unlocked_paragraph_index = clampParagraphIndex(
    state.unlocked_paragraph_index,
    unlockedSection
  );
}

function clampParagraphIndex(value, section) {
  const maxParagraphIndex = Math.max(0, (section?.paragraphs.length || 1) - 1);
  return Math.min(value, maxParagraphIndex);
}

// Auto-chunk sections longer than this many paragraphs. Keeps a single oversized
// chapter (or a plain-text book with no headings) from rendering as one giant
// section the browser can't scroll through and the user can't track progress in.
const SECTION_PARAGRAPH_LIMIT = 50;

function splitIntoSections(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const sections = [];
  let currentTitle = 'Start';
  let buffer = [];
  let hasHeading = false;

  for (const line of lines) {
    if (isHeading(line)) {
      hasHeading = true;
      pushSection(sections, currentTitle, buffer);
      currentTitle = line.replace(/^#+\s*/, '').trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  pushSection(sections, currentTitle, buffer);

  if (!hasHeading && sections.length > 0) {
    sections[0].title = 'Start';
  }

  return chunkOversizedSections(sections);
}

function chunkOversizedSections(sections) {
  const result = [];
  for (const section of sections) {
    if (section.paragraphs.length <= SECTION_PARAGRAPH_LIMIT) {
      result.push(section);
      continue;
    }
    const total = Math.ceil(section.paragraphs.length / SECTION_PARAGRAPH_LIMIT);
    for (let i = 0; i < section.paragraphs.length; i += SECTION_PARAGRAPH_LIMIT) {
      const sliceParagraphs = section.paragraphs.slice(i, i + SECTION_PARAGRAPH_LIMIT);
      const partIndex = Math.floor(i / SECTION_PARAGRAPH_LIMIT) + 1;
      const title = section.title === 'Start'
        ? `Section ${partIndex}`
        : `${section.title} (${partIndex}/${total})`;
      result.push({ title, paragraphs: sliceParagraphs });
    }
  }
  return result;
}

function isHeading(line) {
  const trimmed = line.trim();
  return /^#{1,3}\s+\S/.test(trimmed) ||
    /^(chapter|part)\s+\d+/i.test(trimmed) ||
    /^第[一二三四五六七八九十百千万零〇\d]+[章节部卷]/.test(trimmed);
}

function pushSection(sections, title, buffer) {
  const paragraphs = buffer
    .join('\n')
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    sections.push({ title: title || `Section ${sections.length + 1}`, paragraphs });
  }
}

function getBookPayload(store, bookId) {
  return {
    book: findBook(store, bookId),
    sections: getSections(store, bookId),
    state: getReadingState(store, bookId)
  };
}

function findBook(store, bookId) {
  return store.books.find((book) => book.id === bookId);
}

function getSections(store, bookId) {
  return store.sections
    .filter((section) => section.book_id === bookId)
    .sort((a, b) => a.section_index - b.section_index);
}

function getReadingState(store, bookId) {
  const resolvedBookId = requireBookId(store, bookId);
  const state = store.reading_states.find((item) => item.book_id === resolvedBookId);
  if (!state) throw new Error('reading_state_not_found');
  const section = getSections(store, resolvedBookId)[state.current_section_index];
  return {
    ...state,
    book: findBook(store, resolvedBookId),
    current_section: section ? summarizeSection(section) : null
  };
}

function getCurrentPassage(store, bookId) {
  const state = getReadingState(store, bookId);
  const section = getSections(store, state.book_id)[state.current_section_index];
  if (!section) return null;
  return {
    book_id: state.book_id,
    section_id: section.id,
    section_index: section.section_index,
    section_title: section.title,
    paragraph_index: state.current_paragraph_index,
    paragraph_key: section.paragraph_keys?.[state.current_paragraph_index] || null,
    text: section.paragraphs[state.current_paragraph_index] || ''
  };
}

function getUnlockedContext(store, bookId, limit = 12000) {
  const state = getReadingState(store, bookId);
  const sections = getSections(store, state.book_id);
  const chunks = [];
  let remaining = Math.max(0, limit);

  for (const section of sections) {
    if (section.section_index > state.unlocked_section_index || remaining <= 0) break;
    const lastParagraphIndex = section.section_index === state.unlocked_section_index
      ? state.unlocked_paragraph_index
      : section.paragraphs.length - 1;
    const paragraphs = section.paragraphs.slice(0, lastParagraphIndex + 1);
    if (paragraphs.length === 0) continue;
    const text = [`## ${section.title}`, ...paragraphs].join('\n\n');
    chunks.push(text.slice(0, remaining));
    remaining -= text.length;
  }

  return {
    book_id: state.book_id,
    unlocked_section_index: state.unlocked_section_index,
    unlocked_paragraph_index: state.unlocked_paragraph_index,
    text: chunks.join('\n\n')
  };
}

function getReadingNotes(store, bookId, sectionId) {
  const resolvedBookId = requireBookId(store, bookId);
  const state = getReadingState(store, resolvedBookId);
  const sectionsById = new Map(getSections(store, resolvedBookId).map((section) => [section.id, section]));
  return store.reading_notes
    .filter((note) => note.book_id === resolvedBookId)
    .filter((note) => !sectionId || note.section_id === sectionId)
    .filter((note) => isNoteWithinWaterline(note, sectionsById, state))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function saveReadingNote(store, bookId, body) {
  const resolvedBookId = requireBookId(store, bookId);
  const authorType = body.author_type || 'user';
  const noteType = body.note_type || 'reflection';

  if (!authorTypes.has(authorType)) throw new Error('invalid_author_type');
  if (!noteTypes.has(noteType)) throw new Error('invalid_note_type');

  const content = requireString(body.content, 'content');
  const section = resolveSection(store, resolvedBookId, body.section_id, body.section_index);
  const paragraphIndex = normalizeOptionalInteger(body.paragraph_index);
  assertNoteAnchorWithinWaterline(store, resolvedBookId, section, paragraphIndex);
  const now = new Date().toISOString();
  const note = {
    id: crypto.randomUUID(),
    book_id: resolvedBookId,
    section_id: section?.id || null,
    paragraph_index: paragraphIndex,
    paragraph_key: section && paragraphIndex !== null
      ? section.paragraph_keys?.[paragraphIndex] || null
      : null,
    author_type: authorType,
    note_type: noteType,
    content,
    model_name: body.model_name || null,
    created_at: now,
    updated_at: now
  };

  store.reading_notes.push(note);
  return note;
}

function isNoteWithinWaterline(note, sectionsById, state) {
  if (!note.section_id) return true;
  const section = sectionsById.get(note.section_id);
  if (!section) return false;
  if (note.paragraph_index === null || note.paragraph_index === undefined) {
    return section.section_index <= state.unlocked_section_index;
  }
  return comparePosition(
    section.section_index,
    note.paragraph_index,
    state.unlocked_section_index,
    state.unlocked_paragraph_index
  ) <= 0;
}

function assertNoteAnchorWithinWaterline(store, bookId, section, paragraphIndex) {
  if (!section) return;
  if (paragraphIndex !== null && paragraphIndex >= section.paragraphs.length) {
    throw new Error('note_paragraph_out_of_range');
  }
  const state = store.reading_states.find((item) => item.book_id === bookId);
  if (!state) throw new Error('reading_state_not_found');

  if (paragraphIndex === null) {
    if (section.section_index > state.unlocked_section_index) {
      throw new Error('note_after_waterline');
    }
    return;
  }

  if (comparePosition(section.section_index, paragraphIndex, state.unlocked_section_index, state.unlocked_paragraph_index) > 0) {
    throw new Error('note_after_waterline');
  }
}

function advanceReadingProgress(store, bookId, sectionIndex, paragraphIndex) {
  const resolvedBookId = requireBookId(store, bookId);
  const nextSectionIndex = normalizeInteger(sectionIndex, 'section_index');
  const nextParagraphIndex = normalizeInteger(paragraphIndex, 'paragraph_index');
  const sections = getSections(store, resolvedBookId);
  const section = sections[nextSectionIndex];

  if (!section || nextParagraphIndex < 0 || nextParagraphIndex >= section.paragraphs.length) {
    throw new Error('progress_out_of_range');
  }

  const state = store.reading_states.find((item) => item.book_id === resolvedBookId);
  state.current_section_index = nextSectionIndex;
  state.current_paragraph_index = nextParagraphIndex;

  if (comparePosition(nextSectionIndex, nextParagraphIndex, state.unlocked_section_index, state.unlocked_paragraph_index) > 0) {
    state.unlocked_section_index = nextSectionIndex;
    state.unlocked_paragraph_index = nextParagraphIndex;
  }

  state.updated_at = new Date().toISOString();
  return getReadingState(store, resolvedBookId);
}

function comparePosition(sectionA, paragraphA, sectionB, paragraphB) {
  if (sectionA !== sectionB) return sectionA - sectionB;
  return paragraphA - paragraphB;
}

function resolveSection(store, bookId, sectionId, sectionIndex) {
  const sections = getSections(store, bookId);
  if (sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) throw new Error('section_not_found');
    return section;
  }
  if (sectionIndex !== undefined) {
    const section = sections[normalizeInteger(sectionIndex, 'section_index')];
    if (!section) throw new Error('section_not_found');
    return section;
  }
  return sections[0] || null;
}

function summarizeSection(section) {
  return {
    id: section.id,
    section_index: section.section_index,
    title: section.title,
    paragraph_count: section.paragraphs.length,
    paragraph_keys: section.paragraph_keys || []
  };
}

function inferBookId(store) {
  if (store.books.length === 0) throw new Error('no_books_imported');
  return store.books[0].id;
}

function requireBookId(store, bookId) {
  const resolved = bookId || inferBookId(store);
  if (!findBook(store, resolved)) throw new Error('book_not_found');
  return resolved;
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name}_is_required`);
  }
  return value.trim();
}

function makeBookSourceKey(body, title, author, sourceFilename) {
  if (typeof body.source_id === 'string' && body.source_id.trim()) {
    return `source_id:${body.source_id.trim()}`;
  }
  if (sourceFilename) {
    return [
      'file',
      normalizeStableText(sourceFilename),
      normalizeStableText(title),
      normalizeStableText(author || '')
    ].join(':');
  }
  return [
    'title',
    normalizeStableText(title),
    normalizeStableText(author || '')
  ].join(':');
}

function normalizeStableText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableUuid(namespace, value) {
  const chars = sha256Hex(`${namespace}\0${value}`).slice(0, 32).split('');
  chars[12] = '5';
  chars[16] = ((Number.parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  return [
    chars.slice(0, 8).join(''),
    chars.slice(8, 12).join(''),
    chars.slice(12, 16).join(''),
    chars.slice(16, 20).join(''),
    chars.slice(20, 32).join('')
  ].join('-');
}

function normalizeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${name}_must_be_a_non_negative_integer`);
  return number;
}

function normalizeOptionalInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  return normalizeInteger(value, 'paragraph_index');
}
