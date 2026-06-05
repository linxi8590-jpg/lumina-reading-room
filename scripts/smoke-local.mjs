import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = path.join(root, 'apps/server/src/index.js');
const serverRequire = createRequire(path.join(root, 'apps/server/package.json'));
const JSZip = serverRequire('jszip');

const checks = [];
let child;
let tempDir;

try {
  const port = await getFreePort();
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lumina-smoke-'));
  const token = `lrr_${crypto.randomBytes(32).toString('base64url')}`;
  const baseUrl = `http://127.0.0.1:${port}`;

  child = spawn(process.execPath, [serverEntry], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      LUMINA_CONNECTOR_TOKEN: token,
      LUMINA_DATA_DIR: tempDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  child.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  child.once('exit', (code) => {
    if (code !== 0 && code !== null) {
      serverOutput += `\nServer exited with code ${code}`;
    }
  });

  await waitForHealth(baseUrl, () => serverOutput);
  checks.push('health');

  const unauthorized = await fetch(`${baseUrl}/api/books`);
  assert(unauthorized.status === 401, 'unauthorized API access should be rejected');
  checks.push('auth');

  const initialBookText = [
    '# Opening',
    'First paragraph visible at start.',
    '',
    'Second paragraph visible after progress.',
    '',
    '# Locked',
    'Future paragraph must not be returned before unlock.',
  ].join('\n');
  const bookImportBody = {
    title: 'Smoke Test Book',
    author: 'Lumina',
    source_filename: 'smoke-test.md',
    text: initialBookText,
  };

  const book = await api(baseUrl, token, '/api/books/import', {
    method: 'POST',
    body: bookImportBody,
  });
  assert(book.status === 201, 'book import failed');
  const bookId = book.body.book.id;
  const payload = await api(baseUrl, token, `/api/books/${bookId}`);
  const firstSectionId = payload.body.sections[0].id;
  const secondParagraphKey = payload.body.sections[0].paragraph_keys[1];
  checks.push('import');

  let context = await api(baseUrl, token, `/api/books/${bookId}/unlocked-context`);
  let text = context.body.context.text;
  assert(text.includes('First paragraph visible at start.'), 'initial context missing first paragraph');
  assert(!text.includes('Second paragraph visible after progress.'), 'initial context leaked second paragraph');
  assert(!text.includes('Future paragraph must not be returned before unlock.'), 'initial context leaked future paragraph');

  const progress = await api(baseUrl, token, `/api/books/${bookId}/progress`, {
    method: 'POST',
    body: { section_index: 0, paragraph_index: 1 },
  });
  assert(progress.status === 200, 'progress update failed');

  context = await api(baseUrl, token, '/mcp', {
    method: 'POST',
    body: {
      tool: 'get_unlocked_context',
      arguments: { book_id: bookId },
    },
  });
  text = context.body.result.text;
  assert(text.includes('First paragraph visible at start.'), 'progressed context missing first paragraph');
  assert(text.includes('Second paragraph visible after progress.'), 'progressed context missing second paragraph');
  assert(!text.includes('Future paragraph must not be returned before unlock.'), 'progressed context leaked future paragraph');
  checks.push('waterline');

  const connectorUrlContext = await api(baseUrl, null, `/mcp?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    body: {
      tool: 'get_unlocked_context',
      arguments: { book_id: bookId },
    },
  });
  assert(connectorUrlContext.status === 200, 'MCP connector URL token should authorize the request');
  assert(
    connectorUrlContext.body.result.text.includes('Second paragraph visible after progress.'),
    'MCP connector URL token should return unlocked context',
  );
  checks.push('mcp_url_token');

  const note = await api(baseUrl, token, '/mcp', {
    method: 'POST',
    body: {
      tool: 'save_ai_note',
      arguments: {
        book_id: bookId,
        section_index: 0,
        paragraph_index: 1,
        note_type: 'highlight',
        content: 'Second paragraph is now unlocked.',
      },
    },
  });
  assert(note.status === 200, 'save_ai_note request failed');
  assert(note.body.result.author_type === 'ai', 'save_ai_note did not create an AI note');

  const notes = await api(baseUrl, token, `/api/books/${bookId}/notes`);
  assert(
    notes.body.notes.some((item) => item.author_type === 'ai' && item.note_type === 'highlight'),
    'saved AI note was not returned by notes API',
  );
  checks.push('mcp_note');

  const lockedNote = await api(baseUrl, token, '/mcp', {
    method: 'POST',
    body: {
      tool: 'save_ai_note',
      arguments: {
        book_id: bookId,
        section_index: 1,
        paragraph_index: 0,
        note_type: 'reflection',
        content: 'This future note should be rejected.',
      },
    },
  });
  assert(
    lockedNote.status === 500 && lockedNote.body.message === 'note_after_waterline',
    'save_ai_note should reject notes after the waterline',
  );

  const invalidAnchorNote = await api(baseUrl, token, '/mcp', {
    method: 'POST',
    body: {
      tool: 'save_ai_note',
      arguments: {
        book_id: bookId,
        section_index: 99,
        paragraph_index: 0,
        note_type: 'reflection',
        content: 'Invalid anchors should not become unanchored notes.',
      },
    },
  });
  assert(
    invalidAnchorNote.status === 500 && invalidAnchorNote.body.message === 'section_not_found',
    'save_ai_note should reject invalid section anchors',
  );

  const storePath = path.join(tempDir, 'data.json');
  const storeSnapshot = JSON.parse(await fs.readFile(storePath, 'utf8'));
  const lockedSection = storeSnapshot.sections.find(
    (section) => section.book_id === bookId && section.section_index === 1,
  );
  assert(lockedSection, 'smoke book missing locked section');
  storeSnapshot.reading_notes.push({
    id: 'legacy-future-note',
    book_id: bookId,
    section_id: lockedSection.id,
    paragraph_index: 0,
    paragraph_key: lockedSection.paragraph_keys[0],
    author_type: 'user',
    note_type: 'reflection',
    content: 'Legacy future note should stay hidden.',
    model_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await fs.writeFile(storePath, `${JSON.stringify(storeSnapshot, null, 2)}\n`);

  const filteredNotes = await api(baseUrl, token, '/mcp', {
    method: 'POST',
    body: {
      tool: 'get_reading_notes',
      arguments: { book_id: bookId },
    },
  });
  assert(
    !filteredNotes.body.result.some((item) => item.id === 'legacy-future-note'),
    'get_reading_notes leaked a note after the waterline',
  );
  checks.push('note_waterline');

  const reimport = await api(baseUrl, token, '/api/books/import', {
    method: 'POST',
    body: {
      ...bookImportBody,
      text: initialBookText.replace(
        'Second paragraph visible after progress.',
        'Second paragraph visible after progress, with a tiny edit.',
      ),
    },
  });
  assert(reimport.status === 201, 'book reimport failed');
  assert(reimport.body.book.id === bookId, 'reimport should keep the same book id');
  assert(reimport.body.imported === 'updated', 'reimport should update the existing book');

  const reimportedPayload = await api(baseUrl, token, `/api/books/${bookId}`);
  assert(
    reimportedPayload.body.sections[0].id === firstSectionId,
    'reimport should keep stable section ids',
  );
  assert(
    reimportedPayload.body.sections[0].paragraph_keys[1] === secondParagraphKey,
    'reimport should keep stable paragraph keys',
  );
  assert(
    reimportedPayload.body.state.unlocked_paragraph_index === 1,
    'reimport should preserve reading waterline',
  );

  const notesAfterReimport = await api(baseUrl, token, `/api/books/${bookId}/notes`);
  assert(
    notesAfterReimport.body.notes.some(
      (item) =>
        item.author_type === 'ai' &&
        item.note_type === 'highlight' &&
        item.section_id === firstSectionId &&
        item.paragraph_key === secondParagraphKey,
    ),
    'reimport should preserve AI note anchors',
  );
  checks.push('reimport');

  const epub = await api(baseUrl, token, '/api/books/import', {
    method: 'POST',
    body: {
      format: 'epub',
      media_type: 'application/epub+zip',
      source_filename: 'tiny.epub',
      file_base64: await createTinyEpubBase64(),
    },
  });
  assert(epub.status === 201, 'epub import failed');
  assert(epub.body.book.title === 'Tiny EPUB', 'epub import should read metadata title');
  const epubBookId = epub.body.book.id;
  const epubContext = await api(baseUrl, token, `/api/books/${epubBookId}/unlocked-context`);
  const epubText = epubContext.body.context.text;
  assert(epubText.includes('EPUB first paragraph visible at start.'), 'epub context missing first paragraph');
  assert(!epubText.includes('EPUB second paragraph visible after progress.'), 'epub context leaked second paragraph');
  assert(!epubText.includes('EPUB future paragraph must not leak.'), 'epub context leaked future paragraph');
  checks.push('epub');

  console.log(`Lumina local smoke passed: ${checks.join(', ')}`);
} catch (error) {
  console.error(`Lumina local smoke failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function api(baseUrl, token, pathname, options = {}) {
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : null;
  return { status: res.status, body };
}

async function waitForHealth(baseUrl, getServerOutput) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
      lastError = new Error(`health returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const output = typeof getServerOutput === 'function' ? getServerOutput() : getServerOutput;
  throw new Error(`server did not become healthy: ${lastError?.message || 'timeout'}\n${output || ''}`);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('failed to allocate a local port'));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTinyEpubBase64() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );
  zip.file(
    'OPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Tiny EPUB</dc:title>
    <dc:creator>Smoke Test</dc:creator>
  </metadata>
  <manifest>
    <item id="chapter-1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter-2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter-1"/>
    <itemref idref="chapter-2"/>
  </spine>
</package>`,
  );
  zip.file(
    'OPS/chapter1.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>EPUB Opening</h1>
    <p>EPUB first paragraph visible at start.</p>
    <p>EPUB second paragraph visible after progress.</p>
  </body>
</html>`,
  );
  zip.file(
    'OPS/chapter2.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>EPUB Locked</h1>
    <p>EPUB future paragraph must not leak.</p>
  </body>
</html>`,
  );

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
  });
  return buffer.toString('base64');
}
