"""MCP resource templates for browsable OSINT data access.

Resources provide read-only data access complementing the tool interface.
Agents can browse these URIs to discover and read OSINT data without
needing to know tool names or parameters.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastmcp import FastMCP
    from osint_mcp.client import HeadlessClient


def register_resources(mcp: FastMCP, client: HeadlessClient) -> None:
    @mcp.resource("osint://earthquakes", mime_type="application/json")
    async def earthquakes_resource() -> str:
        """Browse USGS earthquake data."""
        return json.dumps(await client.query_module("seismology_earthquakes", {"format": "json"}))

    @mcp.resource("osint://climate", mime_type="application/json")
    async def climate_resource() -> str:
        """Browse climate anomaly tracking data."""
        return json.dumps(await client.query_module("climate_anomalies", {"format": "json"}))

    @mcp.resource("osint://disasters", mime_type="application/json")
    async def disasters_resource() -> str:
        """Browse GDACS global disaster alerts."""
        return json.dumps(await client.query_module("natural_events_gdacs", {"format": "json"}))

    @mcp.resource("osint://military/usni", mime_type="application/json")
    async def military_resource() -> str:
        """Browse USNI Fleet tracker report."""
        return json.dumps(await client.query_module("military_usni", {"format": "json"}))

    @mcp.resource("osint://cyber", mime_type="application/json")
    async def cyber_resource() -> str:
        """Browse cyber threat IOCs and alerts."""
        return json.dumps(await client.query_module("cyber_threats", {"format": "json"}))

    @mcp.resource("osint://news", mime_type="application/json")
    async def news_resource() -> str:
        """Browse aggregated RSS news feeds."""
        return json.dumps(await client.query_module("news_rss", {"format": "json"}))
