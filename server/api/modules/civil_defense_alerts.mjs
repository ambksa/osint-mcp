/**
 * WMO Civil Defense / Severe Weather Alerts — 95+ countries via CAP protocol
 *
 * Aggregates Common Alerting Protocol (CAP) feeds from the World Meteorological
 * Organization's global alert system. Covers weather, earthquakes, tsunamis,
 * volcanic eruptions, and civil defense alerts from national authorities.
 *
 * Not just weather — includes civil defense, nuclear, industrial alerts depending
 * on what each country's authority publishes.
 */

import { XMLParser } from 'fast-xml-parser';

export const name = 'civil_defense_alerts';
export const description = 'Civil defense and severe weather alerts from 95+ countries via WMO CAP protocol. Query by country code (e.g. "US", "JP", "DE"). Covers weather, quakes, tsunamis, civil defense.';

// Key source IDs (country → WMO source identifier)
const SOURCES = {
  US: 'us-noaa-nws-en', JP: 'jp-jma-en', DE: 'de-dwd-en', FR: 'fr-mf-en',
  AU: 'au-bom-en', CA: 'ca-eccc-en', GB: 'gb-metoffice-en', IN: 'in-imd-en',
  CN: 'cn-cma-en', BR: 'br-inmet-en', RU: 'ru-hmc-en', KR: 'kr-kma-en',
  MX: 'mx-smn-en', ZA: 'za-saws-en', EG: 'eg-ema-en', SA: 'sa-pme-en',
  AE: 'ae-ncm-en', TR: 'tr-tsms-en', PH: 'ph-pagasa-en', ID: 'id-bmkg-en',
  TH: 'th-tmd-en', PK: 'pk-pmd-en', NG: 'ng-nimet-en', KE: 'ke-kmd-en',
  IL: 'il-ims-en', NZ: 'nz-metnz-en', IT: 'it-meteoam-en', ES: 'es-aemet-en',
  NO: 'no-met-en', SE: 'se-smhi-en', FI: 'fi-fmi-en', PL: 'pl-imgw-en',
  CL: 'cl-dmchn-en', AR: 'ar-smn-en', CO: 'co-ideam-en', PE: 'pe-senamhi-en',
};

let _sourcesCache = null;
let _sourcesCacheTime = 0;

async function getSourceForCountry(country) {
  // Try known mapping first
  if (SOURCES[country]) return SOURCES[country];

  // Fall back to sources index
  if (!_sourcesCache || Date.now() - _sourcesCacheTime > 3600000) {
    try {
      const resp = await fetch('https://severeweather.wmo.int/json/sources.json', {
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        _sourcesCache = await resp.json();
        _sourcesCacheTime = Date.now();
      }
    } catch { /* use known mapping */ }
  }

  if (_sourcesCache) {
    const sources = Array.isArray(_sourcesCache) ? _sourcesCache : (_sourcesCache.sources || []);
    const match = sources.find((s) =>
      (s.iso || '').toUpperCase() === country ||
      (s.id || '').toLowerCase().startsWith(country.toLowerCase() + '-')
    );
    if (match) return match.id;
  }

  return null;
}

export async function run(ctx, params) {
  const query = (params.query || '').toUpperCase().trim();
  const limit = Number(params.limit || 30);

  // If specific country, get its CAP feed
  if (query && /^[A-Z]{2}$/.test(query)) {
    const sourceId = await getSourceForCountry(query);
    if (!sourceId) {
      return { alerts: [], country: query, error: `No WMO CAP source found for ${query}`, source: 'WMO CAP' };
    }

    const feedUrl = `https://severeweather.wmo.int/v2/cap-alerts/${sourceId}/rss.xml`;
    const proxied = `${ctx.origin}/api/rss-proxy?url=${encodeURIComponent(feedUrl)}`;
    const resp = await fetch(proxied, {
      headers: { Accept: 'application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`WMO CAP feed HTTP ${resp.status} for ${sourceId}`);
    const xml = await resp.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const data = parser.parse(xml) || {};
    const channel = data.rss?.channel || {};
    const items = channel.item || [];
    const list = Array.isArray(items) ? items : [items].filter(Boolean);

    return {
      alerts: list.slice(0, limit).map((item) => ({
        title: item.title || '',
        description: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
        link: item.link || '',
        pubDate: item.pubDate || '',
        severity: item['cap:severity'] || item.severity || '',
        urgency: item['cap:urgency'] || item.urgency || '',
        certainty: item['cap:certainty'] || item.certainty || '',
        event: item['cap:event'] || item.event || '',
        areaDesc: item['cap:areaDesc'] || item.areaDesc || '',
      })),
      country: query,
      sourceId,
      totalAlerts: list.length,
      source: 'WMO CAP',
    };
  }

  // No specific country — get global alert overview
  const resp = await fetch('https://severeweather.wmo.int/json/last24hrsCAP.json', {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`WMO overview HTTP ${resp.status}`);
  const data = await resp.json();

  // data has { oneDay: { sourceId: count }, sevenDays: {...}, thirtyDays: {...} }
  const dayData = data?.oneDay || data || {};
  const entries = Object.entries(dayData)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .map(([id, count]) => {
      const iso = id.split('-')[0]?.toUpperCase() || '';
      return { sourceId: id, country: iso, alertCount: count };
    })
    .sort((a, b) => b.alertCount - a.alertCount);

  // Filter by text query if provided
  let filtered = entries;
  if (query) {
    const ql = query.toLowerCase();
    filtered = entries.filter((e) =>
      e.sourceId.toLowerCase().includes(ql) || e.country.toLowerCase().includes(ql)
    );
  }

  return {
    countries: filtered.slice(0, limit),
    totalSources: entries.length,
    totalAlerts: entries.reduce((s, e) => s + e.alertCount, 0),
    source: 'WMO CAP (last 24 hours)',
  };
}
