# Honest Comparison: osint-mcp vs WorldMonitor Headless

## What WorldMonitor Headless Is

WorldMonitor (github.com/koala73/worldmonitor) is the **original project** by Elie Habib. It's a full-stack real-time intelligence dashboard with 41K GitHub stars. Our `server/` directory is a **fork of its headless backend**.

This comparison is between what we built on top (the MCP layer + plugins) vs the original headless API.

## What We Added

| Capability | WorldMonitor Headless | osint-mcp |
|-----------|----------------------|-----------|
| **Interface** | REST API only (`/api/headless`) | MCP Protocol (any AI agent can query) |
| **Tool curation** | 110 raw modules, ~30 broken | 81 curated, all verified working |
| **Search/filter** | None — get all data, parse yourself | Universal `search` + `filter` on every tool |
| **Aircraft** | OpenSky only (rate-limited, filters military) | FlightRadar24 (400 vs 28, routes, military tagged) |
| **GDELT** | Doc API (rate-limited, 429s constantly) | Bulk exports (1500 events/15min, no limits) |
| **Sanctions** | OFAC only | OFAC + OpenSanctions (78K entities, 40+ lists) |
| **News feeds** | 15 in headless, 425 in dashboard | 55 curated across 7 thematic categories |
| **Internet outages** | Cloudflare Radar (needs API key we don't have) | IODA (free, no auth, multi-signal) |
| **Cyber** | 1 IOC (broken Feodo integration) | 7 tools (CISA KEV, ransomware, ThreatFox, URLhaus, NVD, Feodo, cyber news) |
| **Civil defense** | None | WMO CAP protocol, 95+ countries |
| **Trade data** | WTO/OECD (broken upstream) | UN Comtrade + WITS (working) |
| **Country risk** | Static CII scores (all dynamic=0) | Raw evidence from 9 live feeds, 72 countries |
| **Intelligence findings** | 1 finding from 2 sources (5 broken) | All sources uncapped, agent controls limit |
| **Plugin system** | None — edit headless.js | Drop a `.mjs` file, auto-discovered |
| **Space weather** | None | NOAA SWPC solar/geomagnetic |
| **Vulnerability DB** | None | NIST NVD with CVSS search |
| **Malware URLs** | None | abuse.ch URLhaus |

## What WorldMonitor Has That We Don't

This is the honest part. WorldMonitor's dashboard and original server have capabilities we haven't replicated:

| Capability | Status | Why we don't have it |
|-----------|--------|---------------------|
| **AIS vessel tracking** | They have WebSocket relay | Needs persistent connection infrastructure |
| **GPS jamming detection** | GPSJam.org integration | No free API — need ADS-B Exchange paid tier |
| **Thermal escalation** | NASA FIRMS + z-score anomaly | FIRMS API returns 0 for us (may need key) |
| **Telegram OSINT relay** | WebSocket relay to channels | Needs Railway relay infrastructure |
| **435 RSS feeds** | Full multilingual coverage | We have 55 — could add more |
| **AI summarization** | Groq/OpenRouter article summary | Could add but needs LLM API key |
| **AI event classification** | Groq-powered classification | Same — needs LLM key |
| **Country intel briefs** | OpenRouter-generated briefs | Same |
| **In-browser ML** | ONNX models for NER/sentiment | MCP is server-side, agents have their own ML |
| **Correlation engine** | Cross-domain signal convergence | We have raw signals, agents do correlation |
| **45 map layers** | Visual dashboard | We're API-first, not dashboard |
| **Desktop app** | Tauri (Mac/Win/Linux) | We're MCP-first |
| **21 languages** | Multilingual RSS feeds | We have English only |
| **Stock analysis/backtest** | AI-powered with Finnhub | Needs Finnhub API key |
| **Prediction markets** | Polymarket integration | Polymarket API is 502 for us |
| **OREF Israel alerts** | Geo-blocked to Israeli IPs | Would need VPN/proxy |
| **Satellite TLE tracking** | Orbital positions | Could add (CelesTrak is free) |

## What We Do Better

**1. Agent accessibility.** WorldMonitor's 110 modules are a raw REST API. An agent needs to know the exact module names, param formats, and parse the responses. Our MCP tools have typed params, descriptions with examples, universal search/filter, and are discoverable via the MCP protocol.

**2. Data quality.** WorldMonitor has ~30 modules that silently return empty data (ACLED, UCDP, maritime, military flights, trade, etc.). We audited every module, removed broken ones, and only expose working tools. An agent calling our tools gets data — not empty arrays.

**3. Aircraft coverage.** WorldMonitor uses OpenSky which has ~0 receivers in the Gulf. We use FlightRadar24 which sees 400+ aircraft in the same area. We also auto-tag military aircraft by callsign prefix.

**4. GDELT.** WorldMonitor's GDELT integration hits the rate-limited Doc API and gets 429 errors constantly. Ours downloads bulk exports — 1,500 structured events per 15-minute window with zero rate limiting.

**5. Cyber intel.** WorldMonitor has 1 Feodo C2 IOC. We have 7 cyber tools — CISA KEV actively exploited CVEs, ransomware victim tracking, ThreatFox IOCs, URLhaus malware URLs, NVD vulnerability search, plus Krebs/HackerNews for cyber news.

**6. Sanctions.** WorldMonitor has OFAC SDN only (~7K entities, US only). We added OpenSanctions — 78K entities from 40+ lists (EU, UN, UK, AU, PEPs).

**7. Extensibility.** Adding a feed to WorldMonitor means editing the 2,800-line headless.js. Adding a feed to osint-mcp means dropping a 30-line `.mjs` plugin file.

## What WorldMonitor Does Better

**1. Visual dashboard.** WorldMonitor is a beautiful real-time map with 45 data layers. We're a headless API. If you need to see aircraft on a map, use WorldMonitor.

**2. RSS coverage.** 425 feeds in 21 languages vs our 55 in English. For multilingual OSINT, WorldMonitor wins.

**3. AIS maritime tracking.** They have a working WebSocket relay to AIS data. Our entire maritime domain is dead (broken modules) — we only have maritime news, not live vessel positions.

**4. AI analysis.** WorldMonitor has LLM-powered article summarization, event classification, and country intelligence briefs. We return raw data and let agents do the analysis — which is arguably better for agent-first architecture but means more work for the consuming agent.

**5. Desktop app.** Tauri-based native app vs our CLI/MCP server.

**6. Scale of data.** WorldMonitor handles all 110 modules and 22 protobuf services — we cherry-pick the 81 that work. The other 29 are dead upstream APIs, but if/when they come back, WorldMonitor would have them first.

## Bottom Line

**WorldMonitor** is a complete intelligence dashboard designed for human analysts who want to see data visually. It has broader raw data coverage but many broken integrations.

**osint-mcp** is an agent-first intelligence API designed for AI systems. It has fewer data sources but every one works, every tool is curated for agent consumption, and the plugin system makes it trivial to extend.

They're complementary. WorldMonitor's headless server IS our backend. We added the MCP protocol, curated the tools, fixed the broken feeds, added new data sources (FR24, GDELT bulk, OpenSanctions, NVD, URLhaus, civil defense, thematic news), and built an extensibility system on top.

If you want a dashboard, use WorldMonitor. If you want AI agents to query OSINT data, use osint-mcp.
