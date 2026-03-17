import process from 'node:process';

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

const base = getArg('--base', DEFAULT_REMOTE_BASE);
const allowLocal = getArg('--allow-local', '0') === '1';
const moduleName = getArg('--module', '');
const modules = getArg('--modules', '');
const format = getArg('--format', 'both');
const paramsRaw = getArg('--params', '');

if (isLocalBaseUrl(base) && !allowLocal) {
  console.error(`[headless-cli] Refusing local base URL (${base}). Use a remote backend or pass --allow-local 1.`);
  process.exit(1);
}

const qs = new URLSearchParams();
if (moduleName) qs.set('module', moduleName);
if (modules) qs.set('modules', modules);
qs.set('format', format);
if (paramsRaw) qs.set('params', paramsRaw);

const url = `${base.replace(/\/$/, '')}/api/headless?${qs.toString()}`;

try {
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(text);
    process.exit(1);
  }
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(error?.message || String(error));
  process.exit(1);
}
