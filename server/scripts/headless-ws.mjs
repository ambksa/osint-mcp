import http from 'node:http';
import process from 'node:process';
import { WebSocketServer } from 'ws';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const DEFAULT_REMOTE_BASE =
  process.env.HEADLESS_BASE_URL
  || process.env.VITE_WS_API_URL
  || 'https://h1dr4-worldosint-dirlk4bbwa-ew.a.run.app';

function isLocalBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

const port = Number(getArg('--port', '8787'));
const base = getArg('--base', DEFAULT_REMOTE_BASE).replace(/\/$/, '');
const defaultInterval = Number(getArg('--interval', '20000'));
const allowLocal = getArg('--allow-local', '0') === '1';

if (isLocalBaseUrl(base) && !allowLocal) {
  console.error(`[headless-ws] Refusing local base URL (${base}). Use a remote backend or pass --allow-local 1.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

function getByPath(obj, path) {
  if (!path) return obj;
  const parts = path.split('.').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function resolveRuleTarget(payload, rule) {
  if (!payload) return undefined;
  if (rule.module) {
    const base = payload.modules?.[rule.module]?.data;
    return rule.path ? getByPath(base, rule.path) : base;
  }
  if (rule.path?.startsWith('modules.')) {
    return getByPath(payload, rule.path);
  }
  return rule.path ? getByPath(payload, rule.path) : payload;
}

function evalRule(rule, payload, lastValues) {
  const target = resolveRuleTarget(payload, rule);
  let value = target;

  if (rule.mode === 'count') {
    value = Array.isArray(target) ? target.length : 0;
  }

  if (rule.mode === 'any') {
    const items = Array.isArray(target) ? target : [];
    const filter = rule.filter || {};
    const field = filter.field || '';
    const op = filter.op || 'contains';
    const compareValue = filter.value ?? '';
    let matched = false;
    for (const item of items) {
      const fieldValue = field ? getByPath(item, field) : item;
      if (op === 'contains') {
        const str = String(fieldValue ?? '');
        if (str.toLowerCase().includes(String(compareValue).toLowerCase())) {
          matched = true;
          break;
        }
      } else if (op === 'eq') {
        if (String(fieldValue) === String(compareValue)) {
          matched = true;
          break;
        }
      } else if (op === 'gte') {
        if (Number(fieldValue) >= Number(compareValue)) {
          matched = true;
          break;
        }
      } else if (op === 'lte') {
        if (Number(fieldValue) <= Number(compareValue)) {
          matched = true;
          break;
        }
      } else if (op === 'lt') {
        if (Number(fieldValue) < Number(compareValue)) {
          matched = true;
          break;
        }
      } else if (op === 'exists') {
        if (fieldValue !== undefined && fieldValue !== null) {
          matched = true;
          break;
        }
      } else {
        if (Number(fieldValue) > Number(compareValue)) {
          matched = true;
          break;
        }
      }
    }
    value = matched;
  }

  if (rule.mode === 'delta') {
    const current = Array.isArray(target) ? target.length : Number(target || 0);
    const last = Number(lastValues.get(rule.id) || 0);
    value = current - last;
  }

  const op = rule.op || 'gt';
  const compareValue = rule.value ?? 0;
  let triggered = false;

  if (rule.mode === 'any') {
    triggered = Boolean(value);
    return {
      id: rule.id,
      label: rule.label || rule.id,
      triggered,
      value,
      op: rule.op || 'any',
      compareValue,
    };
  }

  if (op === 'contains') {
    const str = String(value ?? '');
    triggered = str.toLowerCase().includes(String(compareValue).toLowerCase());
  } else if (op === 'eq') {
    triggered = Number(value) === Number(compareValue);
  } else if (op === 'gte') {
    triggered = Number(value) >= Number(compareValue);
  } else if (op === 'lte') {
    triggered = Number(value) <= Number(compareValue);
  } else if (op === 'lt') {
    triggered = Number(value) < Number(compareValue);
  } else if (op === 'exists') {
    triggered = value !== undefined && value !== null;
  } else {
    triggered = Number(value) > Number(compareValue);
  }

  if (rule.mode === 'delta') {
    lastValues.set(rule.id, Array.isArray(target) ? target.length : Number(target || 0));
  }

  return {
    id: rule.id,
    label: rule.label || rule.id,
    triggered,
    value,
    op,
    compareValue,
  };
}

function buildUrl(modules, format, params) {
  const qs = new URLSearchParams();
  const wantsAll = !Array.isArray(modules) || modules.length === 0 || modules.includes('__all__');
  if (wantsAll) {
    qs.set('module', 'all');
  } else {
    qs.set('modules', modules.join(','));
  }
  qs.set('format', format);
  if (params) qs.set('params', JSON.stringify(params));
  return `${base}/api/headless?${qs.toString()}`;
}

wss.on('connection', (ws) => {
  let intervalId = null;
  let active = false;
  const lastValues = new Map();

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    active = false;
  };

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(String(data));
      if (msg.action === 'subscribe') {
        stop();
        const modules = Array.isArray(msg.modules) && msg.modules.length ? msg.modules : ['__all__'];
        const intervalMs = Number(msg.intervalMs ?? defaultInterval);
        const params = msg.params || {};
        const format = msg.format || 'both';
        const alerts = Array.isArray(msg.alerts) ? msg.alerts : [];
        const alertsOnly = Boolean(msg.alertsOnly);
        const includePayload = msg.includePayload !== false;
        active = true;

        const poll = async () => {
          if (!active) return;
          const url = buildUrl(modules, format, params);
          try {
            const resp = await fetch(url, { headers: { Accept: 'application/json' } });
            const body = await resp.json();
            let triggered = [];
            if (alerts.length) {
              triggered = alerts
                .map((rule) => evalRule(rule, body, lastValues))
                .filter((rule) => rule.triggered);
            }

            if (alertsOnly && triggered.length === 0) return;

            const triggeredModules = triggered
              .map((t) => alerts.find((r) => r.id === t.id)?.module)
              .filter(Boolean);
            const payload = includePayload
              ? (triggered.length
                ? {
                  requestedAt: body.requestedAt,
                  modules: Object.fromEntries(
                    triggeredModules
                      .map((mod) => [mod, body.modules?.[mod]])
                      .filter(([, v]) => v),
                  ),
                  markdown: body.markdown,
                }
                : body)
              : undefined;

            ws.send(JSON.stringify({
              type: triggered.length ? 'alert' : 'update',
              ts: new Date().toISOString(),
              alerts: triggered,
              payload,
            }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', ts: new Date().toISOString(), error: error?.message || String(error) }));
          }
        };

        await poll();
        intervalId = setInterval(poll, intervalMs);
        ws.send(JSON.stringify({ type: 'subscribed', modules, intervalMs }));
        return;
      }

      if (msg.action === 'once') {
        const modules = Array.isArray(msg.modules) && msg.modules.length ? msg.modules : ['__all__'];
        const params = msg.params || {};
        const format = msg.format || 'both';
        const url = buildUrl(modules, format, params);
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        const body = await resp.json();
        ws.send(JSON.stringify({ type: 'update', ts: new Date().toISOString(), payload: body }));
        return;
      }

      if (msg.action === 'stop') {
        stop();
        ws.send(JSON.stringify({ type: 'stopped' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error?.message || String(error) }));
    }
  });

  ws.on('close', () => stop());
});

server.listen(port, () => {
  console.log(`[headless-ws] listening on ws://localhost:${port} (base=${base})`);
});
