"""Aggregate tools: health_check, list_modules, query_modules, get_intelligence_summary, intelligence_report."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastmcp import FastMCP
    from osint_mcp.client import HeadlessClient


def register_aggregate_tools(mcp: FastMCP, client: HeadlessClient) -> None:
    """Register aggregate tools that don't follow the single-module pattern."""
    from osint_mcp.tools import _apply_filters, TOOL_REGISTRY
    import subprocess

    @mcp.tool()
    async def version() -> dict:
        """Get osint-mcp version, git commit, tool counts, and system status."""
        # Git info
        git_hash = git_date = git_msg = ""
        try:
            git_hash = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip()
            git_date = subprocess.run(
                ["git", "log", "-1", "--format=%ai"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip()
            git_msg = subprocess.run(
                ["git", "log", "-1", "--format=%s"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip()
        except Exception:
            pass

        # Tool counts
        curated = len(TOOL_REGISTRY)

        # Server health
        health = await client.health()
        server_ok = health.get("ok", False) or health.get("status") == "ok"

        # Module count from server
        module_count = 0
        try:
            listing = await client.list_modules()
            modules = listing.get("modules", [])
            module_count = len(modules) if isinstance(modules, list) else 0
        except Exception:
            pass

        return {
            "name": "osint-mcp",
            "version": "0.2.0",
            "git": {
                "commit": git_hash,
                "date": git_date,
                "message": git_msg,
            },
            "tools": {
                "curated": curated,
                "serverModules": module_count,
                "aggregate": 6,  # health_check, list_modules, query_modules, intelligence_summary, intelligence_report, version
            },
            "server": {
                "healthy": server_ok,
                "url": client._base_url,
            },
        }

    @mcp.tool()
    async def health_check() -> dict:
        """Verify connectivity to the worldosint-headless server."""
        return await client.health()

    @mcp.tool()
    async def list_modules() -> dict:
        """List all available OSINT module IDs and descriptions."""
        return await client.list_modules()

    @mcp.tool()
    async def query_modules(
        modules: str,
        format: str = "json",
        limit: int | None = None,
        bbox: str | None = None,
        search: str | None = None,
        filter: str | None = None,
    ) -> dict:
        """Query arbitrary OSINT modules by ID. Pass comma-separated module IDs.
        search: text search across all result fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
        module_ids = [m.strip() for m in modules.split(",")]
        result = await client.query_modules(module_ids, {
            "format": format,
            "limit": limit,
            "bbox": bbox,
        })
        return _apply_filters(result, search, filter)

    @mcp.tool()
    async def get_intelligence_summary(
        format: str = "json",
        search: str | None = None,
        filter: str | None = None,
    ) -> dict:
        """Get synthesized intelligence risk summary from conflict, unrest, outages, cyber, and seismic sources.
        search: text search across all result fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
        result = await client.query_module("intelligence_risk_scores", {
            "format": format,
        })
        return _apply_filters(result, search, filter)

    @mcp.tool()
    async def intelligence_report(
        query: str,
        keywords: str | None = None,
        format: str = "json",
        search: str | None = None,
        filter: str | None = None,
    ) -> dict:
        """Generate a comprehensive intelligence report for a region or topic. Queries 14 OSINT modules in parallel (news, conflict, maritime, military, cyber, economic, infrastructure, aviation) and filters results by keywords. This is the most powerful single tool — use it for 'intelligence report on X' or 'OSINT on X' queries.
        search: text search across all result fields. filter: JSON field filters e.g. '{"field": ">value"}'"""
        result = await client.query_module("intelligence_report", {
            "query": query,
            "keywords": keywords or query,
            "format": format,
        })
        return _apply_filters(result, search, filter)
