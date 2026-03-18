"""Declarative tool registry and dynamic registration for osint-mcp.

Adding a new OSINT module = adding one entry to TOOL_REGISTRY below.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from osint_mcp.tools.aggregate import register_aggregate_tools

if TYPE_CHECKING:
    from fastmcp import FastMCP
    from osint_mcp.client import HeadlessClient


# ---------------------------------------------------------------------------
# Declarative registry
#
# Each entry defines one MCP tool backed by a single headless module.
#   - tool_name:       MCP tool name exposed to agents
#   - module_id:       worldosint-headless module identifier
#   - description:     Tool docstring (shown in MCP tool listing)
#   - required_params: dict of {param_name: type} that are mandatory
#   - optional_params: dict of {param_name: (type, default)} that are optional
#
# Every tool also gets the standard `format` optional param automatically.
# ---------------------------------------------------------------------------

TOOL_REGISTRY: list[dict] = [
    # ── Conflict & Unrest ──────────────────────────────────────────────
    {
        "tool_name": "get_conflict_acled",
        "module_id": "conflict_acled",
        "description": "Get armed conflict events from ACLED.",
    },
    {
        "tool_name": "get_conflict_ucdp",
        "module_id": "conflict_ucdp_events",
        "description": "Get UCDP conflict events.",
    },
    {
        "tool_name": "get_conflict_hapi",
        "module_id": "conflict_hapi",
        "description": "Get HDX HAPI humanitarian conflict summary.",
    },
    {
        "tool_name": "get_unrest_events",
        "module_id": "unrest_events",
        "description": "Get protest and civil unrest events.",
    },
    # ── Maritime ───────────────────────────────────────────────────────
    {
        "tool_name": "get_maritime_warnings",
        "module_id": "maritime_warnings",
        "description": "Get active navigational warnings.",
    },
    {
        "tool_name": "get_maritime_snapshot",
        "module_id": "maritime_snapshot",
        "description": "Get AIS vessel position snapshot.",
    },
    # ── Military ──────────────────────────────────────────────────────
    {
        "tool_name": "get_military_flights",
        "module_id": "military_flights",
        "description": "Get military aircraft tracking data. Requires bbox (bounding box).",
        "required_params": {"bbox": str},
    },
    {
        "tool_name": "get_military_posture",
        "module_id": "military_posture",
        "description": "Get theater posture summary.",
    },
    {
        "tool_name": "get_military_usni",
        "module_id": "military_usni",
        "description": "Get USNI Fleet tracker report.",
    },
    # ── Cyber ─────────────────────────────────────────────────────────
    {
        "tool_name": "get_cyber_threats",
        "module_id": "cyber_threats",
        "description": "Get cyber threat IOCs and alerts.",
    },
    # ── Infrastructure ────────────────────────────────────────────────
    {
        "tool_name": "get_infrastructure_outages",
        "module_id": "infrastructure_outages",
        "description": "Get internet outage events.",
    },
    {
        "tool_name": "get_infrastructure_cable_health",
        "module_id": "infrastructure_cable_health",
        "description": "Get undersea cable status.",
    },
    {
        "tool_name": "get_infrastructure_baseline",
        "module_id": "infrastructure_baseline",
        "description": "Get temporal baseline metrics.",
    },
    {
        "tool_name": "get_infrastructure_services",
        "module_id": "infrastructure_services",
        "description": "Get service availability checks.",
    },
    # ── Natural Events ────────────────────────────────────────────────
    {
        "tool_name": "get_earthquakes",
        "module_id": "seismology_earthquakes",
        "description": "Get USGS earthquake data including magnitude, location, and depth.",
    },
    {
        "tool_name": "get_wildfires",
        "module_id": "wildfire_detections",
        "description": "Get NASA FIRMS fire detections.",
    },
    {
        "tool_name": "get_climate_anomalies",
        "module_id": "climate_anomalies",
        "description": "Get climate anomaly tracking data.",
    },
    # ── Markets ───────────────────────────────────────────────────────
    {
        "tool_name": "get_markets",
        "module_id": "markets",
        "description": "Get stock and index quotes.",
    },
    {
        "tool_name": "get_crypto",
        "module_id": "markets_crypto",
        "description": "Get cryptocurrency quotes.",
    },
    {
        "tool_name": "get_commodities",
        "module_id": "markets_commodities",
        "description": "Get commodity prices.",
    },
    {
        "tool_name": "get_stablecoins",
        "module_id": "markets_stablecoins",
        "description": "Get stablecoin market data.",
    },
    {
        "tool_name": "get_etf_flows",
        "module_id": "markets_etf_flows",
        "description": "Get ETF fund flow data.",
    },
    # ── Economics ──────────────────────────────────────────────────────
    {
        "tool_name": "get_economic_macro",
        "module_id": "economic_macro",
        "description": "Get FRED macro economic signals.",
    },
    {
        "tool_name": "get_economic_energy",
        "module_id": "economic_energy",
        "description": "Get energy prices and data.",
    },
    {
        "tool_name": "get_bis_rates",
        "module_id": "economic_bis_rates",
        "description": "Get BIS central bank policy rates.",
    },
    {
        "tool_name": "get_bis_fx",
        "module_id": "economic_bis_fx",
        "description": "Get BIS exchange rates.",
    },
    {
        "tool_name": "get_bis_credit",
        "module_id": "economic_bis_credit",
        "description": "Get BIS credit indicators.",
    },
    # ── Trade ─────────────────────────────────────────────────────────
    {
        "tool_name": "get_trade_flows",
        "module_id": "trade_flows",
        "description": "Get international trade flow data.",
    },
    {
        "tool_name": "get_trade_tariffs",
        "module_id": "trade_tariffs",
        "description": "Get tariff trends.",
    },
    {
        "tool_name": "get_trade_restrictions",
        "module_id": "trade_restrictions",
        "description": "Get trade restrictions data.",
    },
    {
        "tool_name": "get_trade_barriers",
        "module_id": "trade_barriers",
        "description": "Get trade barriers data.",
    },
    # ── Supply Chain ──────────────────────────────────────────────────
    {
        "tool_name": "get_shipping_rates",
        "module_id": "supply_chain_shipping",
        "description": "Get container shipping rates.",
    },
    {
        "tool_name": "get_chokepoints",
        "module_id": "supply_chain_chokepoints",
        "description": "Get maritime chokepoint status.",
    },
    {
        "tool_name": "get_critical_minerals",
        "module_id": "supply_chain_critical_minerals",
        "description": "Get critical mineral supply data.",
    },
    # ── News & Intelligence ───────────────────────────────────────────
    {
        "tool_name": "get_news_rss",
        "module_id": "news_rss",
        "description": "Get aggregated RSS news feeds.",
    },
    {
        "tool_name": "get_news_telegram",
        "module_id": "news_telegram",
        "description": "Get Telegram OSINT channel relay.",
    },
    {
        "tool_name": "get_gdelt",
        "module_id": "intelligence_gdelt",
        "description": "Search GDELT global event database. Query with keywords like 'Iran conflict' or 'Dubai trade'. Defaults to 'conflict OR protest' if no query given.",
        "required_params": {"query": str},
    },
    # ── Research ──────────────────────────────────────────────────────
    {
        "tool_name": "get_tech_events",
        "module_id": "research_tech_events",
        "description": "Get technology events and conferences.",
    },
    {
        "tool_name": "get_arxiv",
        "module_id": "research_arxiv",
        "description": "Search recent arXiv papers by topic. Query with keywords like 'large language models' or 'quantum computing'.",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_trending_repos",
        "module_id": "research_trending_repos",
        "description": "Get GitHub trending repositories.",
    },
    {
        "tool_name": "get_hackernews",
        "module_id": "research_hackernews",
        "description": "Get Hacker News top stories.",
    },
    # ── Prediction Markets ────────────────────────────────────────────
    {
        "tool_name": "get_predictions",
        "module_id": "predictions",
        "description": "Get Polymarket prediction markets.",
    },
    {
        "tool_name": "get_polymarket_intel",
        "module_id": "polymarket_intel",
        "description": "Get Polymarket live trades and signals.",
    },
    # ── Geolocation ───────────────────────────────────────────────────
    {
        "tool_name": "get_geocode",
        "module_id": "geocode_place",
        "description": "Geocode a place name to coordinates. Requires query string.",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_geo_filters",
        "module_id": "geo_filters",
        "description": "Get OSM geolocation filters.",
    },
    {
        "tool_name": "get_satellite_snapshot",
        "module_id": "satellite_snapshot",
        "description": "Get satellite imagery URL generation.",
    },
    # ── Humanitarian ──────────────────────────────────────────────────
    {
        "tool_name": "get_displacement",
        "module_id": "displacement_summary",
        "description": "Get UNHCR displacement data.",
    },
    {
        "tool_name": "get_population_exposure",
        "module_id": "population_exposure",
        "description": "Get WorldPop population exposure estimates.",
    },
    {
        "tool_name": "get_giving_summary",
        "module_id": "giving_summary",
        "description": "Get philanthropic giving data.",
    },
    # ── Miscellaneous ─────────────────────────────────────────────────
    {
        "tool_name": "get_aviation_delays",
        "module_id": "aviation_delays",
        "description": "Get airport delay tracking data.",
    },
    {
        "tool_name": "get_positive_events",
        "module_id": "positive_events",
        "description": "Get positive geopolitical events.",
    },
    {
        "tool_name": "get_risk_scores",
        "module_id": "intelligence_risk_scores",
        "description": "Get risk scoring by region.",
    },
    {
        "tool_name": "get_pizzint",
        "module_id": "intelligence_pizzint",
        "description": "Get PizzINT status monitor.",
    },
    # ── Spec 3: Natural Disasters ────────────────────────────────────
    {
        "tool_name": "get_natural_events",
        "module_id": "natural_events_eonet",
        "description": "Get active natural events from NASA EONET (volcanoes, storms, floods, landslides).",
    },
    {
        "tool_name": "get_disaster_alerts",
        "module_id": "natural_events_gdacs",
        "description": "Get GDACS global disaster alerts with severity levels.",
    },
    {
        "tool_name": "get_tropical_weather",
        "module_id": "tropical_weather",
        "description": "Get NOAA NHC active tropical cyclones and storm tracks.",
    },
    {
        "tool_name": "get_weather_alerts",
        "module_id": "weather_alerts",
        "description": "Get active US weather alerts (severe/extreme) from NWS.",
    },
    # ── Spec 3: Radiation Monitoring ─────────────────────────────────
    {
        "tool_name": "get_radiation_epa",
        "module_id": "radiation_epa",
        "description": "Get EPA RadNet US radiation monitoring sensor readings.",
    },
    {
        "tool_name": "get_radiation_safecast",
        "module_id": "radiation_safecast",
        "description": "Get Safecast global citizen radiation sensor network data.",
    },
    # ── Spec 3: Sanctions ────────────────────────────────────────────
    {
        "tool_name": "get_sanctions",
        "module_id": "sanctions_ofac",
        "description": "Search OFAC SDN sanctions list by name, country, or program (e.g. 'Iran', 'RUSSIA', 'DPRK'). Without query returns recent entries.",
        "required_params": {"query": str},
    },
    # ── Security & Health Advisories ───────────────────────────────────
    {
        "tool_name": "get_travel_advisories",
        "module_id": "travel_advisories",
        "description": "Get government travel advisories from US State Dept, UK FCDO, NZ MFAT. Query filters by country name (e.g. 'Saudi Arabia', 'Iran').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_health_advisories",
        "module_id": "health_advisories",
        "description": "Get disease outbreaks and health advisories from CDC, ECDC, WHO.",
    },
    {
        "tool_name": "get_embassy_alerts",
        "module_id": "embassy_alerts",
        "description": "Get US Embassy security alerts for high-risk countries.",
    },
    # ── Country Intelligence ───────────────────────────────────────────
    {
        "tool_name": "get_country_facts",
        "module_id": "country_facts",
        "description": "Get country profile: demographics, languages, flag, Wikipedia summary. Requires country name or ISO code.",
        "required_params": {"query": str},
    },
    # ── Economic Extended ──────────────────────────────────────────────
    {
        "tool_name": "get_fear_greed",
        "module_id": "fear_greed_index",
        "description": "Get Crypto Fear & Greed Index (30-day history).",
    },
    {
        "tool_name": "get_bitcoin_hashrate",
        "module_id": "bitcoin_hashrate",
        "description": "Get Bitcoin network hashrate (1 month).",
    },
    {
        "tool_name": "get_us_spending",
        "module_id": "us_spending",
        "description": "Get US federal spending data from USASpending.gov.",
    },
    {
        "tool_name": "get_us_treasury",
        "module_id": "us_treasury",
        "description": "Get Monthly Treasury Statement data (receipts, outlays, deficit).",
    },
    # ── Satellite Imagery ──────────────────────────────────────────────
    {
        "tool_name": "get_satellite_search",
        "module_id": "satellite_search",
        "description": "Search Sentinel-2 satellite imagery by bounding box. Requires bbox (west,south,east,north).",
        "required_params": {"bbox": str},
    },
    # ── Geopolitical Context ───────────────────────────────────────────
    {
        "tool_name": "get_worldbank",
        "module_id": "worldbank_indicators",
        "description": "Get World Bank development indicators (GDP, population, etc.). Requires query (country code) and indicator (e.g. NY.GDP.MKTP.CD).",
        "required_params": {"query": str, "indicator": str},
    },
    {
        "tool_name": "get_imf_data",
        "module_id": "imf_data",
        "description": "Get IMF macroeconomic data (inflation, GDP growth, debt). Requires query (country code) and indicator (e.g. NGDP_RPCH).",
        "required_params": {"query": str, "indicator": str},
    },
    # ── News Extended ──────────────────────────────────────────────────
    {
        "tool_name": "get_aviation_news",
        "module_id": "aviation_news",
        "description": "Get aviation industry news from multiple RSS feeds.",
    },
    {
        "tool_name": "get_defense_news",
        "module_id": "defense_news",
        "description": "Get military and defense news from multiple RSS feeds.",
    },
    # ── Enrichment ─────────────────────────────────────────────────────
    {
        "tool_name": "get_sec_filings",
        "module_id": "sec_filings",
        "description": "Search SEC EDGAR company filings (8-K, 10-K, 10-Q). Requires query (company name or ticker).",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_github_activity",
        "module_id": "github_activity",
        "description": "Get GitHub organization public events. Requires query (org name).",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_hn_search",
        "module_id": "hn_search",
        "description": "Search Hacker News stories. Requires query (search term).",
        "required_params": {"query": str},
    },
    # ── Correlation ────────────────────────────────────────────────────
    {
        "tool_name": "get_news_velocity",
        "module_id": "news_velocity",
        "description": "Get news velocity scoring — article frequency per topic with anomaly detection.",
    },
    # ── Real-Time Feeds ───────────────────────────────────────────────
    {
        "tool_name": "get_aircraft",
        "module_id": "opensky_aircraft",
        "description": "Get live aircraft positions from OpenSky ADS-B. Use bbox for region (e.g. '24,54,26,56' for Dubai) or query for callsign/country (e.g. 'United Arab Emirates').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_submarine_cables",
        "module_id": "submarine_cables",
        "description": "Get global undersea cable map — 700+ cables. Use query to filter by name, owner, or region (e.g. 'gulf', 'google').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_cisa_kev",
        "module_id": "cisa_kev",
        "description": "Search CISA Known Exploited Vulnerabilities. Query by vendor, product, or CVE ID (e.g. 'Microsoft', 'CVE-2024').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_ransomware",
        "module_id": "ransomware_posts",
        "description": "Get recent ransomware group victim posts from RansomLook. Real-time extortion monitoring.",
    },
    {
        "tool_name": "get_threatfox",
        "module_id": "threatfox_iocs",
        "description": "Get ThreatFox malware IOCs — C2 servers, malware URLs, hashes from abuse.ch.",
    },
]


def _make_tool_fn(module_id: str, required_params: dict, client: HeadlessClient):
    """Create a tool function for a registry entry.

    Uses a factory to avoid Python's late-binding closure pitfall.
    """
    has_required_query = "query" in required_params
    has_required_bbox = "bbox" in required_params
    has_required_indicator = "indicator" in required_params

    if has_required_query and has_required_indicator:
        async def tool_fn(
            query: str,
            indicator: str,
            limit: int | None = None,
            format: str = "json",
        ) -> dict:
            return await client.query_module(module_id, {
                "query": query, "indicator": indicator,
                "limit": limit, "format": format,
            })
    elif has_required_query:
        async def tool_fn(
            query: str,
            limit: int | None = None,
            bbox: str | None = None,
            format: str = "json",
        ) -> dict:
            return await client.query_module(module_id, {
                "query": query, "limit": limit, "bbox": bbox, "format": format,
            })
    elif has_required_bbox:
        async def tool_fn(
            bbox: str,
            limit: int | None = None,
            format: str = "json",
        ) -> dict:
            return await client.query_module(module_id, {
                "bbox": bbox, "limit": limit, "format": format,
            })
    else:
        async def tool_fn(
            limit: int | None = None,
            bbox: str | None = None,
            format: str = "json",
        ) -> dict:
            return await client.query_module(module_id, {
                "limit": limit, "bbox": bbox, "format": format,
            })

    return tool_fn


def _register_from_registry(mcp: FastMCP, client: HeadlessClient) -> None:
    """Dynamically register all tools from the declarative registry."""
    for entry in TOOL_REGISTRY:
        tool_name = entry["tool_name"]
        module_id = entry["module_id"]
        description = entry["description"]
        required_params = entry.get("required_params", {})

        fn = _make_tool_fn(module_id, required_params, client)
        fn.__name__ = tool_name
        fn.__qualname__ = tool_name
        fn.__doc__ = description

        mcp.tool()(fn)


def register_all_tools(mcp: FastMCP, client: HeadlessClient) -> None:
    """Register all MCP tools: aggregate + registry-driven module tools."""
    register_aggregate_tools(mcp, client)
    _register_from_registry(mcp, client)
