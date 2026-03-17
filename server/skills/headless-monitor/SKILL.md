---
name: headless-monitor
description: Headless access to World Monitor modules (news, conflict, maritime, military, markets, climate, geolocation, Polymarket intel) via `/api/headless`, CLI, or WebSocket polling. Use when you need global situation snapshots, module-by-module raw outputs, or live headless monitoring for agents.
---

# Headless Monitor

## Overview

Access every module in headless mode with JSON + Markdown outputs, plus a live WebSocket polling bridge for agents.

## Quick Start

1. **List all modules**
   - `GET /api/headless?module=list`
2. **Global situation snapshot (all modules)**
   - `GET /api/headless?module=all&format=both`
3. **Run one module**
   - `GET /api/headless?module=polymarket_intel&format=both`

CLI shortcuts:
- `npm run headless:cli -- --base http://localhost:5173 --module list`
- `npm run headless:cli -- --base http://localhost:5173 --module all --format both`

WebSocket bridge:
- `npm run headless:ws -- --base http://localhost:5173 --port 8787 --interval 20000`

## Outputs

- **JSON:** raw module payloads
- **Markdown:** compact summaries for token‑efficient agent reads
- **Both:** return `modules` plus a single `markdown` field

## Module Invocation Pattern

- Single module: `module=<id>`
- Multiple modules: `modules=id1,id2,id3`
- Global: `module=all`
- Params: pass a JSON string via `params` (either global or per‑module keys)

Example with per‑module params:
```
GET /api/headless?modules=military_flights,geo_filters&format=both&params={
  "military_flights":{"bbox":{"west":23.36,"south":29.93,"east":43.02,"north":34.32}},
  "geo_filters":{"bbox":{"west":23.36,"south":29.93,"east":43.02,"north":34.32},"filters":["roundabout","street_sign"]}
}
```

## Live Monitoring (WebSocket)

Send a JSON message:
```json
{
  "action": "subscribe",
  "modules": ["polymarket_intel", "conflict_acled", "maritime_snapshot"],
  "intervalMs": 20000,
  "format": "both",
  "params": {
    "military_flights": { "bbox": { "west": 23.36, "south": 29.93, "east": 43.02, "north": 34.32 } }
  }
}
```

### Alert-Only Mode

Send alerts so updates only fire when a rule is triggered:
```json
{
  "action": "subscribe",
  "modules": ["polymarket_intel", "conflict_acled"],
  "intervalMs": 20000,
  "alertsOnly": true,
  "alerts": [
    { "id": "whale-trade", "label": "Whale trade", "module": "polymarket_intel", "path": "trades", "mode": "count", "op": "gt", "value": 0 },
    { "id": "acled-spike", "label": "ACLED spike", "module": "conflict_acled", "path": "events", "mode": "count", "op": "gt", "value": 100 }
  ]
}
```

Alert rules:
- `module`: module id to scope data
- `path`: path under module data (e.g., `trades`, `events`)
- `mode`: `count`, `delta`, or `any` (optional)
- `op`: `gt`, `gte`, `lt`, `lte`, `eq`, `contains`, `exists`
- `value`: comparison value

For granular filtering within arrays, use `mode: "any"` plus a `filter`:
```json
{
  "id": "news-by-outlet",
  "label": "Reuters breaking",
  "module": "intelligence_gdelt",
  "path": "articles",
  "mode": "any",
  "filter": { "field": "source", "op": "contains", "value": "Reuters" }
}
```

## Reference

See `references/headless-modules.md` for:
- Full module list
- Descriptions
- Common parameters per module
