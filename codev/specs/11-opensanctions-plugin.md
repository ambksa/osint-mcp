# Spec 11: OpenSanctions Plugin

**Date**: 2026-03-19
**Status**: Specified

## Problem

Current `get_sanctions` only covers OFAC SDN (US sanctions). OpenSanctions consolidates 40+ sanctions lists globally including EU, UN, UK, AU, and PEP (Politically Exposed Persons) data — over 1M entities.

## Data Source

**OpenSanctions** — opensanctions.org
- **Bulk data**: `https://data.opensanctions.org/datasets/latest/default/targets.simple.json` (~100MB, all entities)
- **Search API**: `https://api.opensanctions.org/search/default?q=QUERY` (requires API key for production, but dataset is free)
- **Alternative**: Use the "sanctions" dataset (smaller, sanctions-only): `https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.json`

## Implementation

Create `server/api/modules/opensanctions.mjs` plugin:

1. On first call, fetch the sanctions dataset index (NOT the full 100MB dump)
2. Use the public API endpoint: `https://api.opensanctions.org/search/default?q=QUERY&limit=20`
3. If API is blocked/rate-limited, fall back to searching the smaller "sanctions" CSV
4. Query is required — search by name, country, or program
5. Return: name, schema (Person/Company/Vessel), datasets (which lists they're on), countries, sanctions programs, properties

## API Response Format

The search API returns:
```json
{
  "results": [
    {
      "id": "NK-ABC123",
      "schema": "Person",
      "name": "Kim Jong Un",
      "datasets": ["un_sc_sanctions", "us_ofac_sdn", "eu_fsf"],
      "countries": ["kp"],
      "properties": {
        "nationality": ["North Korea"],
        "position": ["Supreme Leader"],
        "birthDate": ["1984-01-08"]
      },
      "score": 0.95
    }
  ]
}
```

## Plugin File

`server/api/modules/opensanctions.mjs`:
- `name`: `opensanctions`
- `description`: Global sanctions search across 40+ lists (OFAC, EU, UN, UK + PEPs)
- Params: `query` (required), `limit` (default 20), `schema` (optional: Person, Company, Vessel)
- No API key required for basic search (ymmv on rate limits)

## Acceptance

- [ ] `opensanctions(query="Iran")` returns entities from multiple sanctions lists
- [ ] Results include `datasets` showing which lists each entity appears on
- [ ] Works without API key
- [ ] Auto-discovered by MCP as `get_opensanctions`
