# Spec 4: Feed Audit & Extensibility System

**Date**: 2026-03-18
**Status**: Implemented

## Problem

The OSINT MCP server had 90+ registered modules, but testing revealed that ~30 of them were broken — dead upstream APIs, missing API keys, permanently empty responses, or timeout failures. This created noise for AI agents (tools that never return useful data) and wasted API calls. Additionally, adding new OSINT feeds required editing two files (server + MCP registry), creating friction for extensibility.

## Changes Made

### 1. Feed Audit (29 broken tools removed from registry)

Every module was tested against the live headless server. Results categorized as:

**Dead APIs (always return 0 items regardless of params):**
- `conflict_acled`, `conflict_ucdp_events`, `conflict_hapi`, `unrest_events` — ACLED/UCDP/HDX HAPI APIs broken
- `wildfire_detections` — NASA FIRMS returns 0 detections
- `maritime_warnings`, `maritime_snapshot` — no data feed configured
- `military_flights`, `military_posture` — OpenSky military filter broken, posture empty
- `infrastructure_cable_health`, `infrastructure_baseline` — empty / invalid params
- `markets_commodities`, `economic_energy`, `economic_bis_credit` — always 0
- `markets_etf_flows` — permanently rate-limited
- `research_trending_repos` — GitHub trending API returns 0
- `positive_events` — placeholder, always empty

**Broken upstream:**
- `polymarket_intel` — HTTP 502 error
- `predictions` — Polymarket API returns 0 markets
- `radiation_epa` — EPA RadNet HTTP 404
- `geo_filters` — Overpass API consistently times out
- `news_telegram` — requires WS_RELAY_URL relay infrastructure

**Upstream unavailable (5 trade modules):**
- `trade_flows`, `trade_tariffs`, `trade_restrictions`, `trade_barriers`, `supply_chain_shipping`

**Needs API key (no key configured):**
- `markets` — needs FINNHUB_API_KEY

**Duplicate:**
- `get_risk_scores` — same module as `get_intelligence_summary`

### 2. API-Key-Dependent Tools Added (5 new)

Tools that work when API keys are configured, with clear error messages when not:

| Tool | Module | API Key | Source |
|------|--------|---------|--------|
| `get_fred_series` | `financial_fred_macro` | `FRED_API_KEY` | FRED economic time series |
| `get_fmp_quote` | `financial_fmp_quote` | `FMP_API_KEY` | Real-time stock quotes |
| `get_fmp_profile` | `financial_fmp_profile` | `FMP_API_KEY` | Company profiles |
| `get_fmp_ratios` | `financial_fmp_ratios_ttm` | `FMP_API_KEY` | TTM financial ratios |
| `get_fmp_estimates` | `financial_fmp_analyst_estimates` | `FMP_API_KEY` | Analyst estimates |

**Implementation detail:** Added `param_map` support to the tool factory — remaps MCP `query` param to server-expected names (`symbol`, `series_id`) without changing the MCP interface.

### 3. ADSB.fi Military Aircraft Tracking (1 new module + tool)

Added `adsbfi_aircraft` module to headless server using the ADSB.fi/lol API:
- **No API key required** (free, public, no rate limit)
- **Unfiltered** — shows military aircraft that OpenSky hides
- **Auto-tags military** using callsign prefix database (REACH, RAF, NAVY, FORTE, etc.)
- **Supports**: lat/lon/dist search, callsign search, ICAO hex lookup, bbox conversion
- **MCP tool**: `get_aircraft_mil` with `military=true` filter option

Tested: Found 8 military aircraft (7x USAF C-17 Globemaster) over Europe in first test.

### 4. Server-Side Plugin System

New `server/api/modules/` directory for drop-in OSINT modules:

**How it works:**
1. Drop a `.mjs` file in `server/api/modules/`
2. File exports `{ name, description, run(ctx, params) }`
3. Server auto-loads it at startup via `readdirSync` + dynamic `import()`
4. Module appears in headless API immediately (and MCP via auto-discovery)

**Convention:**
- Files starting with `_` are skipped (e.g., `_template.mjs`)
- Module ID = filename without `.mjs` extension (or `export const name`)
- Duplicate IDs (already in MODULES) are warned and skipped

Template provided: `server/api/modules/_template.mjs`

### 5. MCP Auto-Discovery

The MCP server now auto-discovers new headless modules at startup:

**How it works:**
1. At startup, MCP fetches `/api/headless?module=list` from the server
2. Any module NOT in `TOOL_REGISTRY` gets auto-registered as a generic tool
3. Auto-discovered tools get `query`, `limit`, `bbox`, `format` params
4. Description prefixed with `[Auto-discovered]` to distinguish from curated tools

**Effect:** Adding a new feed to the headless server (either in `headless.js` or as a plugin) requires ZERO MCP-side changes. The MCP server picks it up automatically.

**Registry priority:** Curated `TOOL_REGISTRY` entries take precedence — they have better descriptions, custom param names, and param_map support.

### 6. Resources Updated

Removed broken resource templates (conflict, maritime, wildfires). Replaced with:
- `osint://earthquakes` — USGS
- `osint://climate` — climate anomalies
- `osint://disasters` — GDACS alerts
- `osint://military/usni` — fleet tracker
- `osint://cyber` — threat IOCs
- `osint://news` — RSS feeds

### 7. CORE_MODULES / FAST_MODULES Updated

Removed broken module references from server-side module groups:
- `CORE_MODULES`: earthquakes, cyber, outages, news, risk scores
- `FAST_MODULES`: earthquakes, outages, cyber, news, USNI, weather, CISA KEV

## Tool Count

| Before | After |
|--------|-------|
| 90+ tools (30 broken) | 64 curated + auto-discovered |
| 6 resources (3 broken) | 6 resources (all working) |

## Extensibility: Adding a New Feed

### Option A: Plugin file (recommended for new feeds)

```bash
# 1. Create the plugin file
cat > server/api/modules/my_feed.mjs << 'EOF'
export const name = 'my_feed';
export const description = 'My custom OSINT feed';
export async function run(_ctx, params) {
  const resp = await fetch('https://api.example.com/data', {
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}
EOF

# 2. Restart server — that's it
# Module appears in headless API AND MCP tools automatically
```

### Option B: Curated registry entry (for better descriptions/params)

After creating the plugin, optionally add a curated entry to `mcp/src/osint_mcp/tools/__init__.py`:

```python
{
    "tool_name": "get_my_feed",
    "module_id": "my_feed",
    "description": "Get data from my custom feed. Query searches by keyword.",
    "required_params": {"query": str},
    # Optional: remap MCP param names to server param names
    "param_map": {"query": "search_term"},
},
```

### Option C: Inline module (for complex modules)

Add directly to the `MODULES` object in `server/api/headless.js`. Same pattern as existing modules. Auto-discovered by MCP.

## Files Changed

- `mcp/src/osint_mcp/tools/__init__.py` — registry cleanup, param_map, auto-discovery
- `mcp/src/osint_mcp/resources.py` — resource cleanup
- `server/api/headless.js` — ADSB.fi module, plugin loader, CORE/FAST cleanup
- `server/api/modules/_template.mjs` — plugin template
- `server/.env.example` — added FMP_API_KEY
- `skill/osint/SKILL.md` — full rewrite for working tools
- `CLAUDE.md`, `README.md` — tool counts
