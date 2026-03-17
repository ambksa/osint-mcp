"""FastMCP server entry point for osint-mcp."""

from __future__ import annotations

import argparse
import os

from fastmcp import FastMCP

from osint_mcp.client import HeadlessClient
from osint_mcp.tools import register_all_tools


def _build_server() -> FastMCP:
    """Construct the FastMCP server, headless client, and register all tools."""
    base_url = os.environ.get("HEADLESS_BASE_URL", "http://127.0.0.1:3000")
    timeout = float(os.environ.get("HEADLESS_TIMEOUT", "60"))
    api_key = os.environ.get("OSINT_MCP_API_KEY")

    kwargs: dict = {"name": "osint-mcp"}

    # Bearer token auth when OSINT_MCP_API_KEY is set
    if api_key:
        from fastmcp.server.auth.providers.debug import DebugTokenVerifier

        kwargs["auth"] = DebugTokenVerifier(
            validate=lambda token: token == api_key,
            client_id="osint-mcp-client",
            scopes=["osint"],
        )

    mcp = FastMCP(**kwargs)
    client = HeadlessClient(base_url=base_url, timeout=timeout)
    register_all_tools(mcp, client)
    return mcp


def main() -> None:
    """CLI entry point. Supports --transport sse --port 8080 for network mode."""
    parser = argparse.ArgumentParser(description="osint-mcp server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport mode (default: stdio)",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind SSE server (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port for SSE server (default: 8080)",
    )
    args = parser.parse_args()

    mcp = _build_server()

    if args.transport == "sse":
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
