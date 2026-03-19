/**
 * OpenSanctions — Global sanctions search across 40+ lists
 * Downloads and searches targets.simple.csv from OpenSanctions bulk data.
 * Cached in memory after first fetch (refreshed every 6 hours).
 */

export const name = 'opensanctions';
export const description = 'Global sanctions search across 40+ lists (OFAC, EU, UN, UK, AU + PEPs). Search by name, country, or sanctions program. No API key — uses free bulk data.';

// In-memory cache (loaded once, refreshed every 6h)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 6 * 3600 * 1000;

async function loadData() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const resp = await fetch(
    'https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv',
    { signal: AbortSignal.timeout(30000) },
  );
  if (!resp.ok) throw new Error(`OpenSanctions CSV HTTP ${resp.status}`);
  const text = await resp.text();
  const lines = text.split('\n');
  // Skip header
  const header = lines[0];
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Parse CSV (quoted fields)
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') { field += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(field); field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);

    entries.push({
      id: fields[0] || '',
      schema: fields[1] || '',
      name: fields[2] || '',
      aliases: fields[3] || '',
      birthDate: fields[4] || '',
      countries: fields[5] || '',
      addresses: fields[6] || '',
      identifiers: fields[7] || '',
      sanctions: fields[8] || '',
      dataset: fields[12] || '',
      firstSeen: fields[13] || '',
      lastSeen: fields[14] || '',
    });
  }

  _cache = entries;
  _cacheTime = Date.now();
  return entries;
}

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query parameter required (name, country, or sanctions program)');
  const limit = Math.min(Number(params.limit || 20), 200);
  const schema = (params.schema || '').toLowerCase();
  const ql = query.toLowerCase();

  const entries = await loadData();

  const matches = [];
  for (const e of entries) {
    if (matches.length >= limit) break;
    if (schema && e.schema.toLowerCase() !== schema) continue;
    const searchable = `${e.name} ${e.aliases} ${e.countries} ${e.sanctions} ${e.dataset} ${e.addresses}`.toLowerCase();
    if (searchable.includes(ql)) {
      matches.push({
        id: e.id,
        name: e.name,
        schema: e.schema,
        aliases: e.aliases ? e.aliases.split(';').filter(Boolean) : [],
        countries: e.countries ? e.countries.split(';').filter(Boolean) : [],
        sanctions: e.sanctions,
        dataset: e.dataset,
        birthDate: e.birthDate || null,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
      });
    }
  }

  return {
    entities: matches,
    total: matches.length,
    totalInDatabase: entries.length,
    query,
    schema: schema || 'all',
    source: 'OpenSanctions bulk data (targets.simple.csv)',
  };
}
