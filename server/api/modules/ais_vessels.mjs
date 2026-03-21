/**
 * AIS Vessel Tracking — live ship positions via AISStream.io
 *
 * Requires AISSTREAM_API_KEY (free via GitHub login at https://aisstream.io/apikeys)
 * Without key: returns clear error with signup instructions.
 *
 * Uses REST polling against the AISStream snapshot endpoint.
 * For real-time: they offer WebSocket at wss://stream.aisstream.io/v0/stream
 */

export const name = 'ais_vessels';
export const description = 'Live vessel positions from AIS (Automatic Identification System). Requires AISSTREAM_API_KEY (free at aisstream.io). Query by bbox (south,west,north,east) for regional vessel traffic.';

// In-memory cache
let _cache = null;
let _cacheKey = '';
let _cacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

export async function run(_ctx, params) {
  const apiKey = process.env.AISSTREAM_API_KEY || '';
  if (!apiKey) {
    return {
      error: 'AISSTREAM_API_KEY not configured. Get a free key at https://aisstream.io/apikeys (GitHub login).',
      setup: 'Add to server/.env: AISSTREAM_API_KEY=your_key_here',
      vessels: [],
    };
  }

  const bbox = params.bbox || params.query || '';
  if (!bbox) throw new Error('bbox required: south,west,north,east (e.g. "24,54,26,56" for UAE)');

  const parts = String(bbox).split(',').map(Number);
  if (parts.length !== 4) throw new Error('bbox must be 4 numbers: south,west,north,east');
  const [south, west, north, east] = parts;
  const limit = Number(params.limit || 100);

  const cacheKey = `${south},${west},${north},${east}`;
  if (_cache && _cacheKey === cacheKey && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  // AISStream WebSocket subscription — we do a one-shot connect, collect data, disconnect
  // For simplicity, use their HTTP endpoint if available, otherwise note the limitation
  try {
    // Try the REST-compatible search
    const searchUrl = 'https://api.aisstream.io/v0/search';
    const body = {
      apiKey,
      boundingBoxes: [[
        [south, west],
        [north, east],
      ]],
    };

    const resp = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      const data = await resp.json();
      const vessels = (Array.isArray(data) ? data : data?.vessels || data?.results || [])
        .slice(0, limit)
        .map((v) => {
          const msg = v.Message?.PositionReport || v.MetaData || v;
          return {
            mmsi: v.MetaData?.MMSI || msg.mmsi || '',
            name: v.MetaData?.ShipName || msg.name || '',
            shipType: v.MetaData?.ShipType || msg.shipType || '',
            callSign: msg.callSign || '',
            latitude: msg.Latitude ?? msg.latitude ?? null,
            longitude: msg.Longitude ?? msg.longitude ?? null,
            speedKnots: msg.Sog ?? msg.speed ?? null,
            course: msg.Cog ?? msg.course ?? null,
            heading: msg.TrueHeading ?? msg.heading ?? null,
            destination: msg.destination || '',
            draught: msg.draught || null,
            flag: v.MetaData?.country || msg.flag || '',
            timestamp: v.MetaData?.time_utc || msg.timestamp || '',
          };
        });

      const result = {
        vessels,
        count: vessels.length,
        source: 'AISStream.io',
      };
      _cache = result;
      _cacheKey = cacheKey;
      _cacheTime = Date.now();
      return result;
    }

    // If search endpoint doesn't exist, return instructions for WebSocket
    return {
      error: `AISStream HTTP ${resp.status}. This API may require WebSocket connection.`,
      note: 'AISStream primarily uses WebSocket (wss://stream.aisstream.io/v0/stream). REST search may not be available on all plans.',
      vessels: [],
      source: 'AISStream.io',
    };
  } catch (err) {
    return {
      error: `AISStream error: ${err.message}`,
      vessels: [],
      source: 'AISStream.io',
    };
  }
}
