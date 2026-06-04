import http from 'node:http';

const port = Number(process.env.PORT || 8787);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'lumina-server' }));
    return;
  }

  if (req.url === '/mcp') {
    const auth = req.headers.authorization || '';
    const expected = process.env.LUMINA_CONNECTOR_TOKEN
      ? `Bearer ${process.env.LUMINA_CONNECTOR_TOKEN}`
      : '';

    if (!expected || auth !== expected) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    res.writeHead(501, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      error: 'mcp_not_implemented_yet',
      message: 'MCP tool transport will be implemented after schema and UI spec are locked.'
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, () => {
  console.log(`Lumina server listening on :${port}`);
});

