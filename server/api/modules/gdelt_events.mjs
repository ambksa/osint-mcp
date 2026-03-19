/**
 * GDELT Events — bulk download approach (no rate limits)
 *
 * Downloads the latest 15-minute event exports from data.gdeltproject.org
 * instead of the rate-limited Doc API. Caches in memory, refreshes every 15 min.
 *
 * Data: ~1500-2500 events per 15-min window, structured with actors, CAMEO codes,
 * Goldstein scale, tone, coordinates, source URLs.
 *
 * Query by: country, actor, event type, keyword, conflict level.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const name = 'gdelt_events';
export const description = 'GDELT global events (bulk, no rate limit) — protests, conflicts, cooperation, military posture by country. Query by country, actor, or event type. Updated every 15 min.';

// ── In-memory cache ──────────────────────────────────────────────
let _events = [];
let _lastFetch = 0;
let _lastFile = '';
const REFRESH_MS = 14 * 60 * 1000; // 14 min (events publish every 15)

// How many 15-min windows to keep (4 = 1 hour of events)
const WINDOWS_TO_KEEP = 4;
let _allEvents = [];

// ── CAMEO event root code labels ─────────────────────────────────
const CAMEO_ROOT = {
  '01': 'Public Statement', '02': 'Appeal', '03': 'Intent to Cooperate',
  '04': 'Consult', '05': 'Diplomatic Cooperation', '06': 'Material Cooperation',
  '07': 'Provide Aid', '08': 'Yield', '09': 'Investigate',
  '10': 'Demand', '11': 'Disapprove', '12': 'Reject',
  '13': 'Threaten', '14': 'Protest', '15': 'Military Posture',
  '17': 'Coerce', '18': 'Assault', '19': 'Fight',
  '20': 'Mass Violence',
};

const QUAD_LABELS = {
  1: 'Verbal Cooperation', 2: 'Material Cooperation',
  3: 'Verbal Conflict', 4: 'Material Conflict',
};

// ── FIPS to ISO country code mapping (subset) ────────────────────
const FIPS_TO_ISO = {
  AF: 'AF', AL: 'AL', AG: 'DZ', AO: 'AO', AR: 'AR', AS: 'AU', AU: 'AT',
  BA: 'BH', BD: 'BD', BE: 'BE', BG: 'BG', BH: 'BZ', BK: 'BA', BL: 'BO',
  BN: 'BJ', BR: 'BR', BU: 'BG', BY: 'BY', CA: 'CA', CD: 'CD', CE: 'LK',
  CF: 'CG', CG: 'CD', CH: 'CN', CI: 'CL', CM: 'CM', CO: 'CO', CS: 'CR',
  CT: 'CF', CU: 'CU', CY: 'CY', DA: 'DK', DJ: 'DJ', DR: 'DO', EC: 'EC',
  EG: 'EG', EI: 'IE', EN: 'EE', ER: 'ER', ES: 'SV', ET: 'ET', EZ: 'CZ',
  FI: 'FI', FR: 'FR', GA: 'GM', GB: 'GA', GG: 'GE', GH: 'GH', GM: 'DE',
  GR: 'GR', GT: 'GT', GY: 'GY', HA: 'HT', HO: 'HN', HR: 'HR', HU: 'HU',
  ID: 'ID', IN: 'IN', IR: 'IR', IS: 'IL', IT: 'IT', IZ: 'IQ', JA: 'JP',
  JO: 'JO', KE: 'KE', KG: 'KG', KN: 'KP', KS: 'KR', KU: 'KW', KZ: 'KZ',
  LA: 'LA', LE: 'LB', LH: 'LT', LI: 'LR', LO: 'SK', LS: 'LI', LU: 'LU',
  LY: 'LY', MA: 'MG', MG: 'MN', MI: 'MW', MK: 'MK', ML: 'ML', MO: 'MA',
  MR: 'MR', MU: 'OM', MX: 'MX', MY: 'MY', MZ: 'MZ', NG: 'NE', NI: 'NG',
  NL: 'NL', NO: 'NO', NP: 'NP', NZ: 'NZ', PA: 'PY', PE: 'PE', PK: 'PK',
  PL: 'PL', PM: 'PA', PO: 'PT', QA: 'QA', RO: 'RO', RP: 'PH', RS: 'RU',
  RW: 'RW', SA: 'SA', SF: 'ZA', SG: 'SN', SI: 'SI', SN: 'SG', SO: 'SO',
  SP: 'ES', SU: 'SD', SW: 'SE', SY: 'SY', SZ: 'CH', TD: 'TD', TH: 'TH',
  TI: 'TJ', TK: 'TC', TS: 'TN', TU: 'TR', TW: 'TW', TX: 'TM', AE: 'AE',
  UA: 'UA', UG: 'UG', UK: 'GB', UP: 'UA', US: 'US', UY: 'UY', UZ: 'UZ',
  VE: 'VE', VM: 'VN', YM: 'YE', ZA: 'ZM', ZI: 'ZW',
};

function fipsToIso(fips) {
  if (!fips) return '';
  return FIPS_TO_ISO[fips.toUpperCase()] || fips;
}

// ── Fetch and parse ──────────────────────────────────────────────
async function fetchLatestExport() {
  const now = Date.now();
  if (_events.length > 0 && now - _lastFetch < REFRESH_MS) return;

  const indexResp = await fetch('http://data.gdeltproject.org/gdeltv2/lastupdate.txt', {
    signal: AbortSignal.timeout(5000),
  });
  if (!indexResp.ok) throw new Error(`GDELT index HTTP ${indexResp.status}`);
  const indexText = await indexResp.text();
  const exportLine = indexText.split('\n').find((l) => l.includes('.export.CSV.zip'));
  if (!exportLine) throw new Error('No export file in GDELT lastupdate');
  const exportUrl = exportLine.split(/\s+/)[2];
  if (!exportUrl) throw new Error('Failed to parse GDELT export URL');

  // Skip if same file
  if (exportUrl === _lastFile && _events.length > 0) return;

  const resp = await fetch(exportUrl, { signal: AbortSignal.timeout(20000) });
  if (!resp.ok) throw new Error(`GDELT export HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());

  // Unzip (ZIP format — use execFileSync for safety, no shell injection)
  const tmpFile = join(tmpdir(), `gdelt_${Date.now()}.zip`);
  writeFileSync(tmpFile, buffer);
  let csv;
  try {
    csv = execFileSync('unzip', ['-p', tmpFile], { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }

  // Parse TSV (no header row)
  const rows = csv.split('\n').filter(Boolean);
  const newEvents = rows.map((row) => {
    const f = row.split('\t');
    return {
      globalEventId: f[0] || '',
      day: f[1] || '',
      actor1Name: f[6] || '',
      actor1CountryCode: f[7] || '',
      actor1Type: f[12] || '',
      actor2Name: f[16] || '',
      actor2CountryCode: f[17] || '',
      actor2Type: f[22] || '',
      isRootEvent: f[25] === '1',
      eventCode: f[26] || '',
      eventBaseCode: f[27] || '',
      eventRootCode: f[28] || '',
      eventLabel: CAMEO_ROOT[f[28]] || f[28] || '',
      quadClass: Number(f[29]) || 0,
      quadLabel: QUAD_LABELS[Number(f[29])] || '',
      goldsteinScale: parseFloat(f[30]) || 0,
      numMentions: Number(f[31]) || 0,
      numSources: Number(f[32]) || 0,
      numArticles: Number(f[33]) || 0,
      avgTone: parseFloat(f[34]) || 0,
      actionGeoFullname: f[52] || '',
      actionGeoCountry: fipsToIso(f[53]),
      actionGeoLat: parseFloat(f[56]) || null,
      actionGeoLon: parseFloat(f[57]) || null,
      dateAdded: f[59] || '',
      sourceUrl: f[60] || '',
    };
  });

  // Merge with previous windows
  _allEvents = [...newEvents, ..._allEvents].slice(0, WINDOWS_TO_KEEP * 3000);
  _events = newEvents;
  _lastFetch = now;
  _lastFile = exportUrl;
}

// ── Query interface ──────────────────────────────────────────────
export async function run(_ctx, params) {
  await fetchLatestExport();

  const query = (params.query || '').toLowerCase().trim();
  const country = (params.country || '').toUpperCase().trim();
  const eventType = (params.event_type || '').trim(); // CAMEO root code or label
  const conflictOnly = params.conflict === true || params.conflict === 'true';
  const minGoldstein = params.min_goldstein != null ? Number(params.min_goldstein) : null;
  const maxGoldstein = params.max_goldstein != null ? Number(params.max_goldstein) : null;
  const rootOnly = params.root_events === true || params.root_events === 'true';
  const limit = Number(params.limit || 50);
  const useAllWindows = params.hours || params.all_windows;

  const source = useAllWindows ? _allEvents : _events;
  let results = source;

  // Country filter (matches action geo, actor1, or actor2 country)
  if (country) {
    results = results.filter((e) =>
      e.actionGeoCountry === country ||
      e.actor1CountryCode === country ||
      e.actor2CountryCode === country
    );
  }

  // Text search
  if (query) {
    results = results.filter((e) => {
      const text = `${e.actor1Name} ${e.actor2Name} ${e.actionGeoFullname} ${e.eventLabel} ${e.sourceUrl}`.toLowerCase();
      return text.includes(query);
    });
  }

  // Event type filter
  if (eventType) {
    const etl = eventType.toLowerCase();
    results = results.filter((e) =>
      e.eventRootCode === eventType ||
      e.eventCode === eventType ||
      e.eventLabel.toLowerCase().includes(etl)
    );
  }

  // Conflict only (QuadClass 3 or 4)
  if (conflictOnly) {
    results = results.filter((e) => e.quadClass >= 3);
  }

  // Goldstein scale filter
  if (minGoldstein != null) results = results.filter((e) => e.goldsteinScale >= minGoldstein);
  if (maxGoldstein != null) results = results.filter((e) => e.goldsteinScale <= maxGoldstein);

  // Root events only (lead paragraph = higher importance)
  if (rootOnly) {
    results = results.filter((e) => e.isRootEvent);
  }

  // Sort by mentions (importance proxy)
  results.sort((a, b) => b.numMentions - a.numMentions);

  // Summary stats
  const quadCounts = { verbalCoop: 0, materialCoop: 0, verbalConflict: 0, materialConflict: 0 };
  for (const e of results) {
    if (e.quadClass === 1) quadCounts.verbalCoop++;
    else if (e.quadClass === 2) quadCounts.materialCoop++;
    else if (e.quadClass === 3) quadCounts.verbalConflict++;
    else if (e.quadClass === 4) quadCounts.materialConflict++;
  }

  return {
    events: results.slice(0, limit),
    totalMatching: results.length,
    totalInCache: source.length,
    windowsCached: useAllWindows ? WINDOWS_TO_KEEP : 1,
    quadClassBreakdown: quadCounts,
    avgGoldstein: results.length ? Math.round(results.reduce((s, e) => s + e.goldsteinScale, 0) / results.length * 100) / 100 : 0,
    lastUpdate: _lastFile.match(/(\d{14})/)?.[1] || '',
    source: 'GDELT Events Export (bulk, no rate limit)',
  };
}
