# Spec 10: Fix intelligence_report Composite Tool

**Date**: 2026-03-19
**Status**: Specified

## Problem

The `intelligence_report` composite tool queries 14 modules in parallel to generate a comprehensive regional intelligence report. Several of its source modules are broken (ACLED, unrest, maritime, etc.), producing empty sections in the output.

## Current Source Modules

Find the `intelligence_report` module in `server/api/headless.js`. It calls internal modules and filters by keywords. Check which modules it uses and replace broken ones with working alternatives.

## Working modules to use

These modules are verified working (tested 2026-03-18):
- `news_rss` — 198 items, excellent
- `defense_news` — 72 items, excellent
- `seismology_earthquakes` — working
- `natural_events_gdacs` — 70 events
- `weather_alerts` — 76 alerts
- `cyber_threats` — 5 IOCs (enhanced with Feodo)
- `cisa_kev` — 50 CVEs
- `ransomware_posts` — 100 posts
- `infrastructure_outages` — working (0 is valid)
- `infrastructure_services` — 30 items
- `embassy_alerts` — 13 items
- `health_advisories` — 50 items
- `travel_advisories` — 40 items
- `economic_macro` — working
- `aviation_delays` — 13 items
- `military_usni` — 17KB data
- `supply_chain_chokepoints` — 6 chokepoints
- `country_risk_signals` — plugin, 72 countries

## Broken modules to remove from intelligence_report

- `conflict_acled` — DEAD
- `unrest_events` — DEAD
- `maritime_warnings` — DEAD
- `maritime_snapshot` — DEAD
- `military_posture` — DEAD
- `military_flights` — DEAD (replaced by unified `opensky_aircraft`)

## Implementation

1. Find the `intelligence_report` module in `server/api/headless.js`
2. Replace its module list with working modules
3. Update the keyword filtering to work with the new module data shapes
4. Ensure the report sections map to the new data sources
5. Test with `intelligence_report(query="Dubai", keywords="Dubai,UAE,Gulf")`

## Acceptance

- [ ] `intelligence_report(query="Dubai")` returns data from 10+ modules
- [ ] No empty sections from dead modules
- [ ] Keyword filtering works on all new modules
- [ ] Response time < 15 seconds
