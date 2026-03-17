# Spec 3: Free Data Feeds — No API Keys Required

## Overview

Add 25 new data feeds to the headless server (`server/api/headless.js`) and expose them as MCP tools. All feeds are free, public APIs requiring no API keys.

## New Modules

### Natural Disasters (4 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `natural_events_eonet` | `get_natural_events` | NASA EONET v3 | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50` | Active natural events: volcanoes, storms, floods, landslides, sea ice |
| `natural_events_gdacs` | `get_disaster_alerts` | GDACS | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?alertlevel=Green;Orange;Red&eventtype=EQ;TC;FL;VO;DR;WF` | Global disaster alerts with severity levels |
| `tropical_weather` | `get_tropical_weather` | NOAA NHC | `https://www.nhc.noaa.gov/CurrentSurges.json` + `https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json` | Active tropical cyclones, hurricanes, storm tracks |
| `weather_alerts` | `get_weather_alerts` | NWS | `https://api.weather.gov/alerts/active?status=actual&severity=Severe,Extreme` | Active US weather alerts (severe/extreme only) |

### Radiation Monitoring (2 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `radiation_epa` | `get_radiation_epa` | EPA RadNet | `https://radnet.epa.gov/cdx-radnet-rest/api/rest/csv/` | US radiation monitoring network sensor readings |
| `radiation_safecast` | `get_radiation_safecast` | Safecast | `https://api.safecast.org/measurements.json?distance=10000&order=created_at+desc&per_page=100` | Global citizen radiation sensor network |

### Sanctions (1 module)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `sanctions_ofac` | `get_sanctions` | OFAC Treasury | `https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML` | OFAC SDN sanctions list — designated persons, vessels, aircraft |

### Security & Health Advisories (3 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `travel_advisories` | `get_travel_advisories` | US State Dept + UK FCDO + NZ MFAT | `https://travel.state.gov/_res/rss/TAsTWs.xml` + `https://www.gov.uk/foreign-travel-advice.atom` + `https://www.safetravel.govt.nz/news/feed` | Government travel advisories from 3 countries |
| `health_advisories` | `get_health_advisories` | CDC + ECDC + WHO | `https://wwwnc.cdc.gov/travel/rss/notices.xml` + `https://www.ecdc.europa.eu/en/taxonomy/term/2942/feed` + `https://www.who.int/rss-feeds/news-english.xml` | Disease outbreaks, epidemiological updates, WHO alerts |
| `embassy_alerts` | `get_embassy_alerts` | US Embassies | `https://{cc}.usembassy.gov/category/alert/feed/` for 13+ countries (ua, il, cn, ru, ir, af, iq, sy, lb, pk, eg, sa, ye) | US Embassy security alerts by country |

### Country Intelligence (1 module)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `country_facts` | `get_country_facts` | RestCountries + Wikidata + Wikipedia | `https://restcountries.com/v3.1/alpha/{code}` + `https://query.wikidata.org/sparql` + `https://en.wikipedia.org/api/rest_v1/page/summary/{name}` | Country profile: head of state, population, languages, flag, Wikipedia summary |

### Economic Extended (4 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `fear_greed_index` | `get_fear_greed` | Alternative.me | `https://api.alternative.me/fng/?limit=30` | Crypto Fear & Greed Index (30-day history) |
| `bitcoin_hashrate` | `get_bitcoin_hashrate` | Mempool.space | `https://mempool.space/api/v1/mining/hashrate/1m` | Bitcoin network hashrate (1 month) |
| `us_spending` | `get_us_spending` | USASpending.gov | `https://api.usaspending.gov/api/v2/spending/` | US federal spending data |
| `us_treasury` | `get_us_treasury` | US Treasury Fiscal Data | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_9` | Monthly Treasury Statement data |

### Satellite Imagery (1 module)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `satellite_search` | `get_satellite_search` | AWS Element84 STAC | `https://earth-search.aws.element84.com/v1/search` | Search Sentinel-1/2 satellite imagery by bbox, returns scene URLs and previews |

### Geopolitical Context (2 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `worldbank_indicators` | `get_worldbank` | World Bank | `https://api.worldbank.org/v2/country/{code}/indicator/{indicator}?format=json&per_page=10&mrv=5` | World Bank development indicators (GDP, population, etc.) |
| `imf_data` | `get_imf_data` | IMF DataMapper | `https://www.imf.org/external/datamapper/api/v1/{indicator}/{country}` | IMF macroeconomic data (inflation, GDP growth, debt) |

### News Extended (2 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `aviation_news` | `get_aviation_news` | Aviation RSS | FlightGlobal + Simple Flying + AeroTime + The Points Guy RSS feeds | Aviation industry news |
| `defense_news` | `get_defense_news` | Defense RSS | Defense One + The War Zone + Defense News + gCaptain + Oryx RSS | Military and defense news |

### Enrichment (3 modules)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `sec_filings` | `get_sec_filings` | SEC EDGAR | `https://efts.sec.gov/LATEST/search-index?q={query}&dateRange=custom&startdt={date}&forms=8-K,10-K,10-Q` | SEC company filings search |
| `github_activity` | `get_github_activity` | GitHub API | `https://api.github.com/orgs/{org}/events` | GitHub org activity (public events) |
| `hn_search` | `get_hn_search` | HN Algolia | `https://hn.algolia.com/api/v1/search?query={q}&tags=story` | Search Hacker News stories |

### Correlation (1 module)

| Module ID | MCP Tool | Source | URL | Description |
|-----------|----------|--------|-----|-------------|
| `news_velocity` | `get_news_velocity` | Internal | Computed from `news_rss` results | News velocity scoring — counts articles per topic/region per hour, flags anomalies vs baseline |

**Total: 25 new modules → 25 new MCP tools**

## Implementation Pattern

Each new module follows the existing pattern in `server/api/headless.js`:

```javascript
new_module_id: {
  description: 'Description here',
  run: async (ctx, params) => {
    // fetch from external API
    // transform/normalize response
    // return { data: {...}, durationMs, description, cached }
  },
},
```

For RSS-based modules (travel_advisories, health_advisories, embassy_alerts, aviation_news, defense_news), reuse the existing RSS fetching pattern from `news_rss`.

For modules that aggregate multiple sources (travel_advisories = 3 feeds, health_advisories = 3 feeds), use `Promise.allSettled()` to fetch all sources in parallel.

## MCP Tool Registration

Each new module gets one entry in `mcp/src/osint_mcp/tools/__init__.py`:

```python
{
    "tool_name": "get_natural_events",
    "module_id": "natural_events_eonet",
    "description": "Get active natural events from NASA EONET (volcanoes, storms, floods).",
},
```

## Required Parameters

| Tool | Required Params |
|------|----------------|
| `get_country_facts` | `query: str` (country name or ISO code) |
| `get_worldbank` | `query: str` (country code), `indicator: str` (e.g., "NY.GDP.MKTP.CD") |
| `get_imf_data` | `query: str` (country code), `indicator: str` (e.g., "NGDP_RPCH") |
| `get_satellite_search` | `bbox: str` (bounding box) |
| `get_sec_filings` | `query: str` (company name or ticker) |
| `get_github_activity` | `query: str` (org name) |
| `get_hn_search` | `query: str` (search term) |

All other tools have no required parameters.

## Builder Work Split

### Builder 1: Natural Disasters + Radiation + Sanctions (7 modules)
- `natural_events_eonet`, `natural_events_gdacs`, `tropical_weather`, `weather_alerts`
- `radiation_epa`, `radiation_safecast`
- `sanctions_ofac`

### Builder 2: Advisories + Country Intel + Economic (8 modules)
- `travel_advisories`, `health_advisories`, `embassy_alerts`
- `country_facts`
- `fear_greed_index`, `bitcoin_hashrate`, `us_spending`, `us_treasury`

### Builder 3: Satellite + News + Enrichment + Correlation (10 modules)
- `satellite_search`
- `worldbank_indicators`, `imf_data`
- `aviation_news`, `defense_news`
- `sec_filings`, `github_activity`, `hn_search`
- `news_velocity`

Each builder:
1. Adds modules to `server/api/headless.js`
2. Adds tool entries to `mcp/src/osint_mcp/tools/__init__.py`
3. Tests by starting the headless server and curling the new modules
4. Commits to a branch

## Testing

For each new module:
```bash
# Start server
cd server && PORT=3000 node --import tsx server.mjs

# Test module
curl -s "http://localhost:3000/api/headless?module=MODULE_ID&format=json" | python3 -m json.tool | head -30
```

Verify:
- Returns valid JSON with `data` key
- Data is current (not empty unless genuinely no events)
- Error handling returns `{ error: "..." }` not crashes
- Timeout handling works (some upstream APIs are slow)

## Updated Tool Count

Current: 57 MCP tools
New: 25 MCP tools
**Total after: 82 MCP tools**
