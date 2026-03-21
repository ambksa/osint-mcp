---
name: osint
description: OSINT intelligence platform with 95 MCP tools covering aircraft (FlightRadar24), cyber threats (CISA/ThreatFox/NVD/GreyNoise), GDELT events (1500/15min), sanctions (78K entities), 65+ RSS news sources, natural disasters (95+ countries), economics (IMF/BIS/FRED), satellites (CelesTrak), BGP routing, WHOIS, certificate transparency, MITRE ATT&CK, ICIJ offshore leaks, and more. Use for geopolitical events, threat assessment, flight tracking, sanctions checks, cyber investigations, economic analysis, or any intelligence task.
---

# OSINT Intelligence Platform

95 MCP tools querying 50+ live data sources. All tools support `search` (text filter) and `filter` (JSON field queries). No API keys required for 82 tools.

## Quick reference — what to call for common questions

| Question | Tool | Example params |
|----------|------|---------------|
| "planes over Dubai" | `get_aircraft` | `bbox="22,51,27,57"` |
| "where is flight UAE508" | `get_aircraft` | `bbox="22,51,27,57", callsign="UAE508"` |
| "military aircraft Europe" | `get_aircraft` | `bbox="35,-10,60,30", military=true` |
| "intelligence briefing on UAE" | `intelligence_report` | `query="UAE"` |
| "risk signals for Iran" | `get_country_risk_signals` | `query="Iran"` |
| "what's happening now" | `get_intelligence_findings` | |
| "cyber threats" | `get_cisa_kev` + `get_ransomware` + `get_threatfox` | |
| "is this IP malicious" | `get_greynoise` | `query="1.2.3.4"` |
| "who owns this domain" | `get_whois` | `query="example.com"` |
| "SSL certs for domain" | `get_certificates` | `query="example.com"` |
| "BGP info for Google" | `get_bgp` | `query="AS15169"` |
| "sanctions on Iran" | `get_opensanctions` | `query="Iran"` |
| "offshore entities" | `get_offshore_leaks` | `query="company name"` |
| "GDP data for US" | `get_imf_datasets` | `query="US"` |
| "earthquakes" | `get_earthquakes` | |
| "chokepoint status" | `get_chokepoints` | |
| "internet status Iran" | `get_ioda_outages` | `query="IR"` |
| "military satellites" | `get_satellites` | `query="military"` |
| "MITRE technique" | `get_mitre_attack` | `query="T1566"` or `query="APT28"` |
| "defense news" | `get_defense_military_feeds` | |
| "Bellingcat/OSINT news" | `get_security_intel_feeds` | |
| "policy analysis" | `get_policy_feeds` | |
| "GDELT events for Iran" | `get_gdelt_events` | `query="Iran"` |
| "trade flows US-China" | `get_trade_comtrade` | `query="US", partner="CN"` |
| "NOTAMs for Dubai" | `get_notams` | `query="OMDB"` |
| "vessel tracking" | `get_ais_vessels` | `bbox="24,54,26,56"` |
| "space weather" | `get_space_weather` | |
| "malware URLs" | `get_urlhaus_urls` | |
| "CVE search" | `get_nvd_cves` | `query="apache"` |

## All 95 tools

### System & Aggregate (6)
- `version` — git commit, tool counts, server health
- `health_check` — verify server connectivity
- `list_modules` — list all module IDs
- `query_modules(modules)` — query multiple modules by comma-separated IDs
- `intelligence_report(query)` — full report from 14+ modules, filtered by keywords
- `get_intelligence_findings` — prioritized alerts fused from 11 sources

### Aircraft (1)
- `get_aircraft(bbox)` — FlightRadar24, 400+ aircraft/region, origin→destination routes, military auto-tagged. Filters: `callsign`, `registration`, `aircraft_type`, `squawk`, `military`, `on_ground`, `min_altitude_ft`, `max_altitude_ft`, `min_speed_kts`, `emergency`

### Cyber Threat Intelligence (8)
- `get_cyber_threats` — Feodo C2 servers
- `get_cisa_kev(query)` — CISA actively exploited CVEs
- `get_ransomware` — RansomLook victim posts
- `get_threatfox` — abuse.ch malware IOCs
- `get_urlhaus_urls` — malware distribution URLs
- `get_nvd_cves(query)` — NIST NVD with CVSS scores
- `get_greynoise(query)` — IP reputation (scanner/bot/benign)
- `get_cyber_news` — Krebs, Dark Reading, BleepingComputer, Ars Technica

### Network & Infrastructure Investigation (5)
- `get_whois(query)` — RDAP domain/IP lookup (registrar, dates, nameservers)
- `get_certificates(query)` — crt.sh certificate transparency
- `get_bgp(query)` — RIPEstat BGP routing, AS info, abuse contacts
- `get_mitre_attack(query)` — ATT&CK techniques, groups, malware
- `get_intelx(query)` — dark web/paste/leak search (requires INTELX_API_KEY)

### Natural Events & Weather (8)
- `get_earthquakes` — USGS data
- `get_climate_anomalies` — NOAA/ERA5
- `get_natural_events` — NASA EONET (volcanoes, storms, floods)
- `get_disaster_alerts` — GDACS global alerts
- `get_tropical_weather` — NOAA NHC cyclones
- `get_weather_alerts` — NWS US severe weather
- `get_space_weather` — NOAA solar flares, geomagnetic storms (G/R/S scales)
- `get_civil_defense_alerts` — WMO CAP from 95+ countries

### Economics & Trade (9)
- `get_economic_macro` — FRED signals (GDP, unemployment, CPI)
- `get_bis_rates` — central bank policy rates (11 economies)
- `get_bis_fx` — exchange rates
- `get_us_spending` — USASpending.gov
- `get_us_treasury` — Monthly Treasury Statement
- `get_worldbank(query, indicator)` — World Bank indicators
- `get_imf_data(query, indicator)` — IMF DataMapper single indicator
- `get_imf_datasets(query)` — IMF multi-indicator (query "US" for 9 indicators, or "NGDP_RPCH.DEU")
- `get_trade_comtrade(query)` — UN Comtrade trade flows

### Markets & Crypto (4)
- `get_crypto` — CoinGecko quotes
- `get_stablecoins` — stablecoin market
- `get_fear_greed` — Crypto Fear & Greed Index (30-day)
- `get_bitcoin_hashrate` — network hashrate (1 month)

### Sanctions & Security (7)
- `get_sanctions(query)` — OFAC SDN list
- `get_opensanctions(query)` — 78K entities from 40+ lists (OFAC, EU, UN, UK, AU + PEPs)
- `get_travel_advisories(query)` — US/UK/NZ government advisories
- `get_health_advisories` — CDC, ECDC, WHO outbreaks
- `get_embassy_alerts` — US Embassy security alerts
- `get_country_facts(query)` — country profile with demographics
- `get_offshore_leaks(query)` — ICIJ Panama/Paradise/Pandora Papers

### News & Intelligence (12)
- `get_news_rss` — BBC, Reuters, AP, CNN, Guardian, NPR, France 24 (12 sources)
- `get_gdelt(query)` — GDELT article search (rate-limited)
- `get_gdelt_events(query)` — GDELT bulk events (1500/15min, no rate limit, CAMEO codes)
- `get_news_velocity` — article frequency anomaly detection
- `get_aviation_news` — aviation RSS
- `get_defense_news` — defense RSS (legacy, 4 feeds)
- `get_security_intel_feeds` — Bellingcat, Crisis Group, War on the Rocks, Oryx, Jamestown, Foreign Policy, Foreign Affairs, InSight Crime
- `get_defense_military_feeds` — Defense News, Military Times, USNI, UK MOD, War Zone, Task & Purpose (9 sources)
- `get_cyber_news` — Krebs, Hacker News, BleepingComputer, Dark Reading, Ransomware.live
- `get_maritime_news` — gCaptain, maritime/chokepoint news
- `get_policy_feeds` — CSIS, Brookings, Carnegie, Chatham House, MEI, Arms Control, FAS, Bulletin (8 think tanks)
- `get_regional_conflict_feeds` — BBC ME/Africa/Asia/LatAm, Sahel, InSight Crime, India

### Military & Space (3)
- `get_military_usni` — USNI Fleet tracker (US Navy deployments)
- `get_satellites(query)` — CelesTrak orbits (military, GPS, Starlink, weather)
- `get_notams(query)` — FAA NOTAMs by ICAO code (requires FAA_NOTAM_API_KEY)

### Maritime & Supply Chain (5)
- `get_chokepoints` — Suez, Panama, Hormuz, Malacca status
- `get_critical_minerals` — lithium, cobalt, rare earths
- `get_submarine_cables(query)` — 700+ undersea cables
- `get_ais_vessels(bbox)` — live ship positions (requires AISSTREAM_API_KEY)
- `get_energy_commodities_news` — oil/OPEC, LNG, mining, metals

### Intelligence & Risk (3)
- `get_intelligence_findings` — prioritized alerts from 11 modules
- `get_country_risk_signals(query)` — raw evidence from 9 feeds for 72 countries
- `get_pizzint` — Pentagon Pizza Index

### Geolocation & Satellite (3)
- `get_geocode(query)` — place name → coordinates
- `get_satellite_snapshot(query)` — satellite imagery URLs
- `get_satellite_search(bbox)` — Sentinel-2 imagery search

### Humanitarian (3)
- `get_displacement` — UNHCR refugee/IDP data
- `get_population_exposure` — WorldPop estimates
- `get_giving_summary` — humanitarian funding

### Infrastructure (4)
- `get_infrastructure_outages` — BGP outages
- `get_infrastructure_services` — service availability (30+ platforms)
- `get_submarine_cables(query)` — undersea cables
- `get_ioda_outages(query)` — IODA multi-signal internet monitoring per country

### Enrichment & Research (6)
- `get_sec_filings(query)` — SEC EDGAR (8-K, 10-K, 10-Q)
- `get_github_activity(query)` — GitHub org events
- `get_hn_search(query)` — Hacker News search
- `get_hackernews` — HN top stories
- `get_tech_events` — technology conferences
- `get_arxiv(query)` — arXiv paper search

### Other (4)
- `get_radiation_safecast` — radiation sensors
- `get_aviation_delays` — FAA airport delays
- `get_tor_exit_nodes(query)` — Tor exit relays
- `get_telegram_osint` — Telegram OSINT (requires WS_RELAY_URL)

### Financial (5, require API keys)
- `get_fred_series(query)` — FRED time series (FRED_API_KEY)
- `get_fmp_quote(query)` — stock quotes (FMP_API_KEY)
- `get_fmp_profile(query)` — company profiles (FMP_API_KEY)
- `get_fmp_ratios(query)` — financial ratios (FMP_API_KEY)
- `get_fmp_estimates(query)` — analyst estimates (FMP_API_KEY)

### Conflict (1, requires API key)
- `get_acled_conflicts(query)` — armed conflict events (ACLED_ACCESS_TOKEN)

### Tariffs (1)
- `get_tariff_rates(query)` — WITS MFN tariff rates

## Universal parameters (all tools)

- `search` — text search across all result fields (e.g. `search="Iran"`)
- `filter` — JSON field queries (e.g. `filter='{"magnitude": ">5"}'`). Operators: `>`, `<`, `>=`, `<=`, `=`, `!=`
- `limit` — max results returned
- `format` — `json` (default), `md`, `both`

## Workflows

### Full intelligence briefing
```
1. intelligence_report(query="UAE", keywords="UAE,Dubai,Hormuz")  # composite, 14 modules
2. get_country_risk_signals(query="UAE")  # raw evidence from 9 feeds
3. get_gdelt_events(query="UAE", country="AE")  # structured events
4. get_aircraft(bbox="22,51,27,57")  # airspace
5. get_ioda_outages(query="AE")  # internet status
6. get_opensanctions(query="emirates")  # sanctions exposure
```

### Cyber investigation
```
1. get_greynoise(query="1.2.3.4")  # is it a scanner?
2. get_whois(query="suspicious.com")  # who owns it?
3. get_certificates(query="suspicious.com")  # what certs exist?
4. get_bgp(query="1.2.3.4")  # what AS, where?
5. get_mitre_attack(query="T1566")  # what technique?
6. get_cisa_kev(query="vendor")  # actively exploited?
```

### Economic outlook
```
1. get_imf_datasets(query="US")  # 9 key indicators
2. get_bis_rates()  # central bank rates
3. get_trade_comtrade(query="US", partner="CN")  # trade flows
4. get_energy_commodities_news()  # oil/gas/mining
```

## Key notes

- `get_aircraft` uses bbox `south,west,north,east`. Use wide bbox to capture overflights (e.g. `22,51,27,57` for UAE not `25,55,25.5,55.5`)
- `get_gdelt_events` is the reliable GDELT (bulk, no rate limit). `get_gdelt` uses the rate-limited API
- `get_imf_datasets` with just a country code returns 9 key indicators. With `INDICATOR.COUNTRY` returns specific time series
- Tools that need API keys return clear setup instructions, not errors
- All data is real-time with 5-min cache TTL (agent-overridable via `cache_ttl_ms=0`)

## Response format

```json
{
  "data": { ... },
  "durationMs": 406,
  "cached": false,
  "_meta": { "fetchedAt": "2026-03-21T...", "fromCache": false }
}
```

## Rules

1. Never claim data you didn't fetch
2. Separate facts from analysis
3. Cite which tool provided each data point
4. If a tool returns empty, say so
5. No hallucinated intelligence
