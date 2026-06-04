# Local Development

This guide starts the local server with one command and imports a tiny test book.

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
npm run check:env
npm run server:dev
```
