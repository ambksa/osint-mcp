# osint-mcp Tool Reference

**Version**: 0.2.0 | **Tools**: 82 curated | **Sources**: 55+ RSS, 45+ APIs

## Quick Start

```bash
# Docker
docker compose up
# MCP at http://localhost:8080/mcp

# Local
cd server && npm install && PORT=3000 node --import tsx server.mjs &
cd mcp && uv sync && uv run osint-mcp
```

## Tool Categories

### System (3)
| Tool | Description |
|------|-------------|
| `version` | Git commit, tool counts, server health |
| `health_check` | Verify server connectivity |
| `list_modules` | List all available module IDs |

### Aggregate Intelligence (2)
| Tool | Params | Description |
|------|--------|-------------|
| `intelligence_report` | **query**, keywords | Full intelligence report — queries 14+ modules in parallel, filters by keywords |
| `get_intelligence_summary` | | Synthesized risk scores across all domains |

### Aircraft (1)
| Tool | Params | Description |
|------|--------|-------------|
| `get_aircraft` | **bbox**, callsign, registration, aircraft_type, squawk, airline, military, on_ground, min/max_altitude_ft, min_speed_kts, emergency, limit | FlightRadar24 feed — 400+ aircraft/region, origin→destination routes, military auto-tagged |

### Cyber Threat Intelligence (7)
| Tool | Params | Description |
|------|--------|-------------|
| `get_cyber_threats` | limit | Feodo C2 server IOCs |
| `get_cisa_kev` | **query** | CISA Known Exploited Vulnerabilities |
| `get_ransomware` | limit | RansomLook victim posts |
| `get_threatfox` | limit | abuse.ch malware IOCs |
| `get_urlhaus_urls` | limit | Malware distribution URLs |
| `get_nvd_cves` | **query** | NIST NVD vulnerability database with CVSS |
| `get_cyber_news` | | Krebs, Hacker News, BleepingComputer, Ars Technica |

### Natural Events & Weather (7)
| Tool | Params | Description |
|------|--------|-------------|
| `get_earthquakes` | limit, bbox | USGS earthquake data |
| `get_climate_anomalies` | limit | NOAA/ERA5 climate anomalies |
| `get_natural_events` | limit | NASA EONET (volcanoes, storms, floods) |
| `get_disaster_alerts` | limit | GDACS global disaster alerts |
| `get_tropical_weather` | | NOAA NHC tropical cyclones |
| `get_weather_alerts` | limit | NWS US severe weather |
| `get_space_weather` | | NOAA solar flares, geomagnetic storms (G/R/S scales) |

### Civil Defense (1)
| Tool | Params | Description |
|------|--------|-------------|
| `get_civil_defense_alerts` | query (country code) | WMO CAP alerts from 95+ countries |

### Markets & Crypto (4)
| Tool | Description |
|------|-------------|
| `get_crypto` | CoinGecko cryptocurrency quotes |
| `get_stablecoins` | Stablecoin market data |
| `get_fear_greed` | Crypto Fear & Greed Index (30-day) |
| `get_bitcoin_hashrate` | Bitcoin network hashrate (1 month) |

### Economics (7)
| Tool | Params | Description |
|------|--------|-------------|
| `get_economic_macro` | | FRED macro signals (GDP, unemployment, CPI) |
| `get_bis_rates` | | BIS central bank policy rates (11 economies) |
| `get_bis_fx` | | BIS exchange rates |
| `get_us_spending` | limit | USASpending.gov federal spending |
| `get_us_treasury` | limit | Monthly Treasury Statement |
| `get_worldbank` | **query** (country), **indicator** | World Bank development indicators |
| `get_imf_data` | **query** (country), **indicator** | IMF macroeconomic data |

### Trade (2)
| Tool | Params | Description |
|------|--------|-------------|
| `get_trade_comtrade` | **query** (reporter country) | UN Comtrade trade flows |
| `get_tariff_rates` | **query** (country) | World Bank WITS MFN tariff rates |

### Supply Chain (2)
| Tool | Description |
|------|-------------|
| `get_chokepoints` | Maritime chokepoint status (Suez, Panama, Hormuz, Malacca) |
| `get_critical_minerals` | Critical mineral supply data |

### News & Intelligence (11)
| Tool | Params | Description | Sources |
|------|--------|-------------|---------|
| `get_news_rss` | limit | General world news | BBC, Reuters, AP, CNN, Guardian +10 |
| `get_gdelt` | **query** | GDELT article search | GDELT Doc API (rate-limited) |
| `get_gdelt_events` | **query** | GDELT structured events (bulk, no rate limit) | 1500 events/15min with CAMEO codes |
| `get_news_velocity` | | Article frequency anomaly detection | RSS analysis |
| `get_aviation_news` | | Aviation industry news | 4 feeds |
| `get_defense_news` | | Defense news (legacy) | 4 feeds |
| `get_security_intel_feeds` | | OSINT & conflict analysis | Bellingcat, Crisis Group, War on the Rocks, Oryx, Jamestown, Foreign Policy |
| `get_defense_military_feeds` | | Military & defense industry | Defense News, Military Times, Breaking Defense, USNI, DefenseOne, War Zone, Task & Purpose, UK MOD |
| `get_cyber_news` | | Cybersecurity reporting | Krebs, Hacker News, BleepingComputer |
| `get_maritime_news` | | Shipping & naval | gCaptain, maritime news |
| `get_policy_feeds` | | Think tank analysis | CSIS, Arms Control, FAS, Bulletin, MEI, Brookings, Carnegie, Chatham House |
| `get_regional_conflict_feeds` | | Regional hotspots | BBC ME/Africa/Asia/LatAm, Sahel, InSight Crime |

### Military (1)
| Tool | Description |
|------|-------------|
| `get_military_usni` | USNI Fleet tracker — US Navy ship deployments worldwide |

### Research (3)
| Tool | Params | Description |
|------|--------|-------------|
| `get_tech_events` | limit | Technology events and conferences |
| `get_arxiv` | **query** | arXiv paper search |
| `get_hackernews` | limit | Hacker News top stories |

### Geolocation & Satellite (3)
| Tool | Params | Description |
|------|--------|-------------|
| `get_geocode` | **query** | Place name → coordinates (Nominatim) |
| `get_satellite_snapshot` | **query** | Satellite imagery URLs |
| `get_satellite_search` | **bbox** | Sentinel-2 satellite imagery search |

### Security & Sanctions (6)
| Tool | Params | Description |
|------|--------|-------------|
| `get_sanctions` | **query** | OFAC SDN sanctions list |
| `get_opensanctions` | **query** | 78K entities from 40+ sanctions lists |
| `get_travel_advisories` | **query** | US/UK/NZ government travel advisories |
| `get_health_advisories` | limit | CDC, ECDC, WHO disease outbreaks |
| `get_embassy_alerts` | | US Embassy security alerts |
| `get_country_facts` | **query** | Country profiles with demographics |

### Humanitarian (3)
| Tool | Description |
|------|-------------|
| `get_displacement` | UNHCR refugee/IDP data |
| `get_population_exposure` | WorldPop population exposure |
| `get_giving_summary` | Humanitarian funding summary |

### Infrastructure (4)
| Tool | Params | Description |
|------|--------|-------------|
| `get_infrastructure_outages` | | BGP internet outages |
| `get_infrastructure_services` | limit | Service availability (30+ platforms) |
| `get_submarine_cables` | **query** | 700+ undersea cables |
| `get_ioda_outages` | **query** (country) | IODA internet detection (BGP + Google Traffic + probing) |

### Intelligence (3)
| Tool | Params | Description |
|------|--------|-------------|
| `get_intelligence_findings` | | Prioritized alerts from 11 modules |
| `get_country_risk_signals` | **query** (country) | Raw risk evidence from 9 feeds, 72 countries |
| `get_pizzint` | | Pentagon Pizza Index |

### Other (4)
| Tool | Params | Description |
|------|--------|-------------|
| `get_radiation_safecast` | limit | Safecast radiation sensors |
| `get_aviation_delays` | | FAA airport delays |
| `get_tor_exit_nodes` | **query** | Current Tor exit relays |
| `query_modules` | **modules** | Query any modules by comma-separated IDs |

### Enrichment (3)
| Tool | Params | Description |
|------|--------|-------------|
| `get_sec_filings` | **query** | SEC EDGAR filings (8-K, 10-K, 10-Q) |
| `get_github_activity` | **query** | GitHub org public events |
| `get_hn_search` | **query** | Hacker News story search |

### Financial (5, API key required)
| Tool | Params | Key | Description |
|------|--------|-----|-------------|
| `get_fred_series` | **query** (series ID) | FRED_API_KEY | FRED economic time series |
| `get_fmp_quote` | **query** (ticker) | FMP_API_KEY | Real-time stock quotes |
| `get_fmp_profile` | **query** (ticker) | FMP_API_KEY | Company profiles |
| `get_fmp_ratios` | **query** (ticker) | FMP_API_KEY | TTM financial ratios |
| `get_fmp_estimates` | **query** (ticker) | FMP_API_KEY | Analyst estimates |

## Universal Params (all tools)

Every tool accepts:
- `search` — text search across all result fields
- `filter` — JSON field filters: `'{"magnitude": ">5", "country": "Iran"}'`
- `limit` — max results
- `format` — `json` (default), `md`, `both`

## Response Format

```json
{
  "data": { ... },           // tool-specific data
  "durationMs": 406,         // execution time
  "cached": false,           // whether result was cached
  "cacheTtlMs": 300000,      // cache TTL
  "_meta": {
    "fetchedAt": "ISO date",
    "fromCache": false
  }
}
```

## Adding New Tools

Drop a `.mjs` file in `server/api/modules/`:

```javascript
export const name = 'my_feed';
export const description = 'My data source';
export async function run(_ctx, params) {
  const resp = await fetch('https://api.example.com/data');
  return await resp.json();
}
```

Then add to `mcp/src/osint_mcp/tools/__init__.py` TOOL_REGISTRY for curated exposure.
