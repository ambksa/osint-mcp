/**
 * FlightRadar24 Aircraft Feed — high-coverage aircraft tracking
 *
 * Uses FR24's public feed endpoint (same as their website).
 * 10-30x more aircraft than ADSB.fi in Gulf/Middle East regions.
 * Includes origin→destination routes that ADSB.fi doesn't have.
 *
 * Note: This scrapes FR24's web API. No auth needed but could be
 * rate-limited or blocked. Use respectfully — cache results.
 */

export const name = 'fr24_aircraft';
export const description = 'FlightRadar24 aircraft feed — high coverage (400+ aircraft/region), includes origin/destination routes. Use bbox for area search. Much better coverage than ADSB.fi in Middle East/Gulf.';

const MIL_TYPES = new Set([
  'C17', 'C130', 'C30J', 'C5', 'KC10', 'KC46', 'KC35', 'KC13',
  'E3', 'E6', 'E8', 'P8', 'P3', 'RC35', 'U2', 'RQ4', 'MQ9', 'MQ1',
  'F16', 'F15', 'F18', 'F22', 'F35', 'F14', 'FA18',
  'A10', 'B1', 'B2', 'B52', 'B21',
  'EUFI', 'TYPHOON', 'RAFAL', 'GRIPE', 'TORN',
  'A400', 'C295', 'CN35', 'C160',
  'HAWK', 'T38', 'T6', 'PC21', 'PC12',
  'H60', 'H64', 'CH47', 'V22', 'EH10', 'NH90', 'EC35', 'LYNX',
  'E2', 'E7', 'A330MRTT',
]);

const MIL_CALLSIGN_PREFIXES = [
  'RCH', 'REACH', 'DUKE', 'KING', 'NAVY', 'EVAC', 'JAKE', 'CNV',
  'FORTE', 'DRACO', 'BISON', 'VIPER', 'HOMER',
  'RAF', 'RRR', 'IAM', 'GAF', 'BAF', 'FAF', 'SHF',
  'RFR', 'SVF', 'TUR', 'HAF', 'PAF', 'ASY', 'CFC',
  'CASA', 'TOPCAT', 'RECON', 'KNGHT', 'JAVLN', 'JIGSW',
  'MEDOC', 'REPTL', 'SYS', 'NVY',
];

let _cache = null;
let _cacheKey = '';
let _cacheTime = 0;
const CACHE_TTL = 15000; // 15 seconds

export async function run(_ctx, params) {
  const bbox = params.bbox || '';
  if (!bbox) throw new Error('bbox required: south,west,north,east (e.g. "24,54,26,56" for UAE)');

  const parts = String(bbox).split(',').map(Number);
  if (parts.length !== 4) throw new Error('bbox must be 4 numbers: south,west,north,east');
  const [south, west, north, east] = parts;

  const limit = Number(params.limit || 200);
  const cacheKey = `${south},${west},${north},${east}`;

  // Check cache
  if (_cache && _cacheKey === cacheKey && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  const url = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&satellite=1&mlat=1&adsb=1&gnd=1&air=1&vehicles=0&estimated=0&maxage=14400&gliders=0&stats=0&bounds=${north},${south},${east},${west}`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`FR24 HTTP ${resp.status}`);
  const data = await resp.json();

  // Parse FR24 format
  // Each entry: [icao24, lat, lon, heading, alt, speed, squawk, radar, type, reg, timestamp, origin, dest, callsign, onGround, vertRate, ...]
  const aircraft = [];
  for (const [hexId, entry] of Object.entries(data)) {
    if (!Array.isArray(entry) || entry.length < 14) continue;

    const callsign = (entry[13] || '').trim().toUpperCase();
    const type = entry[8] || '';
    const isMilType = MIL_TYPES.has(type);
    const isMilCallsign = MIL_CALLSIGN_PREFIXES.some((p) => callsign.startsWith(p));

    aircraft.push({
      fr24Id: hexId,
      callsign,
      latitude: entry[1],
      longitude: entry[2],
      heading: entry[3],
      altitudeFt: entry[4] || 0,
      groundSpeedKts: entry[5] || 0,
      squawk: String(entry[6] || ''),
      aircraftType: type,
      registration: entry[9] || '',
      origin: entry[11] || '',
      destination: entry[12] || '',
      onGround: entry[14] === 1,
      verticalRateFpm: entry[15] || 0,
      military: isMilType || isMilCallsign,
    });
  }

  // Sort by altitude descending
  aircraft.sort((a, b) => (b.altitudeFt || 0) - (a.altitudeFt || 0));

  const result = {
    aircraft: aircraft.slice(0, limit),
    count: aircraft.length,
    returned: Math.min(aircraft.length, limit),
    militaryCount: aircraft.filter((a) => a.military).length,
    airborne: aircraft.filter((a) => !a.onGround).length,
    onGround: aircraft.filter((a) => a.onGround).length,
    source: 'FlightRadar24 (public feed)',
  };

  _cache = result;
  _cacheKey = cacheKey;
  _cacheTime = Date.now();

  return result;
}
