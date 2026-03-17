# Headless Modules

Each module is callable via `/api/headless?module=<id>` or in a `modules=` list. All return JSON and optional Markdown summaries.

## Global Presets

- `module=all` — run every module in this list (can be slow; use only when needed).
- `module=list` — list module IDs + descriptions.
- `modules=<id1,id2,...>` — run an explicit subset.

## Modules (Descriptions)

Always prefer `module=list` for the canonical, up-to-date module list. The UI may expose additional modules not listed here.

- `predictions` — Polymarket open prediction markets (gamma via sebuf).
- `polymarket_intel` — Polymarket live trades + insider signals.
- `geocode_place` — Geocode a place name to coordinates (Nominatim).
- `satellite_snapshot` — Satellite snapshot URL (ArcGIS default).
- `geo_filters` — OSM geolocation filters (roundabouts, traffic signs, etc.).
- `intelligence_findings` — Aggregated intelligence findings (alerts + signals).
- `seismology_earthquakes` — USGS earthquakes.
- `wildfire_detections` — NASA FIRMS fire detections.
- `climate_anomalies` — Climate anomalies.
- `unrest_events` — Protests/unrest.
- `conflict_acled` — ACLED conflict events.
- `conflict_ucdp_events` — UCDP GED conflict events.
- `conflict_hapi` — HDX HAPI humanitarian conflict summary.
- `displacement_summary` — UNHCR displacement summary.
- `population_exposure` — WorldPop exposure estimates.
- `maritime_warnings` — Navigational warnings.
- `maritime_snapshot` — AIS vessel snapshot + disruptions.
- `military_flights` — Military flights (OpenSky/relay).
- `military_posture` — Theater posture summary.
- `military_usni` — USNI Fleet report.
- `infrastructure_outages` — Internet outages.
- `infrastructure_cable_health` — Undersea cable health.
- `infrastructure_baseline` — Infrastructure temporal baseline.
- `infrastructure_services` — Service status checks.
- `cyber_threats` — Cyber threat IOCs.
- `markets` — Market quotes.
- `markets_crypto` — Crypto quotes.
- `markets_commodities` — Commodity quotes.
- `markets_stablecoins` — Stablecoin market data.
- `markets_etf_flows` — ETF flows.
- `economic_macro` — Macro signals.
- `economic_energy` — Energy prices.
- `economic_bis_rates` — BIS policy rates.
- `economic_bis_fx` — BIS exchange rates.
- `economic_bis_credit` — BIS credit indicators.
- `trade_restrictions` — Trade restrictions.
- `trade_tariffs` — Tariff trends.
- `trade_flows` — Trade flows.
- `trade_barriers` — Trade barriers.
- `supply_chain_shipping` — Shipping rates.
- `supply_chain_chokepoints` — Chokepoint status.
- `supply_chain_critical_minerals` — Critical minerals.
- `positive_events` — Positive geo events.
- `giving_summary` — Giving summary.
- `research_tech_events` — Tech events.
- `research_arxiv` — Arxiv papers.
- `research_trending_repos` — Trending repos.
- `research_hackernews` — Hacker News.
- `intelligence_risk_scores` — Risk scores.
- `intelligence_pizzint` — PizzINT status.
- `intelligence_gdelt` — GDELT document search.
- `news_rss` — RSS news feeds (server-side parse).
- `news_telegram` — Telegram OSINT feed (relay). (Removed/disabled in current setup)
- `aviation_delays` — Airport delays.

## Module Parameters (Explicit)

Each module accepts `params` in `/api/headless`:

```
GET /api/headless?module=<id>&format=both&params={...}
```

### Predictions / Markets

- `predictions`
  - `page_size` (default 50)
  - `cursor` (string)
  - `category` (string)
  - `query` (string)
- `polymarket_intel`
  - `limit` (trades limit, default 250)
- `markets`
  - `symbols` (comma-separated tickers)
- `markets_crypto`
  - `ids` (comma-separated ids)
- `markets_commodities`
  - `symbols` (comma-separated tickers)

### Seismology / Climate / Wildfire

- `seismology_earthquakes`
  - no params
- `wildfire_detections`
  - no params
- `climate_anomalies`
  - no params

### Unrest / Conflict / Humanitarian

- `unrest_events`
  - `min_confidence` (default 0)
  - `limit` (default 500)
- `conflict_acled`
  - `limit` (default 500)
  - `from_date` (YYYY-MM-DD)
  - `to_date` (YYYY-MM-DD)
- `conflict_ucdp_events`
  - `page_size` (default 1000)
  - `page` (default 1)
- `conflict_hapi`
  - `country` (string)
  - `limit` (default 200)
- `displacement_summary`
  - `country` (string)
- `population_exposure`
  - `country` (string)

### Maritime / Military / Infrastructure

- `maritime_warnings`
  - no params
- `maritime_snapshot`
  - no params
- `military_flights`
  - `bbox` (required for meaningful results)
    - `{ "west": <lon>, "south": <lat>, "east": <lon>, "north": <lat> }`
  - `operator` (string)
  - `aircraft_type` (string)
  - `page_size` (default 1000)
- `military_posture`
  - no params
- `military_usni`
  - no params
- `infrastructure_outages`
  - no params
- `infrastructure_cable_health`
  - no params
- `infrastructure_baseline`
  - no params
- `infrastructure_services`
  - no params

### Cyber / Intelligence / Research / Trade

- `cyber_threats`
  - `limit` (default 200)
- `intelligence_risk_scores`
  - no params
- `intelligence_pizzint`
  - no params
- `intelligence_gdelt`
  - `query` (string)
  - `max_records` (number, default 10, max 20)
  - `timespan` (e.g. `72h`)
  - `sort` (`date` | `tone`)
  - `tone_filter` (e.g. `tone>5`)
- `news_rss`
  - `urls` (array or comma-separated feed URLs)
  - `limit_per_feed` (default 20)
  - `max_total` (default 200)
  - If no `urls`, a default global list is used (BBC/CNN/Al Jazeera/Guardian/FT + defense/gov + Reuters + Google News mirrors).
<!-- news_telegram removed from current setup; do not use unless relay is configured -->
- `research_tech_events`
  - `limit` (default 200)
- `research_arxiv`
  - `query` (string)
  - `start` (number)
  - `max_results` (number)
- `research_trending_repos`
  - `language` (string)
  - `since` (string: daily/weekly/monthly)
- `research_hackernews`
  - `limit` (default 200)
- `trade_restrictions`
  - no params
- `trade_tariffs`
  - no params
- `trade_flows`
  - no params
- `trade_barriers`
  - no params
- `supply_chain_shipping`
  - no params
- `supply_chain_chokepoints`
  - no params
- `supply_chain_critical_minerals`
  - no params

### Geolocation / Satellite

- `geocode_place`
  - `query` (string)
  - `limit` (default 3)
- `geo_filters`
  - `bbox` (required)
  - `filters` (array of filters)
  - `max_per_type` (default 500)
- `satellite_snapshot`
  - `bbox` OR `center`
  - `center`: `{ "lat": <lat>, "lon": <lon>, "radius_km": <km> }`
  - `width`, `height` (default 1024, max 2048)
  - `source` (default `arcgis`)
  - Optional (WMS sources): `time`, `layer`, `wms_url`
  - Available sources:
    - `arcgis` (default)
    - `gibs_modis_truecolor`
    - `gibs_viirs_truecolor`
    - `eox_s2cloudless`
    - `custom_wms` (requires `wms_url` + `layer`)

### Aviation / Energy / Macro

- `aviation_delays`
  - no params
- `economic_macro`
  - no params
- `economic_energy`
  - no params
- `economic_bis_rates`
  - no params
- `economic_bis_fx`
  - no params
- `economic_bis_credit`
  - no params

### Positive / Giving

- `positive_events`
  - no params
- `giving_summary`
  - no params

## Common Parameters (Summary)

- `bbox`: `{ "west": <lon>, "south": <lat>, "east": <lon>, "north": <lat> }`
  - Used by `military_flights`, `geo_filters`.
- `limit`, `page_size`, `page`, `cursor`, `query`, `category`
  - Used by listing modules (predictions, unrest, conflicts, research, etc.)
- `filters`: list of OSM filters for `geo_filters`
  - Example: `["roundabout","street_sign","traffic_signals"]`

## Satellite Snapshot Example

```
GET /api/headless?module=satellite_snapshot&format=both&params={
  "bbox":{"west":-74.1,"south":40.6,"east":-73.7,"north":40.9},
  "width":1024,"height":1024
}
```

If unsure, call `module=list` and then test with `format=both` to inspect the JSON structure.

## WebSocket Alerts

You can subscribe with `alertsOnly=true` so the server only pushes when a rule matches.

Alert rule format:
```json
{
  "id": "rule-id",
  "label": "Human label",
  "module": "module_id",
  "path": "field.path",
  "mode": "count|delta|any",
  "op": "gt|gte|lt|lte|eq|contains|exists",
  "value": 10,
  "filter": { "field": "title", "op": "contains", "value": "nuclear" }
}
```

Notes:
- `mode=count` evaluates array length at `path`.
- `mode=delta` compares changes since last poll.
- `mode=any` checks if any item in an array matches `filter`.
