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
#
# DISABLED FEEDS (removed 2026-03-18 — all tested, none return data):
#   conflict_acled, conflict_ucdp_events, conflict_hapi, unrest_events
#     — ACLED/UCDP/HDX HAPI APIs return 0 events consistently
#   maritime_warnings, maritime_snapshot — always empty (no data feed)
#   military_flights, military_posture — OpenSky military filter & posture broken
#   infrastructure_cable_health, infrastructure_baseline — empty / requires invalid params
#   wildfire_detections — NASA FIRMS returns 0 detections
#   markets — needs FINNHUB_API_KEY, returns 0 quotes without it
#   markets_commodities, economic_energy — always 0 prices/quotes
#   markets_etf_flows — permanently rate-limited, 0 results
#   economic_bis_credit — always 0 entries
#   trade_flows, trade_tariffs, trade_restrictions, trade_barriers — upstream unavailable
#   supply_chain_shipping — upstream unavailable
#   news_telegram — requires WS_RELAY_URL infrastructure
#   research_trending_repos — GitHub trending API returns 0 repos
#   predictions, polymarket_intel — Polymarket API broken (502 / empty)
#   geo_filters — Overpass API consistently times out
#   radiation_epa — EPA RadNet API returns HTTP 404
#   positive_events — always 0 events (placeholder)
#   get_risk_scores — duplicate of get_intelligence_summary aggregate tool
# ---------------------------------------------------------------------------

TOOL_REGISTRY: list[dict] = [
    # ── Military ──────────────────────────────────────────────────────
    {
        "tool_name": "get_military_usni",
        "module_id": "military_usni",
        "description": "Get USNI Fleet tracker report — US Navy ship deployments and movements worldwide.",
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
        "description": "Get internet outage events from BGP monitoring.",
    },
    {
        "tool_name": "get_infrastructure_services",
        "module_id": "infrastructure_services",
        "description": "Get service availability checks for major platforms.",
    },
    # ── Natural Events ────────────────────────────────────────────────
    {
        "tool_name": "get_earthquakes",
        "module_id": "seismology_earthquakes",
        "description": "Get USGS earthquake data including magnitude, location, and depth.",
    },
    {
        "tool_name": "get_climate_anomalies",
        "module_id": "climate_anomalies",
        "description": "Get climate anomaly tracking data.",
    },
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
    # ── Markets & Crypto ─────────────────────────────────────────────
    {
        "tool_name": "get_crypto",
        "module_id": "markets_crypto",
        "description": "Get cryptocurrency quotes from CoinGecko.",
    },
    {
        "tool_name": "get_stablecoins",
        "module_id": "markets_stablecoins",
        "description": "Get stablecoin market data (USDT, USDC, DAI).",
    },
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
    # ── Economics ──────────────────────────────────────────────────────
    {
        "tool_name": "get_economic_macro",
        "module_id": "economic_macro",
        "description": "Get FRED macro economic signals (GDP, unemployment, CPI, etc.).",
    },
    {
        "tool_name": "get_bis_rates",
        "module_id": "economic_bis_rates",
        "description": "Get BIS central bank policy rates for major economies.",
    },
    {
        "tool_name": "get_bis_fx",
        "module_id": "economic_bis_fx",
        "description": "Get BIS exchange rates for major currencies.",
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
    # ── Supply Chain ──────────────────────────────────────────────────
    {
        "tool_name": "get_chokepoints",
        "module_id": "supply_chain_chokepoints",
        "description": "Get maritime chokepoint status (Suez, Panama, Hormuz, Malacca, etc.).",
    },
    {
        "tool_name": "get_critical_minerals",
        "module_id": "supply_chain_critical_minerals",
        "description": "Get critical mineral supply data (lithium, cobalt, rare earths).",
    },
    # ── News & Intelligence ───────────────────────────────────────────
    {
        "tool_name": "get_news_rss",
        "module_id": "news_rss",
        "description": "Get aggregated RSS news feeds from BBC, Reuters, AP, CNN, Guardian, and more.",
    },
    {
        "tool_name": "get_gdelt",
        "module_id": "intelligence_gdelt",
        "description": "Search GDELT global event database. Query with keywords like 'Iran conflict' or 'Dubai trade'.",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_news_velocity",
        "module_id": "news_velocity",
        "description": "Get news velocity scoring — article frequency per topic with anomaly detection.",
    },
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
        "tool_name": "get_hackernews",
        "module_id": "research_hackernews",
        "description": "Get Hacker News top stories.",
    },
    # ── Geolocation & Satellite ───────────────────────────────────────
    {
        "tool_name": "get_geocode",
        "module_id": "geocode_place",
        "description": "Geocode a place name to coordinates. Requires query string.",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_satellite_snapshot",
        "module_id": "satellite_snapshot",
        "description": "Generate satellite imagery URLs for a location. Query is a place name (e.g. 'Kyiv', 'Dubai').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_satellite_search",
        "module_id": "satellite_search",
        "description": "Search Sentinel-2 satellite imagery by bounding box. Requires bbox (west,south,east,north).",
        "required_params": {"bbox": str},
    },
    # ── Humanitarian ──────────────────────────────────────────────────
    {
        "tool_name": "get_displacement",
        "module_id": "displacement_summary",
        "description": "Get UNHCR displacement data — refugees and internally displaced persons.",
    },
    {
        "tool_name": "get_population_exposure",
        "module_id": "population_exposure",
        "description": "Get WorldPop population exposure estimates for disaster-affected areas.",
    },
    {
        "tool_name": "get_giving_summary",
        "module_id": "giving_summary",
        "description": "Get philanthropic giving data and humanitarian funding summary.",
    },
    # ── Security & Health Advisories ──────────────────────────────────
    {
        "tool_name": "get_sanctions",
        "module_id": "sanctions_ofac",
        "description": "Search OFAC SDN sanctions list by name, country, or program (e.g. 'Iran', 'RUSSIA', 'DPRK').",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_travel_advisories",
        "module_id": "travel_advisories",
        "description": "Get government travel advisories from US State Dept, UK FCDO, NZ MFAT. Query filters by country name.",
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
    {
        "tool_name": "get_country_facts",
        "module_id": "country_facts",
        "description": "Get country profile: demographics, languages, flag, Wikipedia summary. Requires country name or ISO code.",
        "required_params": {"query": str},
    },
    # ── Radiation Monitoring ──────────────────────────────────────────
    {
        "tool_name": "get_radiation_safecast",
        "module_id": "radiation_safecast",
        "description": "Get Safecast global citizen radiation sensor network data.",
    },
    # ── Aviation ──────────────────────────────────────────────────────
    {
        "tool_name": "get_aviation_delays",
        "module_id": "aviation_delays",
        "description": "Get FAA airport delay tracking data across US airports.",
    },
    # ── Intelligence ──────────────────────────────────────────────────
    {
        "tool_name": "get_pizzint",
        "module_id": "intelligence_pizzint",
        "description": "Get PizzINT status monitor — unconventional OSINT indicator.",
    },
    # ── Enrichment ────────────────────────────────────────────────────
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
    # ── Real-Time Feeds ───────────────────────────────────────────────
    # get_aircraft is registered as a custom tool in register_aircraft_tool()
    # (supports rich filtering by callsign, registration, type, altitude, squawk, etc.)
    {
        "tool_name": "get_submarine_cables",
        "module_id": "submarine_cables",
        "description": "Get global undersea cable map — 700+ cables. Use query to filter by name, owner, or region.",
        "required_params": {"query": str},
    },
    # ── Cyber Real-Time ───────────────────────────────────────────────
    {
        "tool_name": "get_cisa_kev",
        "module_id": "cisa_kev",
        "description": "Search CISA Known Exploited Vulnerabilities. Query by vendor, product, or CVE ID.",
        "required_params": {"query": str},
    },
    {
        "tool_name": "get_ransomware",
        "module_id": "ransomware_posts",
        "description": "Get recent ransomware group victim posts from RansomLook — real-time extortion monitoring.",
    },
    {
        "tool_name": "get_threatfox",
        "module_id": "threatfox_iocs",
        "description": "Get ThreatFox malware IOCs — C2 servers, malware URLs, hashes from abuse.ch.",
    },
    # ── Financial (require API keys — set in server .env) ────────────
    # These tools require API keys configured on the headless server.
    # Without keys they return a clear error message.
    # FRED_API_KEY: free at https://fred.stlouisfed.org/docs/api/api_key.html
    # FMP_API_KEY:  free at https://site.financialmodelingprep.com/developer
    {
        "tool_name": "get_fred_series",
        "module_id": "financial_fred_macro",
        "description": "Get FRED economic time series (GDP, unemployment, CPI, etc.). Requires FRED_API_KEY on server. Query is the series ID (e.g. 'UNRATE', 'GDP', 'CPIAUCSL').",
        "required_params": {"query": str},
        "param_map": {"query": "series_id"},
    },
    {
        "tool_name": "get_fmp_quote",
        "module_id": "financial_fmp_quote",
        "description": "Get real-time stock quote by ticker symbol. Requires FMP_API_KEY on server. Query is the ticker (e.g. 'AAPL', 'MSFT').",
        "required_params": {"query": str},
        "param_map": {"query": "symbol"},
    },
    {
        "tool_name": "get_fmp_profile",
        "module_id": "financial_fmp_profile",
        "description": "Get company profile by ticker symbol. Requires FMP_API_KEY on server. Query is the ticker (e.g. 'AAPL').",
        "required_params": {"query": str},
        "param_map": {"query": "symbol"},
    },
    {
        "tool_name": "get_fmp_ratios",
        "module_id": "financial_fmp_ratios_ttm",
        "description": "Get trailing twelve month financial ratios by ticker. Requires FMP_API_KEY on server. Query is the ticker (e.g. 'AAPL').",
        "required_params": {"query": str},
        "param_map": {"query": "symbol"},
    },
    {
        "tool_name": "get_fmp_estimates",
        "module_id": "financial_fmp_analyst_estimates",
        "description": "Get analyst estimates by ticker. Requires FMP_API_KEY on server. Query is the ticker (e.g. 'AAPL').",
        "required_params": {"query": str},
        "param_map": {"query": "symbol"},
    },
]


def _apply_filters(result: dict, search: str | None, filter_json: str | None) -> dict:
    """Apply universal search and filter to any tool response.

    Finds the first list of items in the response data and filters it.
    search: text search across all string fields (case-insensitive)
    filter_json: JSON object of field-level filters, e.g.:
      {"magnitude": ">5", "country": "Iran", "altitude": "<10000", "status": "active"}
    Operators: > < >= <= = != (for numbers), contains/equals (for strings, default: contains)
    """
    if not search and not filter_json:
        return result

    # Find the data array to filter
    data = result.get("data", result)
    if not isinstance(data, dict):
        return result

    # Find the first list in the data (items, events, aircraft, entries, etc.)
    items_key = None
    items = None
    for k, v in data.items():
        if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
            items_key = k
            items = v
            break

    if not items:
        return result

    filtered = items

    # Text search across all string fields
    if search:
        sl = search.lower()
        filtered = [
            item for item in filtered
            if any(
                sl in str(v).lower()
                for v in item.values()
                if v is not None
            )
        ]

    # Structured field-level filters
    if filter_json:
        import json as _json
        try:
            filters = _json.loads(filter_json) if isinstance(filter_json, str) else filter_json
        except (ValueError, TypeError):
            filters = {}

        for field, condition in filters.items():
            cond_str = str(condition).strip()

            # Parse operator and value
            op = "contains"
            val_str = cond_str
            for prefix, op_name in [(">=", "gte"), ("<=", "lte"), ("!=", "ne"),
                                     (">", "gt"), ("<", "lt"), ("=", "eq")]:
                if cond_str.startswith(prefix):
                    op = op_name
                    val_str = cond_str[len(prefix):].strip()
                    break

            # Try numeric comparison
            try:
                num_val = float(val_str)
                is_numeric = True
            except (ValueError, TypeError):
                is_numeric = False

            def _match(item, _field=field, _op=op, _val_str=val_str, _num_val=num_val if is_numeric else None, _is_numeric=is_numeric):
                v = item.get(_field)
                if v is None:
                    return False
                if _is_numeric and isinstance(v, (int, float)):
                    if _op == "gt": return v > _num_val
                    if _op == "lt": return v < _num_val
                    if _op == "gte": return v >= _num_val
                    if _op == "lte": return v <= _num_val
                    if _op == "eq": return v == _num_val
                    if _op == "ne": return v != _num_val
                    return _val_str.lower() in str(v).lower()
                sv = str(v).lower()
                vl = _val_str.lower()
                if _op == "eq": return sv == vl
                if _op == "ne": return sv != vl
                return vl in sv  # default: contains

            filtered = [item for item in filtered if _match(item)]

    data[items_key] = filtered
    data["_filtered"] = len(filtered)
    data["_total_before_filter"] = len(items)
    result["data"] = data
    return result


def _make_tool_fn(
    module_id: str,
    required_params: dict,
    client: HeadlessClient,
    param_map: dict[str, str] | None = None,
):
    """Create a tool function for a registry entry.

    Every tool gets `search` and `filter` params for universal result filtering.
    param_map remaps MCP param names → headless param names.
    """
    pmap = param_map or {}
    has_required_query = "query" in required_params
    has_required_bbox = "bbox" in required_params
    has_required_indicator = "indicator" in required_params

    def _remap(params: dict) -> dict:
        if not pmap:
            return params
        return {pmap.get(k, k): v for k, v in params.items()}

    if has_required_query and has_required_indicator:
        async def tool_fn(
            query: str,
            indicator: str,
            limit: int | None = None,
            search: str | None = None,
            filter: str | None = None,
            format: str = "json",
        ) -> dict:
            """search: text search across all fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
            result = await client.query_module(module_id, _remap({
                "query": query, "indicator": indicator,
                "limit": limit, "format": format,
            }))
            return _apply_filters(result, search, filter)
    elif has_required_query:
        async def tool_fn(
            query: str,
            limit: int | None = None,
            bbox: str | None = None,
            search: str | None = None,
            filter: str | None = None,
            format: str = "json",
        ) -> dict:
            """search: text search across all fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
            result = await client.query_module(module_id, _remap({
                "query": query, "limit": limit, "bbox": bbox, "format": format,
            }))
            return _apply_filters(result, search, filter)
    elif has_required_bbox:
        async def tool_fn(
            bbox: str,
            limit: int | None = None,
            search: str | None = None,
            filter: str | None = None,
            format: str = "json",
        ) -> dict:
            """search: text search across all fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
            result = await client.query_module(module_id, _remap({
                "bbox": bbox, "limit": limit, "format": format,
            }))
            return _apply_filters(result, search, filter)
    else:
        async def tool_fn(
            limit: int | None = None,
            bbox: str | None = None,
            search: str | None = None,
            filter: str | None = None,
            format: str = "json",
        ) -> dict:
            """search: text search across all fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
            result = await client.query_module(module_id, _remap({
                "limit": limit, "bbox": bbox, "format": format,
            }))
            return _apply_filters(result, search, filter)

    return tool_fn


def _register_from_registry(mcp: FastMCP, client: HeadlessClient) -> None:
    """Dynamically register all tools from the declarative registry."""
    for entry in TOOL_REGISTRY:
        tool_name = entry["tool_name"]
        module_id = entry["module_id"]
        description = entry["description"]
        required_params = entry.get("required_params", {})
        param_map = entry.get("param_map")

        fn = _make_tool_fn(module_id, required_params, client, param_map)
        fn.__name__ = tool_name
        fn.__qualname__ = tool_name
        fn.__doc__ = description

        mcp.tool()(fn)


async def _auto_discover_modules(mcp: FastMCP, client: HeadlessClient) -> None:
    """Auto-discover server modules not in TOOL_REGISTRY and register them.

    This makes the MCP server automatically pick up new modules added to
    the headless server (including plugin modules from api/modules/*.mjs)
    without any MCP-side code changes.
    """
    # Module IDs already covered by TOOL_REGISTRY or aggregate tools
    known_ids = {entry["module_id"] for entry in TOOL_REGISTRY}
    # Also skip modules handled by aggregate tools
    known_ids.update({
        "intelligence_risk_scores",  # get_intelligence_summary
        "intelligence_report",       # intelligence_report
    })

    try:
        listing = await client.list_modules()
    except Exception:
        return  # Server not reachable — skip discovery

    modules = listing.get("modules", [])
    if not isinstance(modules, list):
        return

    discovered = 0
    for mod in modules:
        mod_id = mod.get("name", "")
        if not mod_id or mod_id in known_ids:
            continue

        desc = mod.get("description", f"OSINT module: {mod_id}")
        tool_name = f"get_{mod_id}"

        # All auto-discovered tools get the generic signature (query + limit + bbox)
        fn = _make_tool_fn(mod_id, {"query": str}, client)
        fn.__name__ = tool_name
        fn.__qualname__ = tool_name
        fn.__doc__ = f"[Auto-discovered] {desc}"

        mcp.tool()(fn)
        discovered += 1

    if discovered:
        import sys
        print(f"[osint-mcp] auto-discovered {discovered} additional server modules", file=sys.stderr)


def _register_aircraft_tool(mcp: FastMCP, client: HeadlessClient) -> None:
    """Register the aircraft tool with rich filtering support."""

    @mcp.tool()
    async def get_aircraft(
        bbox: str | None = None,
        query: str | None = None,
        lat: float | None = None,
        lon: float | None = None,
        dist: int | None = None,
        callsign: str | None = None,
        registration: str | None = None,
        icao24: str | None = None,
        aircraft_type: str | None = None,
        squawk: str | None = None,
        airline: str | None = None,
        military: bool | None = None,
        on_ground: bool | None = None,
        min_altitude_ft: int | None = None,
        max_altitude_ft: int | None = None,
        min_speed_kts: int | None = None,
        emergency: bool | None = None,
        limit: int | None = None,
        format: str = "json",
    ) -> dict:
        """Get live aircraft positions (ADSB.fi primary, OpenSky fallback). Unfiltered by default — includes military with auto-tagging.

        LOCATION (use one):
          bbox: bounding box 'south,west,north,east' (e.g. '22,51,26,56' for UAE)
          lat/lon/dist: center point + radius in nm (default 250nm)
          query: callsign prefix or ICAO hex (no bbox needed)

        FILTERS (all optional, applied server-side, combine freely):
          callsign: match callsign contains (e.g. 'UAE', 'RCH', 'ETD')
          registration: match tail number contains (e.g. 'A6-', 'N12')
          icao24: match ICAO hex code (e.g. '896110')
          aircraft_type: match ICAO type code contains (e.g. 'B77', 'C17', 'A320')
          squawk: exact squawk code (e.g. '7700' for emergency, '7600' comms failure)
          airline: match callsign or registration contains (e.g. 'Emirates', 'ETD')
          military: true = military only, false = civilian only
          on_ground: true = on ground only, false = airborne only
          min_altitude_ft: minimum altitude in feet
          max_altitude_ft: maximum altitude in feet
          min_speed_kts: minimum ground speed in knots
          emergency: true = only aircraft declaring emergency

        EXAMPLES:
          "planes over UAE" → bbox='22,51,26,56'
          "where is UAE508" → callsign='UAE508'
          "military over Europe" → bbox='35,-10,60,30', military=true
          "aircraft squawking 7700" → bbox='0,-180,90,180', squawk='7700'
          "C-17s in the air" → aircraft_type='C17', on_ground=false
          "what's landing at Dubai" → bbox='24.5,54.5,25.5,55.5', max_altitude_ft=3000
        """
        params = {
            "bbox": bbox, "query": query,
            "lat": lat, "lon": lon, "dist": dist,
            "limit": limit, "format": format,
        }
        result = await client.query_module("opensky_aircraft", params)

        # Apply filters on the MCP side for maximum flexibility
        data = result.get("data", result)
        aircraft = data.get("aircraft", [])

        if not aircraft:
            return result

        filtered = aircraft

        if callsign:
            cl = callsign.upper()
            filtered = [a for a in filtered if cl in (a.get("callsign") or "")]
        if registration:
            rl = registration.upper()
            filtered = [a for a in filtered if rl in (a.get("registration") or "").upper()]
        if icao24:
            hl = icao24.lower()
            filtered = [a for a in filtered if hl in (a.get("icao24") or "")]
        if aircraft_type:
            tl = aircraft_type.upper()
            filtered = [a for a in filtered if tl in (a.get("aircraftType") or "").upper()]
        if squawk:
            filtered = [a for a in filtered if (a.get("squawk") or "") == squawk]
        if airline:
            al = airline.upper()
            filtered = [a for a in filtered
                        if al in (a.get("callsign") or "")
                        or al in (a.get("registration") or "").upper()]
        if military is True:
            filtered = [a for a in filtered if a.get("military")]
        elif military is False:
            filtered = [a for a in filtered if not a.get("military")]
        if on_ground is True:
            filtered = [a for a in filtered if a.get("onGround")]
        elif on_ground is False:
            filtered = [a for a in filtered if not a.get("onGround")]
        if min_altitude_ft is not None:
            filtered = [a for a in filtered
                        if isinstance(a.get("altitudeFt"), (int, float))
                        and a["altitudeFt"] >= min_altitude_ft]
        if max_altitude_ft is not None:
            filtered = [a for a in filtered
                        if isinstance(a.get("altitudeFt"), (int, float))
                        and a["altitudeFt"] <= max_altitude_ft]
        if min_speed_kts is not None:
            filtered = [a for a in filtered
                        if isinstance(a.get("groundSpeedKts"), (int, float))
                        and a["groundSpeedKts"] >= min_speed_kts]
        if emergency is True:
            filtered = [a for a in filtered
                        if (a.get("emergency") or "none") != "none"
                        or (a.get("squawk") or "") in ("7500", "7600", "7700")]

        data["aircraft"] = filtered
        data["filtered"] = len(filtered)
        result["data"] = data
        return result


def register_all_tools(mcp: FastMCP, client: HeadlessClient) -> None:
    """Register all MCP tools: aggregate + registry-driven + auto-discovered."""
    register_aggregate_tools(mcp, client)
    _register_aircraft_tool(mcp, client)
    _register_from_registry(mcp, client)

    # Auto-discover any server modules not in the registry.
    # This runs async — we need to schedule it for startup.
    import asyncio

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_auto_discover_modules(mcp, client))
    except RuntimeError:
        # No running loop — run synchronously
        asyncio.run(_auto_discover_modules(mcp, client))
