# Headless Module Output Snapshot

- Base: http://127.0.0.1:3000
- Captured: 2026-03-01T17:49:36.268Z
- Modules: 53

## geocode_place
- Description: Geocode a place name to coordinates (Nominatim)
- Status: 200
- Summary:
  - error: HTTP 400 /api/geocode: {"error":"Missing query"}

## satellite_snapshot
- Description: Generate satellite snapshot URL (ArcGIS default)
- Status: 200
- Summary:
  - data: object(keys=8)
  - durationMs: number
  - description: string

## predictions
- Description: Polymarket open prediction markets (gamma via sebuf)
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## polymarket_intel
- Description: Polymarket live trades + insider signals
- Status: 200
- Summary:
  - data: object(keys=4)
  - durationMs: number
  - description: string

## geo_filters
- Description: OSM geolocation filters (roundabouts, traffic signs, etc.)
- Status: 200
- Summary:
  - error: The operation was aborted due to timeout

## seismology_earthquakes
- Description: USGS earthquakes
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## wildfire_detections
- Description: NASA FIRMS fire detections
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## climate_anomalies
- Description: Climate anomalies
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## unrest_events
- Description: Protests and unrest (ACLED/GDELT)
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## conflict_acled
- Description: ACLED conflict events
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## conflict_ucdp_events
- Description: UCDP GED conflict events
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## conflict_hapi
- Description: HDX HAPI humanitarian conflict summary
- Status: 200
- Summary:
  - data: object(keys=0)
  - durationMs: number
  - description: string

## displacement_summary
- Description: UNHCR displacement summary
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## population_exposure
- Description: WorldPop exposure estimates
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## maritime_warnings
- Description: Navigational warnings
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## maritime_snapshot
- Description: AIS vessel snapshot and disruptions
- Status: 200
- Summary:
  - data: object(keys=0)
  - durationMs: number
  - description: string

## military_flights
- Description: Military flights (OpenSky/relay)
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## military_posture
- Description: Theater posture summary
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## military_usni
- Description: USNI Fleet report
- Status: 200
- Summary:
  - data: object(keys=4)
  - durationMs: number
  - description: string

## infrastructure_outages
- Description: Internet outages
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## infrastructure_cable_health
- Description: Undersea cable health
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## infrastructure_baseline
- Description: Infrastructure temporal baseline
- Status: 200
- Summary:
  - data: object(keys=4)
  - durationMs: number
  - description: string

## infrastructure_services
- Description: Service status checks
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## cyber_threats
- Description: Cyber threat IOCs
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## markets
- Description: Market quotes
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## markets_crypto
- Description: Crypto quotes
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## markets_commodities
- Description: Commodity quotes
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## markets_stablecoins
- Description: Stablecoin market data
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## markets_etf_flows
- Description: ETF flows
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## economic_macro
- Description: Macro signals
- Status: 200
- Summary:
  - data: object(keys=7)
  - durationMs: number
  - description: string

## economic_energy
- Description: Energy prices
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## economic_bis_rates
- Description: BIS policy rates
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## economic_bis_fx
- Description: BIS exchange rates
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## economic_bis_credit
- Description: BIS credit indicators
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## trade_restrictions
- Description: Trade restrictions
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## trade_tariffs
- Description: Tariff trends
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## trade_flows
- Description: Trade flows
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## trade_barriers
- Description: Trade barriers
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## supply_chain_shipping
- Description: Shipping rates
- Status: 200
- Summary:
  - error: HTTP 404 /api/supply-chain/v1/get-shipping-rates: {"error":"Not found"}

## supply_chain_chokepoints
- Description: Chokepoint status
- Status: 200
- Summary:
  - error: HTTP 404 /api/supply-chain/v1/get-chokepoint-status: {"error":"Not found"}

## supply_chain_critical_minerals
- Description: Critical minerals
- Status: 200
- Summary:
  - error: HTTP 404 /api/supply-chain/v1/get-critical-minerals: {"error":"Not found"}

## positive_events
- Description: Positive geo events
- Status: 200
- Summary:
  - error: The operation was aborted due to timeout

## giving_summary
- Description: Giving summary
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## research_tech_events
- Description: Tech events
- Status: 200
- Summary:
  - data: object(keys=7)
  - durationMs: number
  - description: string

## research_arxiv
- Description: Arxiv papers
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## research_trending_repos
- Description: Trending repos
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## research_hackernews
- Description: Hacker News
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string

## intelligence_risk_scores
- Description: Risk scores
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## intelligence_pizzint
- Description: PizzINT status
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## intelligence_gdelt
- Description: GDELT document search
- Status: 200
- Summary:
  - data: object(keys=3)
  - durationMs: number
  - description: string

## news_rss
- Description: RSS news feeds (parsed server-side)
- Status: 200
- Summary:
  - data: object(keys=2)
  - durationMs: number
  - description: string

## news_telegram
- Description: Telegram OSINT feed (relay)
- Status: 200
- Summary:
  - error: HTTP 503: {"error":"WS_RELAY_URL not configured"}

## aviation_delays
- Description: Airport delays
- Status: 200
- Summary:
  - data: object(keys=1)
  - durationMs: number
  - description: string
