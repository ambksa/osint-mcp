# osint-mcp

Open-source intelligence (OSINT) platform for AI agents. **95 MCP tools** querying **50+ live data sources** — aircraft tracking, cyber threats, GDELT events, sanctions, news, satellites, BGP routing, and more.

Built on [worldosint-headless](https://github.com/koala73/worldmonitor) + [FastMCP](https://github.com/jlowin/fastmcp).

## What it does

Ask an AI agent a question, it calls the right OSINT tool:

| Question | Tool | Data |
|----------|------|------|
| "planes over Dubai" | `get_aircraft` | FlightRadar24 — 400+ aircraft with routes |
| "sanctions on Iran" | `get_opensanctions` | 78K entities from 40+ lists |
| "is this IP malicious" | `get_greynoise` | Scanner/bot/benign classification |
| "who owns example.com" | `get_whois` | RDAP registration, nameservers |
| "GDP data for US" | `get_imf_datasets` | 9 key indicators with time series |
| "military satellites" | `get_satellites` | CelesTrak orbit data |
| "MITRE technique T1566" | `get_mitre_attack` | ATT&CK techniques, groups, malware |
| "cyber threats" | `get_cisa_kev` | Actively exploited CVEs |
| "earthquakes" | `get_earthquakes` | USGS real-time data |
| "internet status Iran" | `get_ioda_outages` | BGP + Google Traffic + probing signals |

All tools support `search` (text filter) and `filter` (JSON field queries like `'{"magnitude": ">5"}'`).

## Quick Start

### Prerequisites

- Node.js 18+ (server)
- Python 3.11+ and [uv](https://docs.astral.sh/uv/) (MCP)

### Install & Run

```bash
git clone https://github.com/ambksa/osint-mcp.git
cd osint-mcp

# 1. Start the OSINT server
cd server
npm install
PORT=3000 node --import tsx server.mjs &

# 2. Start the MCP server
cd ../mcp
uv sync
uv run osint-mcp
```

### Docker

```bash
docker compose up
# MCP at http://localhost:8080/mcp
```

## Connect to AI Agents

### Claude Code

```bash
claude mcp add osint -- uv run --directory /path/to/osint-mcp/mcp osint-mcp
```

Or add to `.mcp.json`:
```json
{
  "mcpServers": {
    "osint": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/osint-mcp/mcp", "osint-mcp"],
      "env": { "HEADLESS_BASE_URL": "http://127.0.0.1:3000" }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "osint": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/osint-mcp/mcp", "osint-mcp"],
      "env": { "HEADLESS_BASE_URL": "http://127.0.0.1:3000" }
    }
  }
}
```

### SSE / Network Mode

```bash
uv run osint-mcp --transport sse --host 0.0.0.0 --port 8080
# Connect any MCP client to http://localhost:8080/mcp
```

### Python

```python
import asyncio
from fastmcp import Client

async def main():
    async with Client("http://localhost:8080/mcp") as client:
        result = await client.call_tool("get_earthquakes", {"limit": 5})
        print(result.data)

asyncio.run(main())
```

## Tools (95)

### Aircraft (1)
| Tool | Description |
|------|-------------|
| `get_aircraft` | FlightRadar24 — 400+ aircraft/region, origin→destination routes, military auto-tagged. 14 filter params (callsign, type, altitude, squawk, military, etc.) |

### Cyber Threat Intelligence (8)
| Tool | Description |
|------|-------------|
| `get_cyber_threats` | Feodo C2 server IOCs |
| `get_cisa_kev` | CISA actively exploited CVEs |
| `get_ransomware` | RansomLook victim posts |
| `get_threatfox` | abuse.ch malware IOCs |
| `get_urlhaus_urls` | Malware distribution URLs |
| `get_nvd_cves` | NIST NVD vulnerability search with CVSS |
| `get_greynoise` | IP reputation — scanner/bot/benign (free, no key) |
| `get_cyber_news` | Krebs, Dark Reading, BleepingComputer, Ars Technica |

### Network Investigation (5)
| Tool | Description |
|------|-------------|
| `get_whois` | RDAP domain/IP lookup |
| `get_certificates` | crt.sh certificate transparency |
| `get_bgp` | RIPEstat BGP routing, AS info |
| `get_mitre_attack` | ATT&CK techniques, groups, malware |
| `get_intelx` | Dark web/paste/leak search (requires key) |

### Sanctions & Financial Crime (3)
| Tool | Description |
|------|-------------|
| `get_sanctions` | OFAC SDN list |
| `get_opensanctions` | 78K entities from 40+ sanctions lists |
| `get_offshore_leaks` | ICIJ Panama/Paradise/Pandora Papers |

### News & Intelligence (12)
| Tool | Description | Sources |
|------|-------------|---------|
| `get_news_rss` | General world news | BBC, Reuters, AP, NPR, France 24 |
| `get_security_intel_feeds` | OSINT & conflict analysis | Bellingcat, Crisis Group, War on the Rocks, Oryx, Foreign Policy |
| `get_defense_military_feeds` | Military & defense | Defense News, Military Times, USNI, UK MOD, War Zone |
| `get_cyber_news` | Cybersecurity | Krebs, Dark Reading, BleepingComputer |
| `get_maritime_news` | Shipping & naval | gCaptain, maritime news |
| `get_policy_feeds` | Think tank analysis | CSIS, Brookings, Carnegie, Chatham House |
| `get_regional_conflict_feeds` | Regional hotspots | BBC ME/Africa/Asia, Sahel, InSight Crime |
| `get_energy_commodities_news` | Energy & mining | Oil/OPEC, LNG, metals |
| `get_gdelt_events` | Structured global events | GDELT bulk (1500/15min, no rate limit) |
| `get_news_velocity` | Article frequency anomaly | RSS analysis |
| `get_aviation_news` | Aviation industry | 4 feeds |
| `get_defense_news` | Defense (legacy) | 4 feeds |

### Natural Events & Weather (8)
| Tool | Description |
|------|-------------|
| `get_earthquakes` | USGS data |
| `get_natural_events` | NASA EONET (volcanoes, storms, floods) |
| `get_disaster_alerts` | GDACS global alerts |
| `get_weather_alerts` | NWS US severe weather |
| `get_tropical_weather` | NOAA NHC cyclones |
| `get_climate_anomalies` | NOAA/ERA5 |
| `get_space_weather` | Solar flares, geomagnetic storms |
| `get_civil_defense_alerts` | WMO CAP — 95+ countries |

### Economics (9)
| Tool | Description |
|------|-------------|
| `get_imf_datasets` | 9 key indicators per country (GDP, inflation, debt, etc.) |
| `get_economic_macro` | FRED signals |
| `get_bis_rates` | Central bank rates (11 economies) |
| `get_bis_fx` | Exchange rates |
| `get_us_spending` | USASpending.gov |
| `get_us_treasury` | Monthly Treasury Statement |
| `get_worldbank` | World Bank indicators |
| `get_imf_data` | IMF DataMapper single indicator |
| `get_trade_comtrade` | UN Comtrade trade flows |

### Military & Space (3)
| Tool | Description |
|------|-------------|
| `get_military_usni` | USNI Fleet tracker |
| `get_satellites` | CelesTrak orbits (military, GPS, Starlink) |
| `get_notams` | FAA NOTAMs (requires key) |

### Maritime & Supply Chain (5)
| Tool | Description |
|------|-------------|
| `get_chokepoints` | Suez, Panama, Hormuz, Malacca |
| `get_critical_minerals` | Lithium, cobalt, rare earths |
| `get_submarine_cables` | 700+ undersea cables |
| `get_ais_vessels` | Live ship positions (requires key) |
| `get_maritime_news` | gCaptain, shipping news |

### Intelligence & Risk (4)
| Tool | Description |
|------|-------------|
| `intelligence_report` | Full report from 14+ modules |
| `get_intelligence_findings` | Prioritized alerts from 11 sources |
| `get_country_risk_signals` | Raw evidence from 9 feeds, 72 countries |
| `get_gdelt_events` | 1500 structured events/15min |

### Other (19)
Markets (4), geolocation (3), humanitarian (3), infrastructure (4), enrichment (6), aviation, radiation, Telegram, tariffs, conflict (ACLED), Tor exit nodes, PizzINT.

See [OSINT_MCP_TOOLS.md](OSINT_MCP_TOOLS.md) for the complete reference.

## API Keys (optional)

82 tools work without any API keys. 13 tools need free keys for enhanced data:

| Key | Tools | Get it at |
|-----|-------|-----------|
| `FRED_API_KEY` | `get_fred_series` | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `FMP_API_KEY` | `get_fmp_*` (4 tools) | [financialmodelingprep.com](https://site.financialmodelingprep.com/developer) |
| `ACLED_ACCESS_TOKEN` | `get_acled_conflicts` | [acleddata.com](https://acleddata.com/register/) |
| `AISSTREAM_API_KEY` | `get_ais_vessels` | [aisstream.io](https://aisstream.io/apikeys) |
| `INTELX_API_KEY` | `get_intelx` | [intelx.io](https://intelx.io/signup) |
| `FAA_NOTAM_API_KEY` | `get_notams` | [api.faa.gov](https://api.faa.gov/) |
| `GREYNOISE_API_KEY` | `get_greynoise` (enterprise) | [greynoise.io](https://viz.greynoise.io/signup) |

Add to `server/.env`:
```bash
cp server/.env.example server/.env
# Edit and add your keys
```

## Adding New Data Sources

Drop a `.mjs` file in `server/api/modules/`:

```javascript
// server/api/modules/my_feed.mjs
export const name = 'my_feed';
export const description = 'My custom data source';

export async function run(_ctx, params) {
  const query = params.query || '';
  const resp = await fetch(`https://api.example.com/data?q=${query}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}
```

Then add to the curated registry in `mcp/src/osint_mcp/tools/__init__.py`:

```python
{
    "tool_name": "get_my_feed",
    "module_id": "my_feed",
    "description": "My custom data source. Query with keyword.",
    "required_params": {"query": str},
},
```

Restart server. The tool appears in MCP with `search` and `filter` support automatically.

## Architecture

```
AI Agent (Claude, GPT, Gemini, etc.)
    ↓ MCP Protocol (stdio or SSE)
mcp/ (Python FastMCP server)
    ↓ HTTP
server/ (Node.js headless OSINT server)
    ├── api/headless.js (core modules)
    ├── api/modules/*.mjs (31 plugin modules)
    └── 50+ upstream APIs (USGS, GDELT, FR24, CISA, abuse.ch, ...)
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `HEADLESS_BASE_URL` | `http://127.0.0.1:3000` | OSINT server URL |
| `HEADLESS_TIMEOUT` | `60` | Request timeout (seconds) |
| `OSINT_MCP_API_KEY` | (unset) | Bearer token for SSE auth |
| `PORT` | `3000` | Server port |

## Documentation

- [OSINT_MCP_TOOLS.md](OSINT_MCP_TOOLS.md) — complete 95-tool reference
- [AGENT_PROMPT.md](AGENT_PROMPT.md) — system prompt for AI agents
- [BLOG_POST.md](BLOG_POST.md) — project introduction
- [COMPARISON.md](COMPARISON.md) — vs WorldMonitor headless
- [skill/osint/SKILL.md](skill/osint/SKILL.md) — Claude Code skill

## License

See individual component licenses. Built on [worldosint-headless](https://github.com/koala73/worldmonitor) (AGPL-3.0).
