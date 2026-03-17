---
name: osint
description: OSINT intelligence gathering and analysis using 57 MCP tools covering conflict, maritime, military, cyber, infrastructure, natural events, markets, economics, trade, supply chain, news, research, predictions, geolocation, humanitarian, and risk data. Use when the user asks about geopolitical events, threat assessments, regional situations, economic conditions, market data, conflict zones, maritime chokepoints, cyber threats, natural disasters, or any intelligence analysis task.
---

# OSINT Intelligence

This skill provides access to 57 real-time OSINT tools and 6 browsable resources via the osint-mcp server. The tools query live data from USGS, ACLED, UCDP, NASA FIRMS, BIS, FRED, Polymarket, GDELT, UNHCR, and 40+ other sources.

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

The most comprehensive workflow. Call ALL of these tools — do not skip any:

1. `get_geocode` with the place name → get coordinates and bbox
2. `get_intelligence_summary` — overall risk scores for the region
3. `get_conflict_acled` — armed conflict events (use bbox if available)
4. `get_unrest_events` — protests and civil unrest (use bbox)
5. `get_news_rss` — latest headlines (scan for region-relevant articles)
6. `get_military_posture` — theater posture summary
7. `get_military_usni` — USNI fleet tracker for naval presence
8. `get_chokepoints` — nearby maritime chokepoint status
9. `get_maritime_warnings` — active navigational warnings
10. `get_cyber_threats` — active cyber IOCs
11. `get_aviation_delays` — airport delays in the region
12. `get_economic_macro` — macro economic signals
13. `get_infrastructure_outages` — internet outages
14. `get_displacement` — displacement/refugee data

Present as a structured intelligence report with these sections:
- **Security & Geopolitical Risk**: risk scores, conflicts, unrest, military posture
- **Maritime & Logistics**: chokepoint status, warnings, shipping
- **Aviation & Travel**: airport delays, airspace status from news
- **Economic Signals**: macro data, market sentiment, trade impact
- **Cyber & Infrastructure**: threats, outages, cable health
- **Humanitarian**: displacement, population exposure

Cross-reference news headlines against all other data sources. If news mentions events (blockades, airspace closures, attacks) that aren't reflected in structured data, flag the discrepancy and use the news as the primary signal.

### Threat Briefing — "threat briefing for [region/topic]"

For regional or topical threat assessment:

1. `get_geocode` with the region name → get coordinates
2. `get_intelligence_summary` — overall risk scores
3. `get_conflict_acled` — armed conflict events
4. `get_unrest_events` — protests and civil unrest
5. `get_cyber_threats` — cyber IOCs
6. `get_news_rss` — relevant headlines
7. `get_military_posture` — theater posture

Present: risk score for region, active conflicts, unrest events, cyber threats, military posture, supporting news. Separate confirmed events from assessments.

### Maritime Situation — "maritime situation" / "chokepoints" / "shipping"

1. `get_chokepoints` — all 6 major chokepoint statuses
2. `get_maritime_warnings` — active navigational warnings
3. `get_maritime_snapshot` — vessel positions
4. `get_shipping_rates` — container rates
5. `get_news_rss` — maritime-relevant headlines

Present: chokepoint status table (name, status, disruption score), active warnings, shipping rate trends, relevant news.

### Economic Outlook — "economic outlook" / "markets" / "economy"

1. `get_economic_macro` — FRED macro signals (GDP, unemployment, inflation)
2. `get_bis_rates` — central bank policy rates
3. `get_markets` — stock/index quotes
4. `get_crypto` — cryptocurrency prices
5. `get_commodities` — commodity prices
6. `get_economic_energy` — energy prices
7. `get_trade_flows` — international trade data
8. `get_stablecoins` — stablecoin market health

Present: macro verdict (bullish/bearish/neutral), key rates, market summary, energy prices, trade trends.

### Regional SITREP — "situation report for [place]" / "SITREP [place]"

Full situational awareness for a geographic area:

1. `get_geocode` with place name → coordinates + bbox
2. `get_intelligence_summary` — risk scores
3. `get_conflict_acled` with bbox — local conflicts
4. `get_unrest_events` with bbox — local unrest
5. `get_earthquakes` with bbox — local seismic
6. `get_wildfires` with bbox — local fires
7. `get_climate_anomalies` — climate data
8. `get_displacement` — refugee/displacement data
9. `get_population_exposure` — population at risk
10. `get_infrastructure_outages` — internet outages
11. `get_news_rss` — relevant headlines

Present as a structured SITREP:
- **Situation**: location, population, risk score
- **Threats**: conflicts, unrest, cyber
- **Natural hazards**: earthquakes, fires, climate
- **Humanitarian**: displacement, population exposure
- **Infrastructure**: outages, cable health
- **Assessment**: overall threat level with supporting evidence

### Supply Chain Risk — "supply chain" / "critical minerals" / "trade barriers"

1. `get_chokepoints` — maritime chokepoint status
2. `get_shipping_rates` — freight rates
3. `get_critical_minerals` — mineral supply data
4. `get_trade_restrictions` — active restrictions
5. `get_trade_barriers` — trade barriers
6. `get_trade_tariffs` — tariff trends
7. `get_trade_flows` — flow data

Present: chokepoint disruptions, rate trends, mineral supply risks, active trade restrictions.

### Prediction Markets — "predictions" / "what are markets saying about"

1. `get_predictions` — open Polymarket markets
2. `get_polymarket_intel` — live trades and signals
3. `get_news_rss` — supporting news context

Present: market question, current YES/NO pricing, volume, deadline, supporting news.

### Research Digest — "what's trending in tech" / "research"

1. `get_arxiv` — recent papers
2. `get_trending_repos` — GitHub trending
3. `get_hackernews` — HN top stories
4. `get_tech_events` — upcoming conferences

Present: top papers by topic, trending repos, HN discussion themes, upcoming events.

### Military Posture — "military situation" / "military flights"

1. `get_military_posture` — theater summaries
2. `get_military_usni` — USNI fleet tracker
3. `get_military_flights` with bbox — aircraft tracking (requires bbox)
4. `get_maritime_warnings` — navigational warnings in theater

Present: fleet positions, aircraft activity, theater assessment.

### Humanitarian Assessment — "humanitarian situation in [place]"

1. `get_geocode` with place → coordinates
2. `get_displacement` — UNHCR displacement data
3. `get_population_exposure` — population at risk
4. `get_conflict_hapi` — HDX HAPI humanitarian data
5. `get_giving_summary` — philanthropic giving trends
6. `get_positive_events` — positive developments

Present: displacement numbers, population exposure, humanitarian access, giving trends, positive developments.

## Multi-module queries

For custom combinations, use `query_modules` with comma-separated module IDs:

```
query_modules(modules="seismology_earthquakes,cyber_threats,news_rss")
```

This returns all three in one call. Use `list_modules` to discover all available module IDs.

## Tool reference

### Required parameters

These tools REQUIRE specific parameters — they will error without them:
- `get_geocode` requires `query` (string) — the place name to geocode
- `get_military_flights` requires `bbox` (string) — bounding box coordinates

### Common optional parameters

Every tool accepts:
- `format` — `"json"` (default), `"md"` (markdown), `"both"`
- `limit` — max results
- `bbox` — geographic bounding box filter

### All 57 tools by category

**Aggregate**: health_check, list_modules, query_modules, get_intelligence_summary
**Conflict**: get_conflict_acled, get_conflict_ucdp, get_conflict_hapi, get_unrest_events
**Maritime**: get_maritime_warnings, get_maritime_snapshot
**Military**: get_military_flights, get_military_posture, get_military_usni
**Cyber**: get_cyber_threats
**Infrastructure**: get_infrastructure_outages, get_infrastructure_cable_health, get_infrastructure_baseline, get_infrastructure_services
**Natural Events**: get_earthquakes, get_wildfires, get_climate_anomalies
**Markets**: get_markets, get_crypto, get_commodities, get_stablecoins, get_etf_flows
**Economics**: get_economic_macro, get_economic_energy, get_bis_rates, get_bis_fx, get_bis_credit
**Trade**: get_trade_flows, get_trade_tariffs, get_trade_restrictions, get_trade_barriers
**Supply Chain**: get_shipping_rates, get_chokepoints, get_critical_minerals
**News**: get_news_rss, get_news_telegram, get_gdelt
**Research**: get_tech_events, get_arxiv, get_trending_repos, get_hackernews
**Predictions**: get_predictions, get_polymarket_intel
**Geolocation**: get_geocode, get_geo_filters, get_satellite_snapshot
**Humanitarian**: get_displacement, get_population_exposure, get_giving_summary
**Misc**: get_aviation_delays, get_positive_events, get_risk_scores, get_pizzint

### Resources (browsable data)

- `osint://earthquakes` — USGS earthquake data
- `osint://wildfires` — NASA FIRMS fire detections
- `osint://climate` — climate anomaly data
- `osint://conflict/{source}` — conflict data (acled, ucdp, hapi)
- `osint://maritime/{type}` — maritime data (warnings, snapshot)
- `osint://military/{type}` — military data (flights, posture, usni)

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
- "What are prediction markets saying about X" → Prediction Markets
- "Latest earthquakes" → call get_earthquakes
- "Bitcoin price" → call get_crypto
- "Military flights over Europe" → call get_military_flights with European bbox
- "Supply chain risks" → Supply Chain Risk
- "Humanitarian situation in Syria" → Humanitarian Assessment
- "What's trending in AI research" → Research Digest
- "Get me everything on Iran" → Threat Briefing + Maritime Situation + Economic Outlook combined

## Extending

To add new OSINT modules as they become available on the headless server:

1. Call `list_modules` to discover new module IDs
2. Use `query_modules` with the new module ID — works immediately, no code changes needed
3. For a permanent named tool, add one dict entry to `mcp/src/osint_mcp/tools/__init__.py`
