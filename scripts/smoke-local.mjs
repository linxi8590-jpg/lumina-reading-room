import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = path.join(root, 'apps/server/src/index.js');

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
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
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
