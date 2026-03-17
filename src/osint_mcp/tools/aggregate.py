"""Aggregate tools: health_check, list_modules, query_modules, get_intelligence_summary."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastmcp import FastMCP
    from osint_mcp.client import HeadlessClient


def register_aggregate_tools(mcp: FastMCP, client: HeadlessClient) -> None:
    """Register aggregate tools that don't follow the single-module pattern."""

    @mcp.tool()
    async def health_check() -> dict:
        """Verify connectivity to the worldosint-headless server."""
        return await client.health()

    @mcp.tool()
    async def list_modules() -> dict:
        """List all available OSINT module IDs and descriptions."""
        return await client.query_module("list", {"format": "json"})

    @mcp.tool()
    async def query_modules(
        modules: str,
        format: str = "json",
        limit: int | None = None,
        bbox: str | None = None,
    ) -> dict:
        """Query arbitrary OSINT modules by ID. Pass comma-separated module IDs."""
        module_ids = [m.strip() for m in modules.split(",")]
        return await client.query_modules(module_ids, {
            "format": format,
            "limit": limit,
            "bbox": bbox,
        })

    @mcp.tool()
    async def get_intelligence_summary(format: str = "json") -> dict:
        """Get synthesized intelligence risk summary from conflict, unrest, outages, cyber, and seismic sources."""
        return await client.query_module("intelligence_risk_scores", {
            "format": format,
        })
