# Spec 6: Fix Weak Tools

**Date**: 2026-03-18
**Status**: Specified
**Effort**: ~1-2 hours

## Goal

Fix the 3 tools that passed audit but return poor/empty data.

## 6.1 get_imf_data — Empty Results

**Problem**: Returns empty data `{"data": {}}` for valid queries like `indicator=PCPIPCH&country=US`.
**Root cause**: The headless module sends params as `indicator` and `country`, but the IMF DataMapper API expects different param names or URL structure.

**Fix approach**:
1. Read the `imf_data` module in headless.js
2. Test the upstream IMF API directly: `https://www.imf.org/external/datamapper/api/v1/PCPIPCH/USA`
3. Fix param mapping to match IMF's actual API format
4. Verify response parsing handles IMF's nested JSON structure

**Acceptance**: `get_imf_data(query="US", indicator="NGDP_RPCH")` returns GDP growth data.

## 6.2 get_travel_advisories — Inconsistent Results

**Problem**: Returns 40 items when called without query, but 0 for some country queries (e.g. "France" returns 0, "Emirates" returns 2). The RSS feed parsing doesn't match country names consistently.

**Fix approach**:
1. Check how the `travel_advisories` module filters by query
2. The feed has titles like "France - Level 2: Exercise Increased Caution" — query matching needs to search the full title text, not just a country field
3. Make query matching case-insensitive substring search across title + description
4. Consider fetching all advisories and filtering client-side for reliability

**Acceptance**: `get_travel_advisories(query="France")` returns the France advisory. Same for "Japan", "UAE", "Germany".

## 6.3 get_cyber_threats — Only 1 IOC

**Problem**: Returns only 1 threat IOC (a QakBot C2 server). The module aggregates from Feodo, URLhaus, OTX, AbuseIPDB, and C2Intel — but most sources seem to not return data.

**Fix approach**:
1. Read the `cyber_threats` module in headless.js
2. Check which upstream sources it actually calls vs which fail silently
3. The module calls `/api/cyber/v1/list-cyber-threats` — check if this RPC endpoint's upstream calls are timing out or returning errors
4. Consider adding direct abuse.ch Feodo Tracker fetch as fallback: `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json`
5. If upstream RPC is fundamentally broken, rewrite the headless module to directly fetch from the public APIs:
   - Feodo: `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json`
   - ThreatFox already works separately
   - URLhaus will be added in Spec 5

**Acceptance**: `get_cyber_threats()` returns 10+ IOCs from at least 2 sources.

## Files to change

- `server/api/headless.js` — fix module implementations for `imf_data`, `travel_advisories`, `cyber_threats`
- No MCP changes needed
