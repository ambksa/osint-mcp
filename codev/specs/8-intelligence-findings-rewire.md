# Spec 8: Rewire Intelligence Findings

**Date**: 2026-03-18
**Status**: Specified
**Effort**: ~1 hour

## Problem

The `intelligence_findings` module is the alert fusion layer — it pulls from 7 modules, synthesizes findings into prioritized alerts (critical/high/medium/low). Currently it depends on 5 broken modules:

| Source Module | Status | What it contributed |
|---------------|--------|---------------------|
| `conflict_acled` | DEAD | Armed conflict events |
| `unrest_events` | DEAD | Protests/riots |
| `infrastructure_outages` | WORKING (0 is valid) | Internet outages |
| `maritime_warnings` | DEAD | Navigational warnings |
| `cyber_threats` | WEAK (1 IOC) | Cyber threat IOCs |
| `seismology_earthquakes` | WORKING | Significant earthquakes |
| `intelligence_risk_scores` | STATIC | CII risk scores (all dynamic=0) |

**Result**: The module only produces findings from cyber threats and large earthquakes. 5 of 7 inputs are dead.

## Solution

Rewire `intelligence_findings` in headless.js to pull from working modules:

### New source modules (all verified working)

| Source Module | Finding Type | Priority Logic |
|---------------|-------------|----------------|
| `cisa_kev` | Actively exploited CVEs | New CVEs in last 48h → HIGH |
| `ransomware_posts` | Ransomware extortion | Any posts → HIGH |
| `threatfox_iocs` | Malware IOCs | Critical severity → HIGH, else MEDIUM |
| `natural_events_gdacs` | Disaster alerts | GDACS severity ≥2 → HIGH, else MEDIUM |
| `seismology_earthquakes` | Significant quakes | M≥7 → CRITICAL, M≥6 → HIGH, M≥5.5 → MEDIUM |
| `weather_alerts` | Severe weather | Extreme → HIGH, Severe → MEDIUM |
| `embassy_alerts` | Diplomatic warnings | Any alert → MEDIUM |
| `health_advisories` | Disease outbreaks | Any outbreak → MEDIUM |
| `defense_news` | Military signals | Keyword scan for escalation terms → MEDIUM |
| `news_rss` | Breaking news | Threat keyword density > threshold → MEDIUM |
| `country_risk_signals` | Travel advisory changes | Level 4 → HIGH, Level 3 → MEDIUM |

### Finding schema (unchanged)

```json
{
  "id": "cisa-CVE-2026-1234",
  "type": "cyber_vulnerability",
  "title": "Actively exploited: CVE-2026-1234 (Microsoft Exchange)",
  "summary": "CVSS 9.8 — remote code execution, added to CISA KEV 2026-03-17",
  "priority": "high",
  "confidence": 0.9,
  "timestamp": 1773849073097,
  "source": "cisa_kev",
  "payload": { ... }
}
```

### Implementation

Replace lines 794-942 in `server/api/headless.js` (`intelligence_findings` module) with new implementation that:

1. Fetches all 11 working modules in parallel via `Promise.allSettled`
2. Applies finding-specific extraction logic per source
3. Deduplicates by ID
4. Sorts by priority (critical → high → medium → low) then by timestamp (newest first)
5. Returns findings array + summary counts + source status

### Thresholds

```javascript
// Earthquakes: only M ≥ 5.5
// GDACS: only severity ≥ 1 (green+)
// CISA KEV: only CVEs added in last 7 days
// Ransomware: all posts (they're already recent)
// Weather: only "Extreme" or "Severe" alerts
// News: only articles with 3+ threat keywords mentioning a tracked country
// Defense: only articles with escalation keywords (strike, deploy, mobilize, launch)
```

### Expected output

With current data, should produce ~20-50 findings:
- ~5-10 CISA KEV (recent actively exploited CVEs)
- ~10-20 ransomware posts
- ~5-10 GDACS disasters
- ~2-5 significant earthquakes
- ~5-10 severe weather alerts
- ~1-3 embassy/diplomatic alerts
- ~2-5 threat-keyword-heavy news articles

## Files to change

- `server/api/headless.js` — replace `intelligence_findings` module implementation (lines 794-942)
- No MCP changes needed (module name stays the same)

## Acceptance

- [ ] `intelligence_findings` returns 10+ findings from at least 4 different sources
- [ ] Each finding has id, type, title, summary, priority, confidence, timestamp, source
- [ ] Summary shows correct counts by priority level
- [ ] Sources array lists all modules that contributed data
