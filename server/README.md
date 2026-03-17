# WorldOSINT Headless

Standalone export of a tweaked WorldOSINT / World Monitor instance focused on local headless agent use.

This repository exposes the same dashboard and data stack, but the key workflow documented here is the headless API and WebSocket bridge for agents, cron jobs, and local automation.

## What you get

- 50+ headless OSINT modules exposed through `/api/headless`
- local CLI access for JSON snapshots
- a WebSocket polling bridge for alerts and agent subscriptions
- modules spanning RSS/news, conflict, protests, maritime, flights, geolocation, Polymarket intel, cyber, infrastructure, and more

Representative modules:
- `news_rss`
- `conflict_acled`
- `unrest_events`
- `maritime_snapshot`
- `military_flights`
- `intelligence_risk_scores`
- `military_usni`
- `polymarket_intel`
- `geo_filters`
- `satellite_snapshot`

## Quick Start

```bash
npm install
npm run dev
```

Local app base:
- `http://127.0.0.1:3000`

## Headless API

List modules:

```bash
curl "http://127.0.0.1:3000/api/headless?module=list&format=json"
```

Fetch an explicit subset:

```bash
curl "http://127.0.0.1:3000/api/headless?modules=news_rss,intelligence_risk_scores,military_usni&format=json"
```

Fetch everything:

```bash
curl "http://127.0.0.1:3000/api/headless?module=all&format=both"
```

Important response note:
- `modules` is an object keyed by module id, not an array
- access data like `modules.news_rss.data` or `modules.conflict_acled.data`

## Headless CLI

Use the bundled local CLI wrapper:

```bash
npm run headless:cli -- --base http://127.0.0.1:3000 --module list --format json --allow-local 1
npm run headless:cli -- --base http://127.0.0.1:3000 --modules news_rss,intelligence_risk_scores,military_usni --format json --allow-local 1
```

## Headless WebSocket Bridge

Run the local polling bridge exactly like this:

```bash
npm run headless:ws -- --base http://127.0.0.1:3000 --port 8787 --interval 60000 --allow-local 1
```

Expected output:

```text
> world-monitor@2.5.20 headless:ws
> node scripts/headless-ws.mjs --base http://127.0.0.1:3000 --port 8787 --interval 60000 --allow-local 1

[headless-ws] listening on ws://localhost:8787 (base=http://127.0.0.1:3000)
```

Notes:
- `--allow-local 1` is required when the base URL is localhost
- bridge health endpoint: `http://127.0.0.1:8787/health`
- default remote base can also be set with `HEADLESS_BASE_URL`

## Typical Agent Workflow

1. Start the app with `npm run dev`
2. Query `module=list` to discover available module ids
3. Fetch targeted snapshots with `/api/headless?modules=...`
4. Start `headless:ws` if you want recurring polling or alerting
5. Feed the JSON outputs into Hermes, MiroFish, or another local orchestration layer

## Useful Local Commands

```bash
npm run headless:cli -- --base http://127.0.0.1:3000 --module all --format both --allow-local 1
npm run headless:ws -- --base http://127.0.0.1:3000 --port 8787 --interval 20000 --allow-local 1
node scripts/headless-module-scan.mjs
```

## Repository Notes

- `.env` and local secrets are intentionally excluded from this repo
- `node_modules/` is not committed
- license remains AGPL-3.0

## Attribution

This standalone export is based on the broader World Monitor / WorldOSINT codebase, with local headless usage documented for agent workflows.
