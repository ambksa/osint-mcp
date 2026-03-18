# Spec 7: Commit & Cleanup

**Date**: 2026-03-18
**Status**: Specified
**Effort**: 30 min

## Goal

Commit all changes from the Spec 4 session (feed audit, extensibility, ADSB.fi, financial tools, universal filtering, country risk signals).

## Changes to commit

### Server (`server/`)
- `api/headless.js` — unified aircraft module (ADSB.fi + OpenSky fallback), plugin loader, CORE/FAST module cleanup
- `api/modules/_template.mjs` — plugin template
- `api/modules/dynamic_risk_scores.mjs` — country risk signals plugin (renamed from dynamic_risk_scores)
- `.env.example` — added FMP_API_KEY

### MCP (`mcp/`)
- `src/osint_mcp/tools/__init__.py` — registry cleanup (29 removed, 5 financial added), param_map, universal search/filter, aircraft tool with 19 filter params, auto-discovery
- `src/osint_mcp/tools/aggregate.py` — search/filter on aggregate tools
- `src/osint_mcp/resources.py` — replaced broken resources with working ones

### Docs & Skill
- `skill/osint/SKILL.md` — full rewrite for working tools, API key docs, workflows
- `CLAUDE.md` — tool count update
- `README.md` — tool count update
- `codev/specs/4-feed-audit-extensibility.md` — spec for this work
- `codev/specs/5-quick-win-feeds.md` — next feeds spec
- `codev/specs/6-fix-weak-tools.md` — weak tool fixes spec
- `codev/specs/7-commit-cleanup.md` — this spec

## Commit plan

One commit covering all changes:
```
feat: audit all feeds, add extensibility system, ADSB.fi aircraft, universal filtering

- Remove 29 broken feeds (dead APIs, missing keys, empty data)
- Add ADSB.fi aircraft tracking (unfiltered, military auto-tagged)
- Add 5 financial tools (FRED, FMP) with API key gating
- Add plugin system (server/api/modules/*.mjs → auto-discovered)
- Add MCP auto-discovery of new server modules
- Add universal search + filter params to all tools
- Add rich aircraft filtering (19 params)
- Add country_risk_signals (raw evidence from 9 feeds)
- Update resources, skill, docs
```

## Verification before commit

- [ ] Server starts cleanly: `PORT=3000 node --import tsx server.mjs`
- [ ] Plugin loads: `[modules] loaded plugin: country_risk_signals`
- [ ] MCP builds: `uv run python3 -c "from osint_mcp.server import _build_server; _build_server()"`
- [ ] No unintended files staged (check for .env, node_modules, etc.)
