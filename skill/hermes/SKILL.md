---
name: hermes-osint
description: Integration between Hermes geopolitical market simulator and osint-mcp. Use when Hermes needs OSINT data for simulations, topic tracking, seed packet generation, or feed quality scoring. Handles module mapping between Hermes topic configs and osint-mcp tools.
---

# Hermes ↔ osint-mcp Integration

Hermes (PrediHermes) is a geopolitical market forecasting system that uses osint-mcp as its intelligence backend. This skill handles the integration.

## Architecture

```
Hermes CLI → topics.json (topic config)
    ↓
osint-mcp (port 3000) → WorldOSINT headless API
    ↓
Polymarket API → market discovery + pricing
    ↓
Seed Packet (markdown) → feed quality scoring
    ↓
MiroFish (port 5001) → multi-agent simulation
```

## How Hermes queries osint-mcp

Hermes uses the **headless API directly** (not MCP tools):

```bash
# List modules
curl "http://127.0.0.1:3000/api/headless?module=list&format=json"

# Query specific modules
curl "http://127.0.0.1:3000/api/headless?modules=news_rss,intelligence_risk_scores&format=json"

# Fast mode (7 core modules)
curl "http://127.0.0.1:3000/api/headless?mode=fast&format=json"
```

## Module mapping: Hermes topics → osint-mcp modules

When configuring a Hermes topic, use these module IDs in the `headless_modules` field:

### For geopolitical/conflict topics (e.g. Iran, Ukraine)

```json
{
  "headless_modules": [
    "news_rss",
    "defense_military_feeds",
    "security_intel_feeds",
    "regional_conflict_feeds",
    "gdelt_events",
    "country_risk_signals",
    "military_usni",
    "opensky_aircraft",
    "supply_chain_chokepoints",
    "intelligence_findings",
    "travel_advisories",
    "embassy_alerts",
    "civil_defense_alerts"
  ]
}
```

### For economic/trade topics

```json
{
  "headless_modules": [
    "news_rss",
    "economic_macro",
    "economic_bis_rates",
    "economic_bis_fx",
    "us_treasury",
    "trade_comtrade",
    "markets_crypto",
    "fear_greed_index",
    "policy_feeds"
  ]
}
```

### For cyber/tech topics

```json
{
  "headless_modules": [
    "cyber_news",
    "cyber_threats",
    "cisa_kev",
    "ransomware_posts",
    "threatfox_iocs",
    "urlhaus_urls",
    "nvd_cves",
    "news_rss"
  ]
}
```

### For maritime/supply chain topics

```json
{
  "headless_modules": [
    "maritime_news",
    "supply_chain_chokepoints",
    "supply_chain_critical_minerals",
    "news_rss",
    "opensky_aircraft"
  ]
}
```

## Working modules (verified 2026-03-20)

These modules return data and should be used in Hermes topics:

**Core intelligence:** news_rss, defense_military_feeds, security_intel_feeds, regional_conflict_feeds, gdelt_events, country_risk_signals, intelligence_findings, intelligence_risk_scores, policy_feeds

**Cyber:** cyber_news, cyber_threats, cisa_kev, ransomware_posts, threatfox_iocs, urlhaus_urls, nvd_cves

**Military/Aviation:** military_usni, opensky_aircraft (ADSB.fi + OpenSky)

**Natural events:** seismology_earthquakes, natural_events_eonet, natural_events_gdacs, tropical_weather, weather_alerts, space_weather, civil_defense_alerts

**Maritime:** maritime_news, supply_chain_chokepoints, supply_chain_critical_minerals, submarine_cables

**Economic:** economic_macro, economic_bis_rates, economic_bis_fx, us_spending, us_treasury, trade_comtrade, markets_crypto, markets_stablecoins, fear_greed_index, bitcoin_hashrate

**Security:** sanctions_ofac, opensanctions, travel_advisories, health_advisories, embassy_alerts, country_facts

**Infrastructure:** infrastructure_services, ioda_outages

## Broken modules (do NOT use in Hermes topics)

These return empty data — removed from MCP but still exist on the server:

conflict_acled, conflict_ucdp_events, conflict_hapi, unrest_events, maritime_warnings, maritime_snapshot, military_flights, military_posture, infrastructure_cable_health, infrastructure_baseline, wildfire_detections, markets, markets_commodities, markets_etf_flows, economic_energy, economic_bis_credit, trade_flows, trade_tariffs, trade_restrictions, trade_barriers, supply_chain_shipping, news_telegram, research_trending_repos, predictions, polymarket_intel, geo_filters, radiation_epa, positive_events

## Feed quality scoring

Hermes scores feed quality before simulation. To maximize scores:

1. Use **10+ modules** in `headless_modules` (module_count weight: 0.15)
2. Include `news_rss` for headline count (0.30 weight)
3. Include `country_risk_signals` for risk data (0.15 weight)
4. Include topic-diverse modules — mix news, defense, economic, cyber (theme_diversity: 0.20)
5. All feeds are real-time, so recency (0.20) should always score high

## Container setup

When running in Docker, ensure:

```yaml
# docker-compose.yml
services:
  osint-server:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000

  osint-mcp:
    build: ./mcp
    depends_on:
      - osint-server
    environment:
      - HEADLESS_BASE_URL=http://osint-server:3000
```

Hermes should connect to osint-server on port 3000. Set in Hermes env:
```bash
WORLDOSINT_BASE_URL=http://127.0.0.1:3000  # or http://osint-server:3000 in Docker network
```

## Troubleshooting

**"Module X returns empty"** → Check the broken modules list above. Use the working alternative.

**"Connection refused on 3000"** → Start the server: `cd server && PORT=3000 node --import tsx server.mjs`

**"Feed quality score < 50"** → Add more modules to the topic config. The scoring rewards diversity.

**"Simulation seed is thin"** → Use `format=md` to get markdown summaries that MiroFish can parse better:
```bash
curl "http://127.0.0.1:3000/api/headless?modules=news_rss,gdelt_events&format=md"
```

**"GDELT rate limited"** → Use `gdelt_events` (bulk plugin, no rate limit) instead of `intelligence_gdelt` (API, rate limited).

**Plugin modules not visible to Hermes** → Plugin modules (country_risk_signals, gdelt_events, opensanctions, etc.) are auto-loaded from `server/api/modules/`. They appear in `?module=list` and are queryable like any other module. No special config needed.
