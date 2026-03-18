---
name: osint
description: OSINT intelligence gathering and analysis using MCP tools covering cyber, natural events, military, news, economics, supply chain, research, geolocation, humanitarian, health, and risk data. Use when the user asks about geopolitical events, threat assessments, regional situations, economic conditions, market data, cyber threats, natural disasters, or any intelligence analysis task.
---

# OSINT Intelligence

This skill provides access to 64 real-time OSINT tools and 6 browsable resources via the osint-mcp server. The tools query live data from USGS, NASA, BIS, GDELT, UNHCR, CoinGecko, CISA, abuse.ch, FRED, FMP, and 30+ other sources. Five financial tools (FRED, FMP) require API keys — see "API-key-dependent tools" section.

## Tool access

Tools are available as MCP tools prefixed with `mcp__osint__`. Call them directly.

If MCP tools are not available, use the CLI fallback:
```bash
cd /path/to/osint-mcp/mcp && uv run python3 -c "
import asyncio, json
from fastmcp import Client
from osint_mcp.server import _build_server
async def q():
    mcp = _build_server()
    async with Client(mcp) as c:
        r = await c.call_tool('TOOL_NAME', {PARAMS})
        print(json.dumps(r.data, indent=2))
asyncio.run(q())
"
```

## First checks

Before first use or when failures occur, verify connectivity:

1. Call `health_check` — should return `{"ok": true}`
2. If it returns `"Headless server unreachable"`, the OSINT server is not running
3. Call `list_modules` to see all available data sources

Do not claim data was gathered if health_check fails. Say the OSINT server needs to be started.

## Default behavior

- Use `format: "json"` unless the user asks for markdown
- Start with the minimum tools needed, add more if the user wants depth
- Always call `health_check` first if you haven't verified connectivity in this session
- When geocoding is needed, call `get_geocode` first to get coordinates, then use `bbox` param on other tools

## Analysis workflows

### Quick Scan — "what's happening right now"

When the user asks a general "what's going on" question:

1. `get_intelligence_summary` — synthesized risk scores across all domains
2. `get_news_rss` — latest headlines
3. `get_cyber_threats` — active IOCs and alerts
4. `get_earthquakes` — recent seismic activity

Present: top risk regions, breaking news, active threats, significant natural events.

### Intelligence Report — "intelligence report on [place]" / "OSINT on [place]" / "intel on [place]"

**USE THE COMPOSITE TOOL — ONE CALL, NOT MANY.** Call `intelligence_report` once:

```
intelligence_report(query="Dubai", keywords="Dubai,UAE,Hormuz,Emirates,Abu Dhabi,Gulf")
```

This single call queries 14 modules in parallel, filters results by keywords server-side, and returns only region-relevant data in ~3 seconds. Do NOT call individual tools separately — the composite tool does this for you with filtering.

How to build keywords: place name + country + nearby strategic features + relevant actors.
- Dubai → "Dubai,UAE,Hormuz,Emirates,Abu Dhabi,Gulf"
- Ukraine → "Ukraine,Kyiv,Crimea,Donbas,Zelensky,Russia"
- Taiwan → "Taiwan,Taipei,China,PLA,strait"

Present the results as a structured intelligence report with these sections:
- **Security & Geopolitical Risk**: risk scores, military posture
- **Maritime & Logistics**: chokepoint status, shipping
- **Aviation & Travel**: airport delays, airspace status from news
- **Economic Signals**: macro data, market sentiment, trade impact
- **Cyber & Infrastructure**: threats, outages
- **Humanitarian**: displacement, population exposure

### Threat Briefing — "threat briefing for [region/topic]"

For regional or topical threat assessment:

1. `get_geocode` with the region name → get coordinates
2. `get_intelligence_summary` — overall risk scores
3. `get_cyber_threats` — cyber IOCs
4. `get_news_rss` — relevant headlines
5. `get_military_usni` — fleet positions

Present: risk score for region, cyber threats, military posture, supporting news. Separate confirmed events from assessments.

### Maritime Situation — "maritime situation" / "chokepoints" / "shipping"

1. `get_chokepoints` — all 6 major chokepoint statuses
2. `get_submarine_cables` — undersea cable infrastructure
3. `get_news_rss` — maritime-relevant headlines

Present: chokepoint status table (name, status, disruption score), cable health, relevant news.

### Economic Outlook — "economic outlook" / "markets" / "economy"

1. `get_economic_macro` — FRED macro signals (GDP, unemployment, inflation)
2. `get_bis_rates` — central bank policy rates
3. `get_bis_fx` — exchange rates
4. `get_crypto` — cryptocurrency prices
5. `get_stablecoins` — stablecoin market health
6. `get_fear_greed` — market sentiment
7. `get_us_treasury` — federal receipts/outlays

Present: macro verdict (bullish/bearish/neutral), key rates, market summary, sentiment.

### Regional SITREP — "situation report for [place]" / "SITREP [place]"

Full situational awareness for a geographic area:

1. `get_geocode` with place name → coordinates + bbox
2. `get_intelligence_summary` — risk scores
3. `get_earthquakes` with bbox — local seismic
4. `get_climate_anomalies` — climate data
5. `get_displacement` — refugee/displacement data
6. `get_population_exposure` — population at risk
7. `get_infrastructure_outages` — internet outages
8. `get_news_rss` — relevant headlines

Present as a structured SITREP:
- **Situation**: location, population, risk score
- **Natural hazards**: earthquakes, climate
- **Humanitarian**: displacement, population exposure
- **Infrastructure**: outages
- **Assessment**: overall threat level with supporting evidence

### Supply Chain Risk — "supply chain" / "critical minerals"

1. `get_chokepoints` — maritime chokepoint status
2. `get_critical_minerals` — mineral supply data
3. `get_submarine_cables` — undersea cable infrastructure

Present: chokepoint disruptions, mineral supply risks, cable infrastructure status.

### Research Digest — "what's trending in tech" / "research"

1. `get_arxiv` — recent papers
2. `get_hackernews` — HN top stories
3. `get_tech_events` — upcoming conferences

Present: top papers by topic, HN discussion themes, upcoming events.

### Military Posture — "military situation"

1. `get_military_usni` — USNI fleet tracker
2. `get_aircraft_mil` with bbox — live aircraft tracking (ADSB.fi, unfiltered, includes military with auto-tagging)
3. `get_aircraft` with bbox — OpenSky ADS-B (backup, broader coverage)
4. `get_defense_news` — defense headlines

Present: fleet positions, aircraft activity (highlight military-tagged aircraft), defense news.

**Military aircraft tracking tips:**
- Use `get_aircraft_mil` with bbox for area searches — it auto-tags military callsigns (REACH, RAF, NAVY, etc.)
- Use `military=true` param to filter to military-only results
- Common military callsign prefixes: REACH (USAF transport), RCH (same), DUKE, KING, NAVY, RAF, FORTE (Global Hawk)
- Use lat/lon/dist params for precise geographic searches

### Humanitarian Assessment — "humanitarian situation in [place]"

1. `get_geocode` with place → coordinates
2. `get_displacement` — UNHCR displacement data
3. `get_population_exposure` — population at risk
4. `get_giving_summary` — philanthropic giving trends
5. `get_health_advisories` — disease outbreaks

Present: displacement numbers, population exposure, humanitarian access, giving trends.

## Multi-module queries

For custom combinations, use `query_modules` with comma-separated module IDs:

```
query_modules(modules="seismology_earthquakes,cyber_threats,news_rss")
```

This returns all three in one call. Use `list_modules` to discover all available module IDs.

## Tool reference

### Required parameters

These tools REQUIRE specific parameters — they will error without them:
- `get_geocode` requires `query` — the place name to geocode
- `get_satellite_search` requires `bbox` — bounding box coordinates
- `get_worldbank` requires `query` (country code) + `indicator`
- `get_imf_data` requires `query` (country code) + `indicator`
- `get_sanctions` requires `query` — name, country, or program
- `get_travel_advisories` requires `query` — country name
- `get_country_facts` requires `query` — country name or ISO code
- `get_gdelt` requires `query` — search keywords
- `get_arxiv` requires `query` — topic keywords
- `get_sec_filings` requires `query` — company name or ticker
- `get_github_activity` requires `query` — org name
- `get_hn_search` requires `query` — search term
- `get_aircraft` requires `query` — callsign/country or use bbox
- `get_aircraft_mil` requires `query` — callsign/hex, or use bbox with lat/lon/dist params. Set `military=true` for mil-only
- `get_submarine_cables` requires `query` — name, owner, or region
- `get_cisa_kev` requires `query` — vendor, product, or CVE ID
- `get_fred_series` requires `query` — FRED series ID (e.g. 'UNRATE', 'GDP')
- `get_fmp_quote` requires `query` — stock ticker (e.g. 'AAPL')
- `get_fmp_profile` requires `query` — stock ticker
- `get_fmp_ratios` requires `query` — stock ticker
- `get_fmp_estimates` requires `query` — stock ticker

### Common optional parameters

Every tool accepts:
- `format` — `"json"` (default), `"md"` (markdown), `"both"`
- `limit` — max results
- `bbox` — geographic bounding box filter

### All tools by category

**Aggregate**: health_check, list_modules, query_modules, get_intelligence_summary, intelligence_report
**Military**: get_military_usni
**Cyber**: get_cyber_threats, get_cisa_kev, get_ransomware, get_threatfox
**Infrastructure**: get_infrastructure_outages, get_infrastructure_services
**Natural Events**: get_earthquakes, get_climate_anomalies, get_natural_events, get_disaster_alerts, get_tropical_weather, get_weather_alerts
**Crypto & Markets**: get_crypto, get_stablecoins, get_fear_greed, get_bitcoin_hashrate
**Economics**: get_economic_macro, get_bis_rates, get_bis_fx, get_us_spending, get_us_treasury, get_worldbank, get_imf_data
**Supply Chain**: get_chokepoints, get_critical_minerals
**News**: get_news_rss, get_gdelt, get_news_velocity, get_aviation_news, get_defense_news
**Research**: get_tech_events, get_arxiv, get_hackernews
**Geolocation**: get_geocode, get_satellite_snapshot, get_satellite_search
**Humanitarian**: get_displacement, get_population_exposure, get_giving_summary
**Security**: get_sanctions, get_travel_advisories, get_health_advisories, get_embassy_alerts, get_country_facts
**Radiation**: get_radiation_safecast
**Aviation**: get_aviation_delays
**Intelligence**: get_pizzint
**Enrichment**: get_sec_filings, get_github_activity, get_hn_search
**Real-Time**: get_aircraft, get_aircraft_mil, get_submarine_cables
**Financial (API key required)**: get_fred_series, get_fmp_quote, get_fmp_profile, get_fmp_ratios, get_fmp_estimates

### API-key-dependent tools

These tools require API keys set in the server's `.env` file. Without keys they return a clear error message.

| Tool | Key Required | Get it at |
|------|-------------|-----------|
| `get_fred_series` | `FRED_API_KEY` | https://fred.stlouisfed.org/docs/api/api_key.html (free) |
| `get_fmp_quote` | `FMP_API_KEY` | https://site.financialmodelingprep.com/developer (free tier) |
| `get_fmp_profile` | `FMP_API_KEY` | (same) |
| `get_fmp_ratios` | `FMP_API_KEY` | (same) |
| `get_fmp_estimates` | `FMP_API_KEY` | (same) |

**FRED tools** — query is a FRED series ID: `UNRATE` (unemployment), `GDP`, `CPIAUCSL` (CPI), `DFF` (fed funds rate), `T10Y2Y` (yield curve).

**FMP tools** — query is a stock ticker: `AAPL`, `MSFT`, `GOOGL`, `TSLA`, etc.

### Resources (browsable data)

- `osint://earthquakes` — USGS earthquake data
- `osint://climate` — climate anomaly data
- `osint://disasters` — GDACS disaster alerts
- `osint://military/usni` — USNI Fleet tracker
- `osint://cyber` — cyber threat IOCs
- `osint://news` — aggregated RSS news

## Decision logic

**When to use which workflow:**
- User asks for "intelligence report" / "OSINT on" / "intel on" → Intelligence Report (most comprehensive)
- User asks about a place → Regional SITREP
- User asks about threats → Threat Briefing
- User asks about shipping/trade → Supply Chain Risk or Maritime Situation
- User asks about markets/economy → Economic Outlook
- User asks "what's happening" → Quick Scan
- User asks about military → Military Posture
- User asks about refugees/humanitarian → Humanitarian Assessment
- User asks about specific data → call the relevant tool directly

**When to add more tools:**
- If initial results are thin (empty arrays, few events), widen the search: remove bbox filter, try related tools
- If user asks "tell me more" or "go deeper", add tools from the same category
- If cross-domain question (e.g., "how does the conflict affect shipping"), combine workflows

**When NOT to combine tools:**
- Simple factual questions ("what's Bitcoin price") — just call `get_crypto`
- Single-domain queries — don't add unrelated tools
- User asks for specific data — give exactly what was asked

## Output rules

1. **Never claim data you didn't fetch.** If a tool returned empty results, say so.
2. **Separate facts from analysis.** Label data as "Data:" and your interpretation as "Assessment:".
3. **Cite the source tool.** When presenting data, mention which tool it came from.
4. **Show timestamps.** Include `fetchedAt` or `cachedAt` when available so the user knows data freshness.
5. **Flag stale data.** If `fromCache: true` and `cachedAt` is old, note that data may be stale.
6. **Acknowledge gaps.** If a relevant tool returned an error or empty data, mention it.
7. **No hallucinated intelligence.** Do not invent events, threat levels, or assessments not supported by the tool output.

## Natural language patterns

These are example prompts users might say, mapped to workflows:

- "Intelligence report on Dubai" → Intelligence Report
- "OSINT on Iran" → Intelligence Report
- "Intel on the Middle East" → Intelligence Report
- "What's happening in the world right now" → Quick Scan
- "Give me a threat briefing for the Middle East" → Threat Briefing
- "What's the situation in Ukraine" → Regional SITREP
- "How are the shipping chokepoints" → Maritime Situation
- "What's the economic outlook" → Economic Outlook
- "Any cyber threats I should know about" → call get_cyber_threats
- "Latest earthquakes" → call get_earthquakes
- "Bitcoin price" → call get_crypto
- "Supply chain risks" → Supply Chain Risk
- "Humanitarian situation in Syria" → Humanitarian Assessment
- "What's trending in AI research" → Research Digest

## Extending

To add new OSINT modules as they become available on the headless server:

1. Call `list_modules` to discover new module IDs
2. Use `query_modules` with the new module ID — works immediately, no code changes needed
3. For a permanent named tool, add one dict entry to `mcp/src/osint_mcp/tools/__init__.py`
