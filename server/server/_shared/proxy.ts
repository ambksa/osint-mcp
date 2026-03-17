let initialized = false;

function parseProxyList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function initProxy() {
  if (initialized) return;
  initialized = true;

  if (typeof process === 'undefined' || !process?.versions?.node) return;

  const env = process.env || {};
  const list = parseProxyList(env.WORLDOSINT_PROXY_URLS);
  const single = parseProxyList(env.WORLDOSINT_PROXY_URL);
  const fallback = parseProxyList(env.HTTP_PROXY).length
    ? parseProxyList(env.HTTP_PROXY)
    : parseProxyList(env.HTTPS_PROXY);

  const proxies = list.length ? list : single.length ? single : fallback;
  if (!proxies.length) return;

  const proxyUrl = proxies[Math.floor(Math.random() * proxies.length)];
  const noProxy = env.NO_PROXY || 'localhost,127.0.0.1,::1';

  try {
    const undici = await import('undici');
    const ProxyAgent = undici.ProxyAgent;
    const setGlobalDispatcher = undici.setGlobalDispatcher;
    const agent = new ProxyAgent({ uri: proxyUrl, noProxy });
    setGlobalDispatcher(agent);
    console.info(`[proxy] enabled via ${proxyUrl}`);
  } catch (error) {
    console.warn('[proxy] failed to initialize proxy agent', error);
  }
}

void initProxy();
