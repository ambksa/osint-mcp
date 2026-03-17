# osint-mcp

MCP server exposing 57 OSINT tools for AI agents. Wraps [worldosint-headless](https://github.com/nativ3ai/worldosint-headless) as a [Model Context Protocol](https://modelcontextprotocol.io/) server using [FastMCP](https://github.com/jlowin/fastmcp).

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/ambksa/osint-mcp.git
cd osint-mcp
docker compose up
```

MCP server available at `http://localhost:8080/mcp`

### Local Development

```bash
git clone https://github.com/ambksa/osint-mcp.git
cd osint-mcp

# Start the headless OSINT server
cd server
npm install
PORT=3000 node --import tsx server.mjs &

# Start the MCP server (stdio mode for local use)
cd ../mcp
uv sync
uv run osint-mcp

# Or SSE mode for network access
uv run osint-mcp --transport sse --host 0.0.0.0 --port 8080
```

## Connecting to AI Agents

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

**Docker (SSE):**
```json
{
  "mcpServers": {
    "osint": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**Local (stdio):**
```json
{
  "mcpServers": {
    "osint": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/osint-mcp/mcp", "osint-mcp"],
      "env": {
        "HEADLESS_BASE_URL": "http://127.0.0.1:3000"
      }
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "osint": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/osint-mcp/mcp", "osint-mcp"],
      "env": {
        "HEADLESS_BASE_URL": "http://127.0.0.1:3000"
      }
    }
  }
}
```

### Cursor / Windsurf / Other MCP Clients

Any MCP-compatible client can connect via:
- **stdio**: `uv run --directory /path/to/osint-mcp/mcp osint-mcp`
- **SSE**: `http://localhost:8080/mcp` (when running in SSE mode or via Docker)

### Python (programmatic)

```python
import asyncio
from fastmcp import Client

async def main():
    async with Client("http://localhost:8080/mcp") as client:
        # List available tools
        tools = await client.list_tools()
        for t in tools:
            print(f"{t.name}: {t.description}")

        # Call a tool
        result = await client.call_tool("get_earthquakes", {"limit": 5})
        print(result.data)

        # Read a resource
        data = await client.read_resource("osint://earthquakes")
        print(data)

asyncio.run(main())
```

## Available Tools (57)

### Aggregate (4)
| Tool | Description |
|------|-------------|
| `health_check` | Verify connectivity to the headless server |
| `list_modules` | List all available OSINT module IDs |
| `query_modules` | Query arbitrary modules by comma-separated IDs |
| `get_intelligence_summary` | Synthesized risk summary across all domains |

### Conflict & Unrest (4)
| Tool | Description |
|------|-------------|
| `get_conflict_acled` | Armed conflict events from ACLED |
| `get_conflict_ucdp` | UCDP conflict events |
| `get_conflict_hapi` | HDX HAPI humanitarian conflict summary |
| `get_unrest_events` | Protest and civil unrest events |

### Maritime (2)
| Tool | Description |
|------|-------------|
| `get_maritime_warnings` | Active navigational warnings |
| `get_maritime_snapshot` | AIS vessel position snapshot |

### Military (3)
| Tool | Description |
|------|-------------|
| `get_military_flights` | Military aircraft tracking (requires `bbox`) |
| `get_military_posture` | Theater posture summary |
| `get_military_usni` | USNI Fleet tracker report |

### Cyber (1)
| Tool | Description |
|------|-------------|
| `get_cyber_threats` | Cyber threat IOCs and alerts |

### Infrastructure (4)
| Tool | Description |
|------|-------------|
| `get_infrastructure_outages` | Internet outage events |
| `get_infrastructure_cable_health` | Undersea cable status |
| `get_infrastructure_baseline` | Temporal baseline metrics |
| `get_infrastructure_services` | Service availability checks |

### Natural Events (3)
| Tool | Description |
|------|-------------|
| `get_earthquakes` | USGS earthquake data |
| `get_wildfires` | NASA FIRMS fire detections |
| `get_climate_anomalies` | Climate anomaly tracking |

### Markets (5)
| Tool | Description |
|------|-------------|
| `get_markets` | Stock/index quotes |
| `get_crypto` | Cryptocurrency quotes |
| `get_commodities` | Commodity prices |
| `get_stablecoins` | Stablecoin market data |
| `get_etf_flows` | ETF fund flow data |

### Economics (5)
| Tool | Description |
|------|-------------|
| `get_economic_macro` | FRED macro economic signals |
| `get_economic_energy` | Energy prices and data |
| `get_bis_rates` | BIS central bank policy rates |
| `get_bis_fx` | BIS exchange rates |
| `get_bis_credit` | BIS credit indicators |

### Trade (4)
| Tool | Description |
|------|-------------|
| `get_trade_flows` | International trade flow data |
| `get_trade_tariffs` | Tariff trends |
| `get_trade_restrictions` | Trade restrictions |
| `get_trade_barriers` | Trade barriers |

### Supply Chain (3)
| Tool | Description |
|------|-------------|
| `get_shipping_rates` | Container shipping rates |
| `get_chokepoints` | Maritime chokepoint status |
| `get_critical_minerals` | Critical mineral supply data |

### News & Intelligence (3)
| Tool | Description |
|------|-------------|
| `get_news_rss` | Aggregated RSS news feeds |
| `get_news_telegram` | Telegram OSINT channel relay |
| `get_gdelt` | GDELT document search |

### Research (4)
| Tool | Description |
|------|-------------|
| `get_tech_events` | Technology events and conferences |
| `get_arxiv` | Recent arXiv papers |
| `get_trending_repos` | GitHub trending repositories |
| `get_hackernews` | Hacker News top stories |

### Prediction Markets (2)
| Tool | Description |
|------|-------------|
| `get_predictions` | Polymarket prediction markets |
| `get_polymarket_intel` | Polymarket live trades and signals |

### Geolocation (3)
| Tool | Description |
|------|-------------|
| `get_geocode` | Place name to coordinates (requires `query`) |
| `get_geo_filters` | OSM geolocation filters |
| `get_satellite_snapshot` | Satellite imagery URL generation |

### Humanitarian (3)
| Tool | Description |
|------|-------------|
| `get_displacement` | UNHCR displacement data |
| `get_population_exposure` | WorldPop exposure estimates |
| `get_giving_summary` | Philanthropic giving data |

### Miscellaneous (4)
| Tool | Description |
|------|-------------|
| `get_aviation_delays` | Airport delay tracking |
| `get_positive_events` | Positive geopolitical events |
| `get_risk_scores` | Risk scoring by region |
| `get_pizzint` | PizzINT status monitor |

## MCP Resources

Static resources and templates for browsable data access:

| Resource URI | Description |
|-------------|-------------|
| `osint://earthquakes` | USGS earthquake data |
| `osint://wildfires` | NASA FIRMS fire detections |
| `osint://climate` | Climate anomaly data |
| `osint://conflict/{source}` | Conflict data (acled, ucdp, hapi) |
| `osint://maritime/{type}` | Maritime data (warnings, snapshot) |
| `osint://military/{type}` | Military data (flights, posture, usni) |

## Tool Parameters

Every tool accepts these optional parameters:
- `format` — `"json"` (default), `"md"`, or `"both"`
- `limit` — Max results to return
- `bbox` — Bounding box filter (lat/lon)

Some tools have required parameters:
- `get_geocode` requires `query: str`
- `get_military_flights` requires `bbox: str`

## Extensibility

Adding a new OSINT module from the headless server = adding one dict entry to `TOOL_REGISTRY` in `mcp/src/osint_mcp/tools/__init__.py`:

```python
{
    "tool_name": "get_new_module",
    "module_id": "new_module_id",
    "description": "Description for agents.",
},
```

No new functions or wiring needed. The `query_modules` tool also works as a generic escape hatch for any module not yet in the registry.

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `HEADLESS_BASE_URL` | `http://127.0.0.1:3000` | URL of the headless OSINT server |
| `HEADLESS_TIMEOUT` | `60` | HTTP request timeout in seconds |
| `OSINT_MCP_API_KEY` | (unset) | Bearer token for SSE mode auth |

## Architecture

```
mcp/                        server/
├── src/osint_mcp/          ├── api/headless.js (48+ OSINT modules)
│   ├── server.py           ├── server.mjs
│   ├── client.py           └── Dockerfile
│   ├── resources.py
│   └── tools/
│       ├── __init__.py     ← declarative tool registry
│       └── aggregate.py
├── pyproject.toml
└── Dockerfile

Agent → MCP Client → osint-mcp (FastMCP) → httpx → headless server → External OSINT APIs
```

## License

See individual component licenses.
