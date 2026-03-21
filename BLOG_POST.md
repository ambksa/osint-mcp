# Building an OSINT Intelligence Platform for AI Agents

**How we turned 45+ open data sources into 81 MCP tools that any AI agent can query in real-time.**

---

## The Problem

Open-source intelligence (OSINT) data is scattered across dozens of APIs, RSS feeds, and government databases. An analyst tracking a geopolitical situation needs to check USGS for earthquakes, GDELT for events, FlightRadar24 for aircraft, CISA for cyber threats, OFAC for sanctions, and 40 more sources — each with different APIs, auth requirements, and data formats.

AI agents could do this work, but they need a unified interface. That's what osint-mcp is: a Model Context Protocol (MCP) server that wraps 45+ live data sources into 81 curated tools, queryable by any AI agent in natural language.

## What It Does

Ask an agent "what's happening over UAE right now" and it can:

1. **Pull 39 aircraft** over UAE airspace from FlightRadar24 — with origin/destination routes, military tagging, altitude, speed
2. **Fetch 333 GDELT events** mentioning Iran from the last 15 minutes — structured with actors, conflict/cooperation codes, Goldstein stability scores
3. **Check the Level 3 travel advisory** from the US State Department
4. **Search 78,000 sanctioned entities** across 40+ global sanctions lists
5. **Monitor internet infrastructure** — Iran showing 92% Google traffic drop while BGP routes stay stable (throttling, not shutdown)
6. **Read defense analysis** from Bellingcat, War on the Rocks, CSIS, and 50+ RSS sources

All from one MCP server. No API keys required for core functionality.

## Architecture

```
AI Agent (Claude, GPT, Hermes, etc.)
    ↓ MCP Protocol
osint-mcp (Python FastMCP server)
    ↓ HTTP
worldosint-headless (Node.js, 110+ modules)
    ↓ 45+ upstream APIs
USGS, GDELT, FlightRadar24, CISA, abuse.ch, BIS, IMF, ...
```

**Three layers:**
- **MCP tools** — curated interface with typed parameters, universal search/filter, agent-optimized descriptions
- **Headless server** — module registry, caching (5-min TTL), parallel execution, RSS proxy
- **Plugin system** — drop a `.mjs` file in `server/api/modules/`, auto-discovered by MCP

## The 81 Tools

Organized by domain:

| Category | Tools | Key Sources |
|----------|-------|-------------|
| **Aircraft** | 1 | FlightRadar24 (400+ aircraft/region, routes, military tagging) |
| **Cyber** | 7 | CISA KEV, ThreatFox, RansomLook, URLhaus, NVD, Feodo, Krebs/HackerNews |
| **Natural Events** | 8 | USGS, NASA EONET, GDACS, NOAA NHC/NWS/SWPC, WMO CAP (95+ countries) |
| **News** | 11 | 55+ RSS sources across 7 thematic categories (general, security, defense, cyber, maritime, policy, regional) |
| **Economics** | 9 | FRED, BIS, IMF, World Bank, UN Comtrade, US Treasury |
| **Security** | 6 | OFAC, OpenSanctions (78K entities), travel/health/embassy advisories |
| **Intelligence** | 3 | GDELT bulk events, country risk signals, intelligence findings (alert fusion) |
| **Infrastructure** | 4 | IODA internet monitoring, submarine cables, service status |
| **Military** | 1 | USNI Fleet tracker |
| **Other** | 31 | Geolocation, humanitarian, research, enrichment, supply chain, financial |

Every tool accepts `search` (text search across all fields) and `filter` (JSON field-level queries like `'{"magnitude": ">5"}'`).

## Key Design Decisions

### Agent-first, not dashboard-first

We don't compute scores or make judgments. The `get_country_risk_signals` tool returns raw evidence — news headlines, defense articles, travel advisory level, embassy alerts, disaster events — and lets the agent reason about it. An agent asking about UAE risk gets:

```json
{
  "travelAdvisory": { "level": 3, "levelText": "Reconsider Travel" },
  "newsHeadlines": 2,
  "threatKeywords": ["strike", "war"],
  "defenseArticles": 1,
  "disasterEvents": 0
}
```

No score. The agent decides what this means in context.

### Plugin extensibility

Adding a new data source is one file:

```javascript
// server/api/modules/my_feed.mjs
export const name = 'my_feed';
export const description = 'My custom OSINT source';
export async function run(_ctx, params) {
  const resp = await fetch('https://api.example.com/data');
  return await resp.json();
}
```

Drop it in the directory, restart the server. The MCP server discovers it automatically and exposes it as a tool with search/filter support.

### Thematic news organization

Instead of one mega-feed with 400 RSS items, we organized feeds into 7 categories:

- **General**: BBC, Reuters, AP, CNN, Guardian (198 items)
- **Security Intel**: Bellingcat, Crisis Group, War on the Rocks, Oryx, Jamestown (60 items)
- **Defense**: Defense News, Military Times, USNI, UK MOD, War Zone (80 items)
- **Cyber**: Krebs, Hacker News, BleepingComputer (20 items)
- **Maritime**: gCaptain, shipping/chokepoint news (42 items)
- **Policy**: CSIS, Brookings, Carnegie, Chatham House, MEI (64 items)
- **Regional**: BBC Middle East/Africa/Asia, Sahel, InSight Crime (80 items)

An agent doing a military brief queries `get_defense_military_feeds`. One doing economic analysis queries `get_policy_feeds`. Full sweep queries all of them.

### GDELT without rate limits

The GDELT Doc API limits to 1 request per 5 seconds and returns 429s constantly. We built `get_gdelt_events` which downloads the 15-minute bulk export files directly from `data.gdeltproject.org` — no rate limits, 1,500 structured events per window with CAMEO codes, Goldstein stability scores, actor information, and coordinates. Cached in memory, refreshed every 14 minutes.

### Aircraft tracking that works

ADSB.fi has almost no receivers in the Gulf — 28 aircraft where FlightRadar24 sees 400. We use FR24's public feed with military auto-tagging (callsign prefix matching for REACH, RAF, NAVY, etc.) and 14 filter parameters (callsign, registration, aircraft type, squawk, altitude range, military flag, on-ground status).

## What's Real vs What's Marketing

**Works well:**
- Aircraft tracking (FR24, 400+/region with routes)
- Cyber threat intelligence (7 tools, real IOCs)
- News aggregation (55+ sources, thematic)
- GDELT events (bulk, no rate limits, 1500/15min)
- Sanctions search (78K entities from 40+ lists)
- Natural disaster/weather alerts
- Universal search/filter on every tool

**Works but limited:**
- Internet outage detection (IODA signals present but interpretation needed)
- Trade data (UN Comtrade preview mode, limited to 500 records without key)
- Tariff data (WITS SDMX API is slow and unreliable)
- Country risk signals (depends on news volume — quiet countries have thin signals)

**Doesn't work (upstream APIs dead):**
- ACLED conflict tracking (API broken)
- Maritime AIS vessel tracking (no feed connected)
- Polymarket prediction markets (502 errors)
- NASA FIRMS wildfire detection (returns 0)
- WTO trade modules (upstream unavailable)

## Running It

```bash
# Docker
docker compose up
# MCP at http://localhost:8080/mcp

# Local
cd server && npm install && PORT=3000 node --import tsx server.mjs &
cd mcp && uv sync && uv run osint-mcp

# Connect to Claude Code
claude mcp add osint -- uv run --directory /path/to/osint-mcp/mcp osint-mcp
```

## What's Next

- **Maritime AIS tracking** — AISStream.io WebSocket integration for vessel positions
- **Shodan/GreyNoise** — internet scanning and mass scanner detection
- **NOTAMs** — aviation notices via FAA API
- **More RSS feeds** — WorldMonitor has 425, we use 55
- **Conflict tracking replacement** — ACLED is dead, need alternative (GDELT events partially fills this)

## The Numbers

- **81 curated MCP tools**, 0 auto-discovered noise
- **45+ upstream data sources**, all free, most no-auth
- **55+ RSS sources** across 7 thematic categories
- **78,000 sanctioned entities** searchable instantly
- **1,500 GDELT events** refreshed every 15 minutes
- **400+ aircraft** per region with routes and military tagging
- **95+ countries** in civil defense alert system
- **5-minute cache TTL** on all modules, agent-overridable
- **20 plugin modules**, each a single `.mjs` file

---

*osint-mcp is open source at [github.com/ambksa/osint-mcp](https://github.com/ambksa/osint-mcp). Built on [worldosint-headless](https://github.com/koala73/worldmonitor) by Elie Habib.*
