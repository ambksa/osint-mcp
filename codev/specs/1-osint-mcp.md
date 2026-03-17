# Spec 1: osint-mcp

## Overview

A Python MCP server (using FastMCP) that wraps the worldosint-headless API, exposing 50+ OSINT data modules as granular MCP tools for agent consumption.

## Architecture

```
Agent (Claude, etc.)
  └─ MCP Client
       └─ osint-mcp (FastMCP, Python, stdio + SSE transport)
            └─ HTTP (httpx)
                 └─ worldosint-headless (/api/headless)
                      └─ External OSINT sources (USGS, ACLED, FRED, etc.)
```

- **Transport**: stdio (local) and SSE over HTTP (network/remote agents). FastMCP supports both natively. The server starts in stdio mode by default; pass `--transport sse --port 8080` for network mode.
- **Headless server**: Runs separately, configured via `HEADLESS_BASE_URL` env var (default: `http://127.0.0.1:3000`)
- **HTTP client**: httpx async, configurable timeout, structured error responses

## Project Structure

```
osint-mcp/
├── pyproject.toml
├── src/
│   └── osint_mcp/
│       ├── __init__.py
│       ├── server.py           # FastMCP server entry point
│       ├── client.py           # Headless API HTTP client
│       └── tools/
│           ├── __init__.py     # register_all_tools(mcp, client) wires everything
│           ├── aggregate.py    # list_modules, query_modules, intelligence_summary, health_check
│           ├── conflict.py     # conflict_acled, conflict_ucdp_events, conflict_hapi
│           ├── unrest.py       # unrest_events
│           ├── maritime.py     # maritime_warnings, maritime_snapshot
│           ├── military.py     # military_flights, military_posture, military_usni
│           ├── cyber.py        # cyber_threats
│           ├── infrastructure.py # outages, cable_health, baseline, services
│           ├── natural_events.py # earthquakes, wildfires, climate_anomalies
│           ├── markets.py      # markets, crypto, commodities, stablecoins, etf_flows
│           ├── economics.py    # macro, energy, bis_rates, bis_fx, bis_credit
│           ├── trade.py        # restrictions, tariffs, flows, barriers
│           ├── supply_chain.py # shipping, chokepoints, critical_minerals
│           ├── news.py         # news_rss, news_telegram, intelligence_gdelt
│           ├── research.py     # tech_events, arxiv, trending_repos, hackernews
│           ├── prediction.py   # predictions, polymarket_intel
│           ├── geolocation.py  # geocode_place, geo_filters, satellite_snapshot
│           ├── humanitarian.py # displacement_summary, population_exposure, giving_summary
│           └── misc.py         # aviation_delays, positive_events, risk_scores, pizzint
```

## Dependencies

```toml
[project]
name = "osint-mcp"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastmcp>=2.0",
    "httpx>=0.27",
]

[project.scripts]
osint-mcp = "osint_mcp.server:main"
```

## Cross-Cutting Concerns

### `format` Parameter

Every tool accepts an optional `format` parameter passed through to the headless API:
- `"json"` (default) — structured data only
- `"md"` — markdown summary only
- `"both"` — JSON data + markdown summary

### Required Parameters

Some tools have required parameters (not optional):
- `get_geocode` requires `query: str`
- `get_military_flights` requires `bbox: str`

These are enforced at the tool signature level (no default value). If omitted, FastMCP returns a validation error to the agent before any HTTP call is made.

### Timeout

Default timeout is 60 seconds (`HEADLESS_TIMEOUT` env var). Aggregate tools that fan out to multiple modules may need the full duration.

## Tool Inventory

### Aggregate Tools (4)

| Tool | Params | Description |
|------|--------|-------------|
| `health_check` | none | Verify connectivity to headless server (calls `/api/version`) |
| `list_modules` | none | List all available OSINT module IDs and descriptions |
| `query_modules` | `modules: str` (comma-separated IDs), `format`, `limit`, `bbox` | Query arbitrary modules by ID. Returns `{module_id: data}` dict |
| `get_intelligence_summary` | `format` | Queries `intelligence_risk_scores` module which synthesizes alerts from conflict, unrest, outages, cyber, and seismic sources |

### Conflict & Unrest (4)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_conflict_acled` | `conflict_acled` | Armed conflict events from ACLED |
| `get_conflict_ucdp` | `conflict_ucdp_events` | UCDP conflict events |
| `get_conflict_hapi` | `conflict_hapi` | HDX HAPI humanitarian conflict summary |
| `get_unrest_events` | `unrest_events` | Protest and civil unrest events |

### Maritime (2)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_maritime_warnings` | `maritime_warnings` | Active navigational warnings |
| `get_maritime_snapshot` | `maritime_snapshot` | AIS vessel position snapshot |

### Military (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_military_flights` | `military_flights` | Military aircraft tracking. **Required:** `bbox` |
| `get_military_posture` | `military_posture` | Theater posture summary |
| `get_military_usni` | `military_usni` | USNI Fleet tracker report |

### Cyber (1)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_cyber_threats` | `cyber_threats` | Cyber threat IOCs and alerts |

### Infrastructure (4)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_infrastructure_outages` | `infrastructure_outages` | Internet outage events |
| `get_infrastructure_cable_health` | `infrastructure_cable_health` | Undersea cable status |
| `get_infrastructure_baseline` | `infrastructure_baseline` | Temporal baseline metrics |
| `get_infrastructure_services` | `infrastructure_services` | Service availability checks |

### Natural Events (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_earthquakes` | `seismology_earthquakes` | USGS earthquake data |
| `get_wildfires` | `wildfire_detections` | NASA FIRMS fire detections |
| `get_climate_anomalies` | `climate_anomalies` | Climate anomaly tracking |

### Markets (5)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_markets` | `markets` | Stock/index quotes |
| `get_crypto` | `markets_crypto` | Cryptocurrency quotes |
| `get_commodities` | `markets_commodities` | Commodity prices |
| `get_stablecoins` | `markets_stablecoins` | Stablecoin market data |
| `get_etf_flows` | `markets_etf_flows` | ETF fund flow data |

### Economics (5)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_economic_macro` | `economic_macro` | FRED macro signals |
| `get_economic_energy` | `economic_energy` | Energy prices and data |
| `get_bis_rates` | `economic_bis_rates` | BIS central bank policy rates |
| `get_bis_fx` | `economic_bis_fx` | BIS exchange rates |
| `get_bis_credit` | `economic_bis_credit` | BIS credit indicators |

### Trade (4)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_trade_flows` | `trade_flows` | International trade flow data |
| `get_trade_tariffs` | `trade_tariffs` | Tariff trends |
| `get_trade_restrictions` | `trade_restrictions` | Trade restrictions |
| `get_trade_barriers` | `trade_barriers` | Trade barriers |

### Supply Chain (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_shipping_rates` | `supply_chain_shipping` | Container shipping rates |
| `get_chokepoints` | `supply_chain_chokepoints` | Maritime chokepoint status |
| `get_critical_minerals` | `supply_chain_critical_minerals` | Critical mineral supply data |

### News & Intelligence (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_news_rss` | `news_rss` | Aggregated RSS news feeds |
| `get_news_telegram` | `news_telegram` | Telegram OSINT channel relay |
| `get_gdelt` | `intelligence_gdelt` | GDELT document search |

### Research (4)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_tech_events` | `research_tech_events` | Technology events and conferences |
| `get_arxiv` | `research_arxiv` | Recent arXiv papers |
| `get_trending_repos` | `research_trending_repos` | GitHub trending repositories |
| `get_hackernews` | `research_hackernews` | Hacker News top stories |

### Prediction Markets (2)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_predictions` | `predictions` | Polymarket prediction markets |
| `get_polymarket_intel` | `polymarket_intel` | Polymarket live trades and signals |

### Geolocation (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_geocode` | `geocode_place` | Place name to coordinates. **Required:** `query` |
| `get_geo_filters` | `geo_filters` | OSM geolocation filters |
| `get_satellite_snapshot` | `satellite_snapshot` | Satellite imagery URL generation |

### Humanitarian (3)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_displacement` | `displacement_summary` | UNHCR displacement data |
| `get_population_exposure` | `population_exposure` | WorldPop exposure estimates |
| `get_giving_summary` | `giving_summary` | Philanthropic giving data |

### Miscellaneous (4)

| Tool | Module ID | Description |
|------|-----------|-------------|
| `get_aviation_delays` | `aviation_delays` | Airport delay tracking |
| `get_positive_events` | `positive_events` | Positive geopolitical events |
| `get_risk_scores` | `intelligence_risk_scores` | Risk scoring by region |
| `get_pizzint` | `intelligence_pizzint` | PizzINT status monitor |

**Total: 53 granular tools + 4 aggregate tools = 57 tools**

## Tool Implementation Pattern

Each tool function is defined in its category module and registered via `@mcp.tool()`:

```python
@mcp.tool()
async def get_earthquakes(
    limit: int | None = None,
    bbox: str | None = None,
    format: str = "json",
) -> dict:
    """Get USGS earthquake data including magnitude, location, and depth."""
    return await client.query_module("seismology_earthquakes", {
        "limit": limit, "bbox": bbox, "format": format,
    })
```

Tool registration: each category file exposes a `register(mcp, client)` function. `tools/__init__.py` has `register_all_tools(mcp, client)` that imports and calls each.

## HTTP Client (`client.py`)

```python
class HeadlessClient:
    def __init__(self, base_url: str, timeout: float):
        self._client = httpx.AsyncClient(base_url=base_url, timeout=timeout)

    async def query_module(self, module_id: str, params: dict) -> dict:
        """Query a single module. Returns the module's data extracted from modules.<id>"""

    async def query_modules(self, module_ids: list[str], params: dict) -> dict:
        """Query multiple modules. Returns {module_id: data} dict."""

    async def health(self) -> dict:
        """GET /api/version — returns version info or error."""
```

- `query_module` calls `GET /api/headless?module={id}&{params}` and extracts `response["modules"][id]`
- `query_modules` calls `GET /api/headless?modules={csv}&{params}` and returns the full `response["modules"]` dict
- None-valued params are stripped before building the query string

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `HEADLESS_BASE_URL` | `http://127.0.0.1:3000` | Base URL of worldosint-headless instance |
| `HEADLESS_TIMEOUT` | `60` | HTTP request timeout in seconds |

## Error Handling

- Headless server unreachable: `{"error": "Headless server unreachable at <url>"}`
- HTTP error from headless: `{"error": "HTTP <status>", "detail": "<body>"}`
- Timeout: `{"error": "Request timed out after <n>s", "module": "<id>"}`
- Module-level error in response: pass through as-is from headless API

No retry logic. External OSINT sources are cached server-side by the headless API (300s TTL). Retries at the MCP layer would be redundant.

## MCP Server Configuration (for clients)

```json
{
  "mcpServers": {
    "osint": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/osint-mcp", "osint-mcp"],
      "env": {
        "HEADLESS_BASE_URL": "http://127.0.0.1:3000"
      }
    }
  }
}
```

## Authentication (SSE mode)

When running in SSE mode over a network, the server requires a bearer token:
- Set `OSINT_MCP_API_KEY` env var on the server
- Clients pass `Authorization: Bearer <key>` header
- If `OSINT_MCP_API_KEY` is not set, auth is disabled (local dev convenience)
- Stdio mode never requires auth (the transport is the trust boundary)

## Out of Scope

- WebSocket/streaming support
- Frontend, UI, or dashboard
- Bundling/managing the headless server process
- Retry/backoff logic (headless server handles caching)
