"""MCP resource templates for browsable OSINT data access.

Resources provide read-only data access complementing the tool interface.
Agents can browse these URIs to discover and read OSINT data without
needing to know tool names or parameters.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastmcp import FastMCP
    from osint_mcp.client import HeadlessClient


# Map URI path segments to headless module IDs
_CONFLICT_SOURCES = {
    "acled": "conflict_acled",
    "ucdp": "conflict_ucdp_events",
    "hapi": "conflict_hapi",
}

_MARITIME_TYPES = {
    "warnings": "maritime_warnings",
    "snapshot": "maritime_snapshot",
}

_MILITARY_TYPES = {
    "flights": "military_flights",
    "posture": "military_posture",
    "usni": "military_usni",
}

_NATURAL_EVENTS = {
    "earthquakes": "seismology_earthquakes",
    "wildfires": "wildfire_detections",
    "climate": "climate_anomalies",
}


def register_resources(mcp: FastMCP, client: HeadlessClient) -> None:
    @mcp.resource("osint://conflict/{source}")
    async def conflict_resource(source: str) -> dict:
        """Browse conflict data by source (acled, ucdp, hapi)."""
        module_id = _CONFLICT_SOURCES.get(source)
        if not module_id:
            return {"error": f"Unknown conflict source: {source}", "valid": list(_CONFLICT_SOURCES)}
        return await client.query_module(module_id, {"format": "json"})

    @mcp.resource("osint://maritime/{type}")
    async def maritime_resource(type: str) -> dict:
        """Browse maritime data by type (warnings, snapshot)."""
        module_id = _MARITIME_TYPES.get(type)
        if not module_id:
            return {"error": f"Unknown maritime type: {type}", "valid": list(_MARITIME_TYPES)}
        return await client.query_module(module_id, {"format": "json"})

    @mcp.resource("osint://military/{type}")
    async def military_resource(type: str) -> dict:
        """Browse military data by type (flights, posture, usni)."""
        module_id = _MILITARY_TYPES.get(type)
        if not module_id:
            return {"error": f"Unknown military type: {type}", "valid": list(_MILITARY_TYPES)}
        return await client.query_module(module_id, {"format": "json"})

    @mcp.resource("osint://earthquakes")
    async def earthquakes_resource() -> dict:
        """Browse USGS earthquake data."""
        return await client.query_module("seismology_earthquakes", {"format": "json"})

    @mcp.resource("osint://wildfires")
    async def wildfires_resource() -> dict:
        """Browse NASA FIRMS wildfire detection data."""
        return await client.query_module("wildfire_detections", {"format": "json"})

    @mcp.resource("osint://climate")
    async def climate_resource() -> dict:
        """Browse climate anomaly tracking data."""
        return await client.query_module("climate_anomalies", {"format": "json"})
