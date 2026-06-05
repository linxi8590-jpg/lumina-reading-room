# Local Development

This guide starts the local server with one command and imports a tiny test book.
The web uploader accepts TXT, Markdown, and EPUB files.

## 1. Prepare

You need Node.js. Then run:

```bash
bash scripts/quickstart.sh
```

The script creates `.env` with:

- `PORT`: where the server runs.
- `LUMINA_CONNECTOR_TOKEN`: the connector key.
- `LUMINA_DATA_DIR`: where local books and notes are stored.

The token is like the key to your reading room. Do not put `.env` in GitHub, screenshots, or public issues.

## 2. Start The Server

```bash
node apps/server/src/index.js
```

Open this in a browser:

```text
http://127.0.0.1:8787/health
```

You should see JSON with `"ok": true`.

## 3. Import A Test Book

In another terminal:

```bash
TOKEN="$(grep '^LUMINA_CONNECTOR_TOKEN=' .env | cut -d= -f2-)"

curl -s http://127.0.0.1:8787/api/books/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "title": "Tiny Test Book",
    "text": "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
  }'
```

This creates a local `.lumina/data.json` file. It is ignored by Git.

## 4. Ask For The Current Passage

```bash
curl -s http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"tool":"get_current_passage","arguments":{}}'
```

At first, the AI can only see the first paragraph.

## 5. Move The Reading Waterline

```bash
curl -s http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "tool": "advance_reading_progress",
    "arguments": {
      "section_index": 0,
      "paragraph_index": 1
    }
  }'
```

Now unlocked context includes the first two paragraphs, but not the third.

## Useful Commands

```bash
npm run quickstart
npm run dev:mobile
npm run check:env
npm run server:dev
npm run smoke:local
```

## Test On A Phone

Put your phone and computer on the same Wi-Fi, then run:

```bash
npm run dev:mobile
```

The script prints a phone URL such as:

```text
http://192.168.1.20:5173/
```

Open that URL on your phone. The connector page will default to the same LAN
host on port `8787`, for example:

```text
http://192.168.1.20:8787
```

Do not use `localhost` on your phone. On a phone, `localhost` means the phone
itself, not your computer.

`npm run smoke:local` starts a temporary local server, imports a tiny Markdown
book, re-imports it to check stable anchors, imports a generated EPUB, checks
that unread text is not returned to AI tools, saves an AI note, and then cleans
up its temporary data. It does not print the temporary connector token.
