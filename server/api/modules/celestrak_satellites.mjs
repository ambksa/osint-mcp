/**
 * CelesTrak — satellite orbit tracking (TLE/GP data)
 * Free, no auth. Shows active satellites, space stations, reconnaissance sats.
 */
export const name = 'celestrak_satellites';
export const description = 'Satellite orbit tracking from CelesTrak — active satellites, reconnaissance, space stations, GPS, weather sats. Query by group (e.g. "active", "stations", "military", "resource"). No auth.';

const GROUPS = {
  active: 'active', stations: 'stations', visual: 'visual',
  active_geo: 'geo', weather: 'weather', resource: 'resource',
  sarsat: 'sarsat', dmc: 'dmc', tdrss: 'tdrss', argos: 'argos',
  intelsat: 'intelsat', ses: 'ses', iridium: 'iridium',
  'iridium-NEXT': 'iridium-NEXT', starlink: 'starlink',
  oneweb: 'oneweb', orbcomm: 'orbcomm', globalstar: 'globalstar',
  amateur: 'amateur', military: 'military', radar: 'radar',
  cubesat: 'cubesat', gps: 'gps-ops', glonass: 'glo-ops',
  galileo: 'galileo', beidou: 'beidou',
  'space-stations': 'stations', reconnaissance: 'military',
};

export async function run(_ctx, params) {
  const query = (params.query || 'active').toLowerCase().trim();
  const limit = Number(params.limit || 50);
  const group = GROUPS[query] || query;

  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`CelesTrak HTTP ${resp.status}`);
  const data = await resp.json();
  const sats = Array.isArray(data) ? data : [];

  return {
    satellites: sats.slice(0, limit).map((s) => ({
      name: s.OBJECT_NAME || '',
      noradId: s.NORAD_CAT_ID || '',
      intlDesignator: s.OBJECT_ID || '',
      epoch: s.EPOCH || '',
      meanMotion: s.MEAN_MOTION || null,
      eccentricity: s.ECCENTRICITY || null,
      inclination: s.INCLINATION || null,
      period: s.PERIOD || null,
      apoapsis: s.APOAPSIS || null,
      periapsis: s.PERIAPSIS || null,
      rcsSize: s.RCS_SIZE || '',
      objectType: s.OBJECT_TYPE || '',
      launchDate: s.LAUNCH_DATE || '',
      decayDate: s.DECAY_DATE || '',
      country: s.COUNTRY_CODE || '',
    })),
    total: sats.length,
    group,
    source: 'CelesTrak',
  };
}
