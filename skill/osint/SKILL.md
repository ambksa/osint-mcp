---
name: osint
description: OSINT intelligence gathering and analysis using 105+ MCP tools covering aircraft tracking, cyber threats, GDELT events, sanctions (78K entities), news (55+ RSS sources), natural disasters, economics, military, maritime, geolocation, humanitarian, civil defense (95+ countries), and country risk signals. Use when the user asks about geopolitical events, threat assessments, regional situations, flights, sanctions, economic conditions, cyber threats, natural disasters, or any intelligence analysis task.
---

# OSINT Intelligence

105+ real-time OSINT tools and 6 browsable resources via osint-mcp. 63 curated tools with hand-tuned params + 42 auto-discovered from server modules and plugins. 55+ RSS sources across 7 thematic feed categories. All tools support universal `search` and `filter` params.

## Tool access

Tools are available as MCP tools prefixed with `mcp__osint__`. Call them directly.

## First checks

1. Call `health_check` — should return `{"ok": true}`
2. If unreachable, the OSINT server needs to be started
3. Call `list_modules` to see all available data sources

## Universal filtering (all tools)

Every tool accepts:
- `search` — text search across all result fields (e.g. `search="Iran"`)
- `filter` — JSON field-level queries (e.g. `filter='{"magnitude": ">5"}'`)
- `limit` — max results
- `format` — `"json"` (default), `"md"`, `"both"`

Filter operators: `>`, `<`, `>=`, `<=`, `=`, `!=` for numbers. Contains-match for strings.

## Analysis workflows

### Intelligence Report — "intel on [place]" / "OSINT on [place]"

**ONE CALL:** `intelligence_report(query="Dubai", keywords="Dubai,UAE,Gulf,Hormuz")`

Queries 14+ modules in parallel, filters by keywords, returns structured report in ~10s.

### Full Intelligence Briefing — "briefing on [country]"

For maximum depth, query these modules in parallel:
1. `intelligence_report` — composite report
2. `get_country_risk_signals` — raw evidence from 9 feeds
3. `get_gdelt_events` — structured events (1500/15min, conflict/cooperation)
4. `get_aircraft` — live airspace with military tagging
5. Thematic news feeds (pick relevant ones)
6. `get_ioda_outages` — internet infrastructure status
7. `get_opensanctions` — sanctions exposure
8. `get_chokepoints` — maritime chokepoint status

### Quick Scan — "what's happening right now"

1. `get_intelligence_summary` — risk scores
2. `get_news_rss` — latest headlines
3. `get_intelligence_findings` — prioritized alerts from 11 sources
4. `get_earthquakes` — seismic activity

### Aircraft — "planes over [place]" / "military flights"

`get_aircraft` has **19 filter params**:
- `bbox` — geographic area (e.g. '22,51,26,56' for UAE)
- `callsign`, `registration`, `icao24` — find specific aircraft
- `aircraft_type` — e.g. 'C17', 'B77W'
- `military` — true for military only
- `squawk` — e.g. '7700' for emergency
- `min_altitude_ft`, `max_altitude_ft` — altitude range
- `min_speed_kts` — speed filter
- `on_ground` — true/false
- `emergency` — true for emergency squawks

Source: ADSB.fi primary (unfiltered, shows military), OpenSky fallback.

### Cyber Brief — "cyber threats"

1. `get_cyber_threats` — active C2 servers (Feodo)
2. `get_cisa_kev` — actively exploited CVEs
3. `get_ransomware` — ransomware victim posts
4. `get_threatfox` — malware IOCs
5. `get_urlhaus_urls` — malware distribution URLs
6. `get_nvd_cves` — full NVD vulnerability search
7. `get_cyber_news` — Krebs, Hacker News, BleepingComputer

### Economic Outlook — "economy" / "markets"

1. `get_economic_macro` — FRED macro signals
2. `get_bis_rates` — central bank policy rates (11 economies)
3. `get_bis_fx` — exchange rates
4. `get_crypto` — cryptocurrency prices
5. `get_us_treasury` — receipts/outlays/deficit
6. `get_trade_comtrade` — UN Comtrade trade flows
7. `get_fear_greed` — market sentiment

### Maritime — "shipping" / "chokepoints"

1. `get_chokepoints` — Suez, Panama, Hormuz, Malacca status
2. `get_submarine_cables` — 700+ undersea cables
3. `get_maritime_news` — gCaptain, shipping news

### Sanctions — "sanctions on [name/country]"

1. `get_opensanctions` — 78K entities from 40+ sanctions lists (OFAC, EU, UN, UK, AU + PEPs)
2. `get_sanctions` — OFAC SDN list search

### Country Risk — "risk for [country]"

`get_country_risk_signals(query="UAE")` — raw evidence from 9 feeds:
- News headlines with threat keywords
- Defense articles
- Travel advisory level
- Embassy alerts
- Disaster events
- Health alerts
No scoring — returns evidence for agent to analyze.

## News feed categories

| Tool | Sources | Items | Use for |
|------|---------|-------|---------|
| `get_news_rss` | BBC, Reuters, AP, CNN, Guardian, FT +9 | ~198 | General world news |
| `get_security_intel_feeds` | Bellingcat, Crisis Group, War on the Rocks, Oryx, Jamestown, Foreign Policy | ~60 | OSINT investigations, conflict analysis |
| `get_defense_military_feeds` | Defense News, Military Times, Breaking Defense, USNI, DefenseOne, War Zone, Task & Purpose, UK MOD | ~80 | Military/defense industry |
| `get_cyber_news` | Krebs, Hacker News, BleepingComputer, Ars Technica | ~20 | Cybersecurity reporting |
| `get_maritime_news` | gCaptain, maritime/chokepoint news | ~42 | Shipping, naval, maritime |
| `get_policy_feeds` | CSIS, Arms Control, FAS, Bulletin, MEI, Brookings, Carnegie, Chatham House | ~64 | Think tank analysis |
| `get_regional_conflict_feeds` | BBC ME/Africa/Asia/LatAm, Sahel, InSight Crime, India, trade wars | ~80 | Regional hotspots |

For comprehensive news: `query_modules(modules="news_rss,security_intel_feeds,defense_military_feeds,regional_conflict_feeds")`

## All tools by category

**Aggregate (5)**: health_check, list_modules, query_modules, get_intelligence_summary, intelligence_report
**Aircraft (1)**: get_aircraft (19 params, ADSB.fi + OpenSky, military tagging)
**Military (1)**: get_military_usni
**Cyber (7)**: get_cyber_threats, get_cisa_kev, get_ransomware, get_threatfox, get_urlhaus_urls, get_nvd_cves, get_cyber_news
**Natural Events (7)**: get_earthquakes, get_climate_anomalies, get_natural_events, get_disaster_alerts, get_tropical_weather, get_weather_alerts, get_space_weather
**Civil Defense (1)**: get_civil_defense_alerts (95+ countries, WMO CAP)
**Markets (4)**: get_crypto, get_stablecoins, get_fear_greed, get_bitcoin_hashrate
**Economics (7)**: get_economic_macro, get_bis_rates, get_bis_fx, get_us_spending, get_us_treasury, get_worldbank, get_imf_data
**Trade (2)**: get_trade_comtrade (UN trade flows), get_tariff_rates (WITS tariffs)
**Supply Chain (2)**: get_chokepoints, get_critical_minerals
**News (9)**: get_news_rss, get_gdelt, get_news_velocity, get_aviation_news, get_defense_news, get_security_intel_feeds, get_defense_military_feeds, get_maritime_news, get_regional_conflict_feeds
**Policy (1)**: get_policy_feeds (8 think tanks)
**GDELT (1)**: get_gdelt_events (bulk, 1500 events/15min, no rate limit)
**Research (3)**: get_tech_events, get_arxiv, get_hackernews
**Geolocation (3)**: get_geocode, get_satellite_snapshot, get_satellite_search
**Humanitarian (3)**: get_displacement, get_population_exposure, get_giving_summary
**Security (6)**: get_sanctions, get_opensanctions (78K entities), get_travel_advisories, get_health_advisories, get_embassy_alerts, get_country_facts
**Radiation (1)**: get_radiation_safecast
**Aviation (1)**: get_aviation_delays
**Intelligence (3)**: get_pizzint, get_intelligence_findings, get_country_risk_signals
**Infrastructure (4)**: get_infrastructure_outages, get_infrastructure_services, get_submarine_cables, get_ioda_outages
**Enrichment (3)**: get_sec_filings, get_github_activity, get_hn_search
**Financial (5, key required)**: get_fred_series, get_fmp_quote, get_fmp_profile, get_fmp_ratios, get_fmp_estimates

### API-key-dependent tools

| Tool | Key | Get it at |
|------|-----|-----------|
| get_fred_series | FRED_API_KEY | https://fred.stlouisfed.org/docs/api/api_key.html (free) |
| get_fmp_quote/profile/ratios/estimates | FMP_API_KEY | https://site.financialmodelingprep.com/developer (free tier) |

### Resources (browsable)

- `osint://earthquakes` — USGS seismic
- `osint://climate` — climate anomalies
- `osint://disasters` — GDACS alerts
- `osint://military/usni` — fleet tracker
- `osint://cyber` — threat IOCs
- `osint://news` — RSS feeds

## Output rules

1. Never claim data you didn't fetch. Say if a tool returned empty.
2. Separate facts from analysis. Label "Data:" vs "Assessment:".
3. Cite the source tool.
4. Show timestamps when available.
5. Acknowledge gaps.
6. No hallucinated intelligence.

## Extending

Drop a `.mjs` file in `server/api/modules/` — auto-discovered by MCP. No code changes needed.
