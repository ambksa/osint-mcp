# Spec 2: worldosint-headless Performance & Reliability

## Overview

Fork `nativ3ai/worldosint-headless` and apply targeted improvements to parallel execution, reliability, and API quality. These changes directly benefit the osint-mcp MCP server by making multi-module queries fast and robust.

## Repository

- **Upstream**: `nativ3ai/worldosint-headless`
- **Fork**: `ambksa/worldosint-headless`
- **Key file**: `api/headless.js` (1519-line aggregation gateway)

## Changes

### 1. Parallel Module Execution (Critical)

**Problem**: All modules execute sequentially in a `for` loop (line 1468). Requesting multiple modules cascades into minutes of wall-clock time.

**Fix**: Replace the sequential loop with `Promise.allSettled()` for concurrent execution.

```javascript
// BEFORE (sequential)
for (const name of moduleList) {
  const rawData = await mod.run(ctx, moduleParams);
  results[name] = rawData;
}

// AFTER (parallel)
const promises = moduleList.map(async (name) => {
  const mod = MODULES[name];
  if (!mod) return { name, result: { error: 'Unknown module' } };
  const moduleParams = params[name] || {};
  // ... caching logic per module ...
  const rawData = await mod.run(ctx, moduleParams);
  return { name, result: rawData };
});
const settled = await Promise.allSettled(promises);
for (const s of settled) {
  if (s.status === 'fulfilled') results[s.value.name] = s.value.result;
  else results[s.value?.name] = { error: s.reason?.message || 'Module failed' };
}
```

Same fix applies to:
- `intelligence_findings` meta-module (lines 811-818) — 7 sub-modules run sequentially
- `news_rss` module — 15 RSS feeds fetched sequentially (lines 1284-1316)

### 2. Request-Level Timeout

**Problem**: No global timeout wrapping module execution. A stuck upstream hangs the connection indefinitely.

**Fix**: Wrap the entire module execution block in an `AbortSignal.timeout()`:

```javascript
const HEADLESS_REQUEST_TIMEOUT = Number(process.env.HEADLESS_REQUEST_TIMEOUT || 120000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), HEADLESS_REQUEST_TIMEOUT);
try {
  // ... run modules ...
} finally {
  clearTimeout(timer);
}
```

Individual module timeouts remain as-is (10-25s per module). The request-level timeout is a safety net (default 120s).

### 3. Fix CORE_MODULES Default

**Problem**: `CORE_MODULES` is set to `null` (line 1346), so a request with no `module`/`modules`/`mode` param runs ALL 48 modules.

**Fix**: Set `CORE_MODULES` to a curated fast subset:

```javascript
const CORE_MODULES = [
  'seismology_earthquakes', 'conflict_acled', 'unrest_events',
  'cyber_threats', 'infrastructure_outages', 'maritime_warnings',
  'news_rss', 'intelligence_risk_scores',
];
```

This matches the existing `FAST_MODULES` concept but as the default behavior.

### 4. Param Isolation Between Modules

**Problem**: Line 1474: `const moduleParams = params[name] || params || {};` — if `params` has no key matching the module name, the entire `params` object leaks into every module.

**Fix**: Strict isolation — only pass params explicitly keyed to the module:

```javascript
const moduleParams = (typeof params[name] === 'object' && params[name] !== null)
  ? params[name]
  : {};
```

### 5. Bounded In-Memory Cache

**Problem**: `MODULE_CACHE` (`Map`) grows unboundedly. With parameterized queries, this is a memory leak.

**Fix**: LRU-style eviction. Simple approach — cap at 500 entries, evict oldest on insert:

```javascript
const MAX_CACHE_SIZE = 500;
function setCachedModule(key, value) {
  if (MODULE_CACHE.size >= MAX_CACHE_SIZE) {
    const oldest = MODULE_CACHE.keys().next().value;
    MODULE_CACHE.delete(oldest);
  }
  MODULE_CACHE.set(key, value);
}
```

### 6. Auth on Headless Endpoint

**Problem**: No authentication on `/api/headless`. The `_api-key.js` middleware only protects sebuf RPC routes.

**Fix**: Optional bearer token check at the top of the headless handler:

```javascript
const HEADLESS_API_KEY = process.env.HEADLESS_API_KEY;
if (HEADLESS_API_KEY) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== HEADLESS_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
```

### 7. Data Freshness Metadata

**Problem**: Responses don't indicate when upstream data was last fetched. The `cachedAt` from Redis is not propagated.

**Fix**: Add `_meta` to each module result:

```javascript
results[name] = {
  ...rawData,
  _meta: {
    cachedAt: cached ? cached.cachedAt : null,
    fetchedAt: new Date().toISOString(),
    durationMs: elapsed,
    fromCache: !!cached,
  },
};
```

### 8. Parallel RSS Feeds

**Problem**: `news_rss` fetches 15 RSS feeds sequentially with 20s timeout each.

**Fix**: `Promise.allSettled()` for all feed fetches, with per-feed timeout preserved.

### 9. Shared fetchWithTimeout Utility

**Problem**: 4 identical copies of `fetchWithTimeout` across `opensky.js`, `ais-snapshot.js`, `polymarket-intel.js`, `rss-proxy.js`.

**Fix**: Extract to `api/_fetch.js` shared utility. All handlers import from there.

## Out of Scope

- Splitting headless.js into separate module files (too large a refactor for this iteration)
- New OSINT capabilities (Shadowbroker features — separate spec)
- WebSocket/streaming support
- OpenAPI documentation generation
- Upstream Redis caching changes (sebuf layer)

## Testing

- Start headless server locally: `PORT=3000 node --import tsx server.mjs`
- Test single module: `curl "http://localhost:3000/api/headless?module=seismology_earthquakes&format=json"`
- Test parallel multi-module: `curl "http://localhost:3000/api/headless?modules=seismology_earthquakes,cyber_threats,news_rss&format=json"` — should complete in max(module_times) not sum(module_times)
- Test default request: `curl "http://localhost:3000/api/headless"` — should return CORE_MODULES subset, not all 48
- Test timeout: request a module with a known-slow upstream, verify it doesn't hang forever
- Test cache bounds: make 600+ unique parameterized requests, verify memory doesn't grow unboundedly

## Configuration (New Env Vars)

| Env Var | Default | Description |
|---------|---------|-------------|
| `HEADLESS_API_KEY` | (unset = no auth) | Bearer token for headless endpoint |
| `HEADLESS_REQUEST_TIMEOUT` | `120000` | Global request timeout in ms |
| `HEADLESS_MAX_CACHE_SIZE` | `500` | Max in-memory cache entries |
