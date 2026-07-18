import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, appendFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const port = Number(process.env.INGEST_PORT || 3847);
const commitRef = getCommitRef();
const logPath = resolve(process.cwd(), '.cursor/logs', `${commitRef}.ingest.log`);
const wsClients = new Set();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const viewerHtml = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>phone-log ingest viewer</title>
    <style>
      body { margin: 0; font-family: ui-monospace, Menlo, monospace; background: #0b1020; color: #dbe3ff; }
      header { padding: 12px 16px; border-bottom: 1px solid #2a355d; background: #121a33; position: sticky; top: 0; }
      main { padding: 12px 16px; }
      #logs { white-space: pre-wrap; word-break: break-word; line-height: 1.4; }
      .line { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #1f2a4b; }
      .meta { color: #8ea2da; font-size: 12px; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <header>phone-log ingest viewer</header>
    <main><div id="logs"></div></main>
    <script>
      const logs = document.getElementById("logs");
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(protocol + "://" + location.host + "/ws");
      ws.addEventListener("message", (event) => {
        const div = document.createElement("div");
        div.className = "line";
        try {
          const data = JSON.parse(event.data);
          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = "[" + new Date(data.timestamp || Date.now()).toLocaleTimeString() + "] " + (data.level || "log");
          const body = document.createElement("div");
          body.textContent = JSON.stringify(data.args ?? data, null, 2);
          div.appendChild(meta);
          div.appendChild(body);
        } catch {
          div.textContent = event.data;
        }
        logs.prepend(div);
      });
    </script>
  </body>
</html>`;

await mkdir(dirname(logPath), { recursive: true });

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port }));
    return;
  }

  if (requestUrl.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(viewerHtml);
    return;
  }

  if (requestUrl.pathname === '/ingest' && req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (requestUrl.pathname === '/ingest' && req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const line = JSON.stringify({
          timestamp: new Date().toISOString(),
          ...payload,
        });
        await appendFile(logPath, `${line}\n`, 'utf8');
        broadcast(line);
        res.writeHead(204, corsHeaders);
        res.end();
      } catch {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.on('upgrade', (req, socket) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (requestUrl.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const webSocketKey = req.headers['sec-websocket-key'];
  if (!webSocketKey) {
    socket.destroy();
    return;
  }

  const accept = createHash('sha1').update(`${webSocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n'),
  );

  wsClients.add(socket);
  socket.on('close', () => wsClients.delete(socket));
  socket.on('error', () => wsClients.delete(socket));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[ingest] listening on http://0.0.0.0:${port}`);
  console.log(`[ingest] viewer: http://localhost:${port}/`);
  console.log(`[ingest] log file: ${logPath}`);
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`[ingest] Port ${port} is already in use.`);
    process.exit(1);
  }
  console.error('[ingest] server error', error);
  process.exit(1);
});

function broadcast(message) {
  for (const socket of wsClients) {
    if (socket.destroyed) {
      wsClients.delete(socket);
      continue;
    }
    socket.write(encodeWsFrame(message));
  }
}

function encodeWsFrame(message) {
  const payload = Buffer.from(message);
  const len = payload.length;
  if (len > 125) {
    // 長文でも安全に送れるよう最小限の拡張長を扱う
    const frame = Buffer.alloc(4 + len);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(len, 2);
    payload.copy(frame, 4);
    return frame;
  }

  const frame = Buffer.alloc(2 + len);
  frame[0] = 0x81;
  frame[1] = len;
  payload.copy(frame, 2);
  return frame;
}

function getCommitRef() {
  if (process.env.INGEST_LOG_COMMIT) {
    return sanitizeRef(process.env.INGEST_LOG_COMMIT);
  }

  try {
    const sha = execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    if (sha) return sanitizeRef(sha);
  } catch {
    // git情報が取得できない環境ではfallbackを使う
  }

  return `nogit-${Date.now()}`;
}

function sanitizeRef(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
