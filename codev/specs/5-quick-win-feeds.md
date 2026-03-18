# Spec 5: Quick-Win Free Feeds

**Date**: 2026-03-18
**Status**: Specified
**Effort**: ~30 min per feed (plugin files, no headless.js edits)

## Goal

Add 5 high-value OSINT feeds that require no API keys, no auth, and can each be implemented as a single `server/api/modules/*.mjs` plugin file. Auto-discovered by MCP.

## Feeds

### 5.1 URLhaus (Malware URL Tracking)

**Source**: abuse.ch URLhaus
**API**: `https://urlhaus-api.abuse.ch/v1/urls/recent/` (POST, no auth)
**Data**: Malicious URLs — phishing, malware distribution, C2 callbacks
**Why**: Complements ThreatFox (IOCs) and CISA KEV (CVEs). URLhaus tracks the delivery mechanism — where malware is hosted.
**Params**: `limit` (default 100)
**Response shape**:
```json
{
  "urls": [
    { "url": "http://evil.com/payload.exe", "url_status": "online", "threat": "malware_download",
      "host": "evil.com", "date_added": "2026-03-18", "tags": ["emotet"], "reporter": "abuse_ch" }
  ]
}
```

### 5.2 NVD/CVE (Vulnerability Database)

**Source**: NIST National Vulnerability Database
**API**: `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=50&pubStartDate=...` (GET, no auth, 5 req/30s)
**Data**: CVEs with CVSS scores, descriptions, affected products, references
**Why**: CISA KEV only tracks actively exploited CVEs (~1200 total). NVD has all 250K+ CVEs. Agents can look up any CVE or search by product.
**Params**: `query` (keyword/CVE ID search), `limit`, `days` (lookback, default 7)
**Response shape**:
```json
{
  "vulnerabilities": [
    { "cveId": "CVE-2026-1234", "description": "...", "cvssScore": 9.8, "severity": "CRITICAL",
      "product": "Apache Log4j", "vendor": "Apache", "published": "2026-03-17", "references": [...] }
  ]
}
```
**Rate limit**: 5 requests per 30 seconds (no auth), 50 per 30s with API key.

### 5.3 Tor Exit Nodes

**Source**: Tor Project
**API**: `https://check.torproject.org/torbulkexitlist` (GET, plain text, no auth)
**Alt**: `https://onionoo.torproject.org/details?type=relay&running=true&flag=Exit` (JSON, richer)
**Data**: Current list of Tor exit relay IPs with bandwidth, country, flags
**Why**: Essential for threat analysis — "is this IP a Tor exit node?" Cross-reference with cyber threat IOCs.
**Params**: `query` (search by IP, country), `limit`
**Response shape**:
```json
{
  "exitNodes": [
    { "ip": "185.220.101.1", "nickname": "niftyFedora", "country": "DE", "bandwidthMbps": 50,
      "firstSeen": "2024-01-15", "flags": ["Exit", "Fast", "Guard", "Stable", "Valid"] }
  ],
  "totalNodes": 1200
}
```

### 5.4 NOAA Space Weather

**Source**: NOAA Space Weather Prediction Center (SWPC)
**APIs**:
- `https://services.swpc.noaa.gov/json/solar_probabilities.json` — solar flare probability
- `https://services.swpc.noaa.gov/products/alerts.json` — space weather alerts
- `https://services.swpc.noaa.gov/products/noaa-scales.json` — current G/S/R scales
- `https://services.swpc.noaa.gov/json/geospace/geospace_dst_1_hour.json` — geomagnetic Dst index
**Data**: Solar flare forecasts, geomagnetic storm levels (G1-G5), radio blackouts (R1-R5), solar radiation storms (S1-S5)
**Why**: Geomagnetic storms affect GPS, HF radio, satellite comms, power grids. G3+ storms are operationally significant for military/aviation.
**Params**: none required (real-time data)
**Response shape**:
```json
{
  "currentScales": { "geomagneticStorm": "G0", "solarRadiation": "S0", "radioBlackout": "R0" },
  "alerts": [...],
  "solarFlareProb": { "c_class": 70, "m_class": 30, "x_class": 5 },
  "dst": { "latest": -15, "min24h": -25, "trend": "stable" }
}
```

### 5.5 IODA Internet Outages

**Source**: Georgia Tech IODA (Internet Outage Detection and Analysis)
**API**: `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/XX?from=...&until=...` (GET, no auth)
**Data**: BGP, Active Probing, and DNS-based internet outage detection per country/region
**Why**: Replaces the broken Shadowserver/Cloudflare outage module. IODA has better methodology — 3 independent detection methods triangulated.
**Params**: `query` (country code), `hours` (lookback, default 24)
**Response shape**:
```json
{
  "country": "IR",
  "signals": {
    "bgp": { "score": 0.95, "normal": true },
    "activeProbing": { "score": 0.87, "normal": true },
    "darknet": { "score": 0.92, "normal": true }
  },
  "outageDetected": false,
  "history": [...]
}
```

## Implementation

Each feed is one file in `server/api/modules/`:
```
server/api/modules/
  urlhaus_urls.mjs
  nvd_cves.mjs
  tor_exit_nodes.mjs
  space_weather.mjs
  ioda_outages.mjs
```

No changes to headless.js, MCP registry, or any other file. Plugin loader + auto-discovery handles everything.

## Testing

Each module tested via:
```bash
curl -s 'http://localhost:3000/api/headless?module=MODULE_NAME' | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2)[:500])"
```

## Acceptance

- [ ] Each module returns data with no errors
- [ ] Each module has `search` + `filter` support via MCP auto-discovery
- [ ] No API keys required
- [ ] Total time: <3 hours for all 5
