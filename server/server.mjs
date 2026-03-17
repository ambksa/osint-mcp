import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, 'api');
const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'https://h1dr4.dev,https://www.h1dr4.dev')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const moduleCache = new Map();

function corsHeaders(req) {
  const reqOrigin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin)
    ? reqOrigin
    : (ALLOWED_ORIGINS[0] || 'https://h1dr4.dev');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WorldMonitor-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function safeApiPath(pathname) {
  if (!pathname.startsWith('/api/')) return null;
  const rel = pathname.slice('/api/'.length);
  if (!rel || rel.includes('\0')) return null;
  const normalized = path.posix.normalize(rel);
  if (normalized.startsWith('..')) return null;
  return normalized;
}

async function resolveHandler(pathname) {
  // Dynamic edge route support: /api/{domain}/v1/{rpc}
  if (/^\/api\/[^/]+\/v1\/[^/]+$/.test(pathname)) {
    const filePath = path.join(API_ROOT, '[domain]', 'v1', '[rpc].ts');
    if (!moduleCache.has(filePath)) {
      moduleCache.set(filePath, import(pathToFileURL(filePath).href));
    }
    const mod = await moduleCache.get(filePath);
    if (!mod || typeof mod.default !== 'function') return null;
    return mod.default;
  }

  const rel = safeApiPath(pathname);
  if (!rel) return null;
  const filePath = path.join(API_ROOT, `${rel}.js`);
  if (!filePath.startsWith(API_ROOT)) return null;
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }
  if (!moduleCache.has(filePath)) {
    moduleCache.set(filePath, import(pathToFileURL(filePath).href));
  }
  const mod = await moduleCache.get(filePath);
  if (!mod || typeof mod.default !== 'function') return null;
  return mod.default;
}

function toFetchHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    const cors = corsHeaders(req);
    if ((req.method || 'GET') === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

    if (url.pathname === '/health' || url.pathname === '/api/health') {
      res.writeHead(200, { ...cors, 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const handler = await resolveHandler(url.pathname);
    if (!handler) {
      res.writeHead(404, { ...cors, 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const headers = toFetchHeaders(req.headers);
    const method = req.method || 'GET';
    const init = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await readBody(req);
    }

    const request = new Request(url.toString(), init);
    const response = await handler(request);
    if (!(response instanceof Response)) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Handler returned non-Response' }));
      return;
    }

    const outHeaders = {};
    response.headers.forEach((value, key) => {
      outHeaders[key.toLowerCase()] = value;
    });
    // Per-route handlers already own CORS policy; avoid injecting duplicate
    // Access-Control-Allow-* headers at the wrapper level.
    res.writeHead(response.status, outHeaders);
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (error) {
    res.writeHead(500, { ...corsHeaders(req), 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', detail: String(error?.message || error) }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[worldosint-api] listening on :${PORT}`);
});
