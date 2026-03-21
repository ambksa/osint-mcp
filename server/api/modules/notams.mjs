/**
 * NOTAMs — Notices to Air Missions from FAA
 *
 * Query by ICAO airport code (e.g. OMDB for Dubai, OERK for Riyadh).
 * Requires FAA_NOTAM_API_KEY — register at https://notams.aim.faa.gov/notamSearch/
 * Without key returns clear setup instructions.
 */

export const name = 'notams';
export const description = 'FAA NOTAMs (Notices to Air Missions) — airspace closures, hazards, facility changes. Requires FAA_NOTAM_API_KEY. Query with ICAO code (e.g. OMDB, KJFK, EGLL).';

export async function run(_ctx, params) {
  const apiKey = process.env.FAA_NOTAM_API_KEY || '';
  if (!apiKey) {
    return {
      error: 'FAA_NOTAM_API_KEY not configured. Register at https://api.faa.gov/ for a free key.',
      setup: 'Add to server/.env: FAA_NOTAM_API_KEY=your_key_here',
      notams: [],
    };
  }

  const query = (params.query || '').trim().toUpperCase();
  if (!query) throw new Error('query required: ICAO airport code (e.g. OMDB, KJFK, EGLL)');

  const limit = Number(params.limit || 20);

  const url = new URL('https://external-api.faa.gov/notamapi/v1/notams');
  url.searchParams.set('responseFormat', 'geoJson');
  url.searchParams.set('pageSize', String(Math.min(limit, 100)));

  if (/^[A-Z]{4}$/.test(query)) {
    url.searchParams.set('icaoLocation', query);
  } else if (/^[A-Z]{3}$/.test(query)) {
    url.searchParams.set('domesticLocation', query);
  } else {
    url.searchParams.set('icaoLocation', query);
  }

  const resp = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/geo+json',
      'User-Agent': 'osint-mcp/1.0',
      'client_id': apiKey,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    // FAA API may require different format or auth — try fallback
    const fallbackUrl = `https://notams.aim.faa.gov/notamSearch/search?searchType=0&notamSearch_type=notamSearchType_icao&designator=${query}`;
    try {
      const fallbackResp = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'osint-mcp/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (fallbackResp.ok) {
        const data = await fallbackResp.json();
        const notamList = data?.notamList || [];
        return {
          notams: notamList.slice(0, limit).map((n) => ({
            id: n.notamNumber || n.id || '',
            type: n.type || '',
            location: query,
            text: (n.icaoMessage || n.traditionalMessage || '').slice(0, 500),
            effectiveStart: n.effectiveStart || '',
            effectiveEnd: n.effectiveEnd || '',
            classification: n.classification || '',
          })),
          total: notamList.length,
          query,
          source: 'FAA NOTAM Search',
        };
      }
    } catch { /* fall through */ }
    throw new Error(`FAA NOTAM API HTTP ${resp.status} for ${query}`);
  }

  const data = await resp.json();
  const features = data?.features || [];

  return {
    notams: features.slice(0, limit).map((f) => {
      const props = f.properties || {};
      return {
        id: props.coreNOTAMData?.notam?.id || '',
        type: props.coreNOTAMData?.notam?.type || '',
        location: props.coreNOTAMData?.notam?.location || query,
        text: (props.coreNOTAMData?.notam?.text || '').slice(0, 500),
        effectiveStart: props.coreNOTAMData?.notam?.effectiveStart || '',
        effectiveEnd: props.coreNOTAMData?.notam?.effectiveEnd || '',
        classification: props.coreNOTAMData?.notam?.classification || '',
        schedule: props.coreNOTAMData?.notam?.schedule || '',
        coordinates: f.geometry?.coordinates || null,
      };
    }),
    total: features.length,
    query,
    source: 'FAA NOTAM API',
  };
}
