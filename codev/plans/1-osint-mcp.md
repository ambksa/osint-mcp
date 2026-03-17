# Plan 1: osint-mcp Core Infrastructure

## Phase 1: Project Skeleton
- [x] Create `pyproject.toml` with fastmcp>=2.0, httpx>=0.27, entry point
- [x] Create `src/osint_mcp/__init__.py` with version

## Phase 2: HTTP Client
- [x] Create `src/osint_mcp/client.py` — HeadlessClient with query_module, query_modules, health
- [x] Error handling: ConnectError, TimeoutException, HTTPStatusError → structured dicts

## Phase 3: Server Entry Point
- [x] Create `src/osint_mcp/server.py` — FastMCP with stdio + SSE transport
- [x] Bearer token auth via DebugTokenVerifier when OSINT_MCP_API_KEY is set
- [x] CLI args: --transport, --host, --port

## Phase 4: Tool Registration (Declarative Registry)
- [x] Create `src/osint_mcp/tools/aggregate.py` — 4 aggregate tools
- [x] Create `src/osint_mcp/tools/__init__.py` — declarative TOOL_REGISTRY + dynamic registration
- [x] 53 granular tools defined as data, generated via _make_tool_fn factory
- [x] Factory pattern avoids Python late-binding closure pitfall

## Architecture Decision: Registry Pattern
Per architect instruction, tools use a declarative registry instead of per-category files.
Each tool is a dict entry; a single loop generates @mcp.tool() registrations.
Adding a new module = adding one dict to TOOL_REGISTRY.
