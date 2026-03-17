import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { XMLParser } from 'fast-xml-parser';

export const config = { runtime: 'edge' };

const DEFAULT_BBOX = { west: -180, south: -90, east: 180, north: 90 };

function parseJsonParam(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeBbox(params) {
  const bbox = params?.bbox || {};
  const west = Number(bbox.west ?? bbox.w ?? DEFAULT_BBOX.west);
  const south = Number(bbox.south ?? bbox.s ?? DEFAULT_BBOX.south);
  const east = Number(bbox.east ?? bbox.e ?? DEFAULT_BBOX.east);
  const north = Number(bbox.north ?? bbox.n ?? DEFAULT_BBOX.north);
  return { west, south, east, north };
}

function toFiniteNumber(value) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, String(v)));
    } else {
      qs.set(key, String(value));
    }
  });
  return qs.toString();
}

function parseJsonLenient(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const withoutBom = trimmed.replace(/^\uFEFF/, '');
    const withoutLineComments = withoutBom.replace(/^\s*\/\/.*$/gm, '');
    const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    const cleaned = withoutBlockComments.trim();
    return JSON.parse(cleaned);
  }
}

async function fetchJsonUrl(url, options = {}) {
  const resp = await fetch(url, {
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || 20000),
    method: options.method || 'GET',
    body: options.body,
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 220)}`);
  }
  const parsed = parseJsonLenient(text);
  if (parsed == null) throw new Error('Upstream returned empty JSON');
  return parsed;
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickLatestYearEntry(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const years = Object.keys(obj).filter((k) => /^-?\d{4}$/.test(String(k))).sort();
  if (!years.length) return null;
  const year = years[years.length - 1];
  const value = toNumberOrNull(obj[year]);
  if (value == null) return null;
  return { year, value };
}

async function fetchFredSeries({ seriesId = 'UNRATE', limit = 120, apiKey = '' }) {
  const key = String(apiKey || process.env.FRED_API_KEY || '').trim();
  if (!key) throw new Error('Missing FRED API key (set FRED_API_KEY)');
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', String(seriesId || 'UNRATE'));
  url.searchParams.set('api_key', key);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'asc');
  url.searchParams.set('limit', String(Math.max(2, Math.min(Number(limit || 120), 1000))));
  const data = await fetchJsonUrl(url.toString());
  const obs = Array.isArray(data?.observations) ? data.observations : [];
  const cleaned = obs
    .map((o) => ({ date: o?.date || '', value: toNumberOrNull(o?.value) }))
    .filter((o) => o.value != null);
  const latest = cleaned[cleaned.length - 1] || null;
  const previous = cleaned[cleaned.length - 2] || null;
  const change = latest && previous ? latest.value - previous.value : null;
  const changePercent = latest && previous && previous.value !== 0
    ? ((latest.value - previous.value) / Math.abs(previous.value)) * 100
    : null;
  return {
    seriesId: String(seriesId || 'UNRATE'),
    units: data?.units || '',
    latest,
    previous,
    change,
    changePercent,
    points: cleaned.slice(-200),
    source: 'FRED',
  };
}

async function fetchWorldBankIndicator({
  indicator = 'NY.GDP.MKTP.CD',
  countries = 'US',
  startYear = '',
  endYear = '',
  perPage = 200,
}) {
  const countryList = String(countries || 'US')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .join(';');
  const url = new URL(`https://api.worldbank.org/v2/country/${encodeURIComponent(countryList)}/indicator/${encodeURIComponent(indicator)}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('per_page', String(Math.max(10, Math.min(Number(perPage || 200), 1000))));
  if (startYear || endYear) {
    const range = `${startYear || 1960}:${endYear || new Date().getUTCFullYear()}`;
    url.searchParams.set('date', range);
  }
  const body = await fetchJsonUrl(url.toString());
  const rows = Array.isArray(body?.[1]) ? body[1] : [];
  const normalized = rows.map((r) => ({
    country: r?.country?.value || '',
    countryCode: r?.country?.id || '',
    date: String(r?.date || ''),
    value: toNumberOrNull(r?.value),
    unit: r?.unit || '',
    obsStatus: r?.obs_status || '',
    decimal: r?.decimal ?? null,
  }));
  const latestByCountry = [];
  const seen = new Set();
  for (const row of normalized) {
    if (!row.countryCode || row.value == null || seen.has(row.countryCode)) continue;
    seen.add(row.countryCode);
    latestByCountry.push(row);
  }
  return {
    indicator,
    countries: countryList.split(';'),
    latestByCountry,
    series: normalized.slice(0, 800),
    source: 'World Bank',
  };
}

async function fetchImfDatamapper({ series = 'NGDP_RPCH', countries = '', limit = 200 }) {
  const url = new URL(`https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(series)}`);
  const data = await fetchJsonUrl(url.toString());
  const values = data?.values?.[series] || {};
  const countryFilter = new Set(
    String(countries || '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
  const rows = [];
  for (const [countryCode, yearValues] of Object.entries(values)) {
    if (countryFilter.size && !countryFilter.has(String(countryCode).toUpperCase())) continue;
    const latest = pickLatestYearEntry(yearValues);
    if (!latest) continue;
    rows.push({
      countryCode,
      year: latest.year,
      value: latest.value,
    });
  }
  rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return {
    series,
    latest: rows.slice(0, Math.max(1, Math.min(Number(limit || 200), 1000))),
    source: 'IMF DataMapper',
  };
}

async function fetchOecdDataset({ dataset = 'DP_LIVE', query = '.GDP...A', format = 'json' }) {
  const url = new URL(`https://stats.oecd.org/SDMX-JSON/data/${encodeURIComponent(dataset)}/${query}`);
  url.searchParams.set('contentType', format === 'csv' ? 'csv' : 'application/json');
  const resp = await fetch(url.toString(), {
    headers: { Accept: format === 'csv' ? 'text/csv,*/*;q=0.8' : 'application/json,*/*;q=0.8' },
    signal: AbortSignal.timeout(20000),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 220)}`);
  if (/Just a moment/i.test(text) || /cf-browser-verification/i.test(text) || /Cloudflare/i.test(text)) {
    throw new Error('OECD endpoint blocked by upstream anti-bot challenge from this runtime');
  }
  if (format === 'csv') {
    const lines = text.trim().split('\n');
    return {
      dataset,
      query,
      source: 'OECD',
      format: 'csv',
      lineCount: lines.length,
      preview: lines.slice(0, 50),
    };
  }
  const parsed = parseJsonLenient(text);
  if (parsed == null) throw new Error('OECD returned non-JSON body');
  return {
    dataset,
    query,
    source: 'OECD',
    format: 'json',
    data: parsed,
  };
}

async function resolveSecTicker(ticker) {
  const t = String(ticker || 'AAPL').trim().toUpperCase();
  const list = await fetchJsonUrl('https://www.sec.gov/files/company_tickers.json', {
    headers: { 'User-Agent': process.env.SEC_USER_AGENT || 'worldosint/1.0 (ops@h1dr4.dev)' },
  });
  const rows = Object.values(list || {});
  const match = rows.find((r) => String(r?.ticker || '').toUpperCase() === t);
  if (!match?.cik_str) throw new Error(`SEC ticker not found: ${t}`);
  const cik = String(match.cik_str).padStart(10, '0');
  return { ticker: t, cik, title: String(match?.title || '') };
}

async function fetchSecFilings({ ticker = 'AAPL', limit = 20 }) {
  const resolved = await resolveSecTicker(ticker);
  const submissions = await fetchJsonUrl(`https://data.sec.gov/submissions/CIK${resolved.cik}.json`, {
    headers: { 'User-Agent': process.env.SEC_USER_AGENT || 'worldosint/1.0 (ops@h1dr4.dev)' },
  });
  const recent = submissions?.filings?.recent || {};
  const forms = Array.isArray(recent.form) ? recent.form : [];
  const accessionNumbers = Array.isArray(recent.accessionNumber) ? recent.accessionNumber : [];
  const filingDates = Array.isArray(recent.filingDate) ? recent.filingDate : [];
  const reportDates = Array.isArray(recent.reportDate) ? recent.reportDate : [];
  const primaryDocs = Array.isArray(recent.primaryDocument) ? recent.primaryDocument : [];
  const items = [];
  const max = Math.min(forms.length, Math.max(1, Math.min(Number(limit || 20), 100)));
  for (let i = 0; i < max; i += 1) {
    const accession = accessionNumbers[i] || '';
    const accNoDashes = accession.replace(/-/g, '');
    const primary = primaryDocs[i] || '';
    const filingUrl = accession && primary
      ? `https://www.sec.gov/Archives/edgar/data/${Number(resolved.cik)}/${accNoDashes}/${primary}`
      : '';
    items.push({
      form: forms[i] || '',
      filingDate: filingDates[i] || '',
      reportDate: reportDates[i] || '',
      accessionNumber: accession,
      filingUrl,
    });
  }
  return {
    ticker: resolved.ticker,
    cik: resolved.cik,
    companyName: resolved.title,
    filings: items,
    source: 'SEC EDGAR',
  };
}

function getFmpApiKey(params = {}) {
  const key = String(params.apikey || params.api_key || process.env.FMP_API_KEY || '').trim();
  if (!key) throw new Error('Missing FMP API key (set FMP_API_KEY)');
  return key;
}

async function fetchFmp(path, params = {}) {
  const key = getFmpApiKey(params);
  const url = new URL(`https://financialmodelingprep.com/stable/${path.replace(/^\/+/, '')}`);
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'apikey' || k === 'api_key') return;
    if (v === undefined || v === null || v === '') return;
    url.searchParams.set(k, String(v));
  });
  url.searchParams.set('apikey', key);
  return fetchJsonUrl(url.toString());
}

async function fetchJson(origin, endpoint, params) {
  const qs = buildQuery(params);
  const url = `${origin}${endpoint}${qs ? `?${qs}` : ''}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status} ${endpoint}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

function computeClusters(trades) {
  const bySlug = new Map();
  trades.forEach((t) => {
    const slug = String(t.slug || '');
    if (!slug) return;
    const list = bySlug.get(slug) || [];
    list.push(t);
    bySlug.set(slug, list);
  });

  const clusters = [];
  for (const [slug, list] of bySlug.entries()) {
    const sorted = [...list].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    let windowStart = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      while (Number(sorted[i].timestamp) - Number(sorted[windowStart].timestamp) > 15 * 60) {
        windowStart += 1;
      }
      const window = sorted.slice(windowStart, i + 1);
      if (window.length < 4) continue;
      const notional = window.reduce((sum, w) => sum + toFiniteNumber(w.tradeNotional ?? (Number(w.size || 0) * Number(w.price || 0))), 0);
      const wallets = new Set(window.map((w) => w.wallet || w.proxyWallet || w.trader || '')).size;
      const largestTrade = Math.max(...window.map((w) => toFiniteNumber(w.tradeNotional ?? (Number(w.size || 0) * Number(w.price || 0)))));
      clusters.push({
        slug,
        title: String(window[window.length - 1].title || ''),
        tradeCount: window.length,
        notional,
        wallets,
        largestTrade,
        windowMinutes: Math.round((Number(window[window.length - 1].timestamp) - Number(window[0].timestamp)) / 60),
      });
      break;
    }
  }
  return clusters.sort((a, b) => b.notional - a.notional).slice(0, 12);
}

function computeWallets(trades) {
  const map = new Map();
  trades.forEach((t) => {
    const wallet = String(t.proxyWallet || t.wallet || t.trader || '');
    if (!wallet) return;
    const entry = map.get(wallet) || { tradeCount: 0, notional: 0, markets: new Set() };
    entry.tradeCount += 1;
    entry.notional += toFiniteNumber(t.tradeNotional ?? (Number(t.size || 0) * Number(t.price || 0)));
    entry.markets.add(String(t.slug || ''));
    map.set(wallet, entry);
  });
  return Array.from(map.entries())
    .map(([wallet, v]) => ({
      wallet,
      tradeCount: v.tradeCount,
      notional: v.notional,
      markets: v.markets.size,
    }))
    .sort((a, b) => b.notional - a.notional)
    .slice(0, 12);
}

async function fetchOverpass(bbox, filters, maxPerType) {
  const filterQueries = {
    roundabout: ['way["junction"="roundabout"]'],
    traffic_signals: ['node["highway"="traffic_signals"]'],
    stop_sign: ['node["traffic_sign"="stop"]', 'node["highway"="stop"]'],
    street_sign: ['node["traffic_sign"]'],
    milestone: ['node["highway"="milestone"]'],
    level_crossing: ['node["railway"="level_crossing"]'],
    bridge: ['way["bridge"="yes"]', 'way["man_made"="bridge"]'],
  };
  const parts = [];
  for (const filter of filters) {
    const queries = filterQueries[filter] || [];
    for (const query of queries) {
      parts.push(`${query}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`);
    }
  }
  const query = `
[out:json][timeout:25];
(
  ${parts.join('\n  ')}
);
out center qt;
`;
  const body = new URLSearchParams({ data: query });
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
  ];

  let response = null;
  let lastError = null;
  for (let attempt = 0; attempt < endpoints.length; attempt += 1) {
    try {
      response = await fetch(endpoints[attempt], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(20000),
      });
      if (response.ok) break;
      lastError = new Error(`Overpass ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Overpass fetch failed');
    }
  }
  if (!response || !response.ok) throw lastError || new Error('Overpass request failed');
  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const counts = Object.fromEntries(filters.map((f) => [f, 0]));
  let truncated = false;
  const features = [];
  const seen = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    let type = null;
    if (tags.junction === 'roundabout') type = 'roundabout';
    else if (tags.highway === 'traffic_signals') type = 'traffic_signals';
    else if (tags.traffic_sign === 'stop' || tags.highway === 'stop') type = 'stop_sign';
    else if (tags.traffic_sign) type = 'street_sign';
    else if (tags.highway === 'milestone') type = 'milestone';
    else if (tags.railway === 'level_crossing') type = 'level_crossing';
    else if (tags.bridge === 'yes' || tags.man_made === 'bridge') type = 'bridge';
    if (!type || !filters.includes(type)) continue;

    if (counts[type] >= maxPerType) {
      truncated = true;
      continue;
    }
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    counts[type] = (counts[type] || 0) + 1;
    features.push({ id, type, lat, lon, tags, source: 'osm' });
  }

  return { features, truncated, counts };
}

function buildFindingsSummary(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  for (const f of findings) {
    summary.total += 1;
    const key = (f.priority || 'low').toLowerCase();
    if (summary[key] !== undefined) summary[key] += 1;
  }
  return summary;
}

function severityToPriority(sev) {
  const s = String(sev || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium')) return 'medium';
  if (s.includes('low')) return 'low';
  return 'medium';
}

function earthquakeSeverity(mag) {
  const m = Number(mag || 0);
  if (m >= 7.0) return 95;
  if (m >= 6.0) return 90;
  if (m >= 5.5) return 82;
  if (m >= 5.0) return 74;
  if (m >= 4.5) return 64;
  return 50;
}

function climateSeverity(sevRaw) {
  const numeric = Number(sevRaw);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }
  const sev = String(sevRaw || '').toLowerCase();
  if (sev.includes('extreme')) return 88;
  if (sev.includes('moderate')) return 68;
  if (sev.includes('normal')) return 42;
  if (sev.includes('high')) return 84;
  if (sev.includes('low')) return 56;
  return 50;
}

function conflictSeverityFromEvent(eventType, fatalities) {
  const t = String(eventType || '').toLowerCase();
  const f = Number(fatalities || 0);
  if (f >= 50) return 96;
  if (f >= 20) return 90;
  if (f >= 5) return 82;
  if (t.includes('explosion') || t.includes('remote violence')) return 78;
  if (t.includes('violence against civilians')) return 84;
  if (t.includes('battle')) return 74;
  return 62;
}

function unrestSeverityFromEnum(sevRaw) {
  const sev = String(sevRaw || '').toLowerCase();
  if (sev.includes('high')) return 86;
  if (sev.includes('medium')) return 70;
  if (sev.includes('low')) return 56;
  return 60;
}

function maritimeSeverityFromEnum(sevRaw) {
  const sev = String(sevRaw || '').toLowerCase();
  if (sev.includes('high')) return 88;
  if (sev.includes('elevated')) return 72;
  if (sev.includes('low')) return 58;
  return 60;
}

function normalizeModuleData(name, data) {
  if (!data || typeof data !== 'object') return data;

  if (name === 'seismology_earthquakes' && Array.isArray(data.earthquakes)) {
    const earthquakes = data.earthquakes.map((eq) => {
      const mag = Number(eq?.magnitude ?? 0);
      const depthKm = Number(eq?.depthKm ?? 0);
      const lat = Number(eq?.location?.latitude ?? 0);
      const lon = Number(eq?.location?.longitude ?? 0);
      const sev = earthquakeSeverity(mag);
      const title = `M${mag.toFixed(1)} earthquake ${eq?.place || ''}`.trim();
      const summary = `USGS M${mag.toFixed(1)} at depth ${depthKm.toFixed(1)} km`;
      return {
        ...eq,
        lat,
        lon,
        severity: sev,
        severityLabel: sev >= 90 ? 'major' : sev >= 74 ? 'strong' : 'moderate',
        title,
        summary,
      };
    });
    return { ...data, earthquakes };
  }

  if (name === 'climate_anomalies' && Array.isArray(data.anomalies)) {
    const anomalies = data.anomalies.map((a) => {
      const sev = climateSeverity(a?.severity ?? a?.severityLabel ?? a?.severity_score);
      const title = `${a?.zone || 'Zone'} climate anomaly`;
      const summary = `Temp Δ ${Number(a?.tempDelta || 0).toFixed(1)}°C | Precip Δ ${Number(a?.precipDelta || 0).toFixed(1)} mm`;
      return {
        ...a,
        lat: Number(a?.location?.latitude ?? 0),
        lon: Number(a?.location?.longitude ?? 0),
        severity: sev,
        severityLabel: String(a?.severityLabel ?? a?.severity ?? sev),
        typeLabel: String(a?.type || ''),
        title,
        summary,
      };
    });
    return { ...data, anomalies };
  }

  if (name === 'wildfire_detections' && Array.isArray(data.detections)) {
    const detections = data.detections.map((d) => {
      const bright = Number(d?.brightness ?? 0);
      const sev = bright >= 380 ? 90 : bright >= 340 ? 78 : bright >= 300 ? 66 : 54;
      return {
        ...d,
        severity: sev,
        title: d?.title || `Wildfire detection (${d?.country || 'unknown'})`,
        summary: d?.summary || `Brightness ${bright.toFixed(1)}K`,
      };
    });
    return { ...data, detections };
  }

  if (name === 'conflict_acled' && Array.isArray(data.events)) {
    const events = data.events.map((e) => {
      const sev = conflictSeverityFromEvent(e?.eventType, e?.fatalities);
      return {
        ...e,
        lat: Number(e?.location?.latitude ?? 0),
        lon: Number(e?.location?.longitude ?? 0),
        severity: sev,
        title: e?.title || `${e?.eventType || 'Conflict event'}${e?.country ? ` in ${e.country}` : ''}`,
        summary:
          e?.summary ||
          `${Number(e?.fatalities || 0)} fatalities${e?.actors?.length ? ` • actors: ${e.actors.slice(0, 2).join(' / ')}` : ''}`,
      };
    });
    return { ...data, events };
  }

  if (name === 'unrest_events' && Array.isArray(data.events)) {
    const events = data.events.map((e) => {
      const sev = unrestSeverityFromEnum(e?.severity);
      return {
        ...e,
        lat: Number(e?.location?.latitude ?? 0),
        lon: Number(e?.location?.longitude ?? 0),
        severity: sev,
        title: e?.title || `${e?.eventType || 'Unrest'}${e?.city ? ` • ${e.city}` : ''}`,
        summary:
          e?.summary ||
          `${e?.country || ''}${e?.fatalities ? ` • fatalities ${e.fatalities}` : ''}${e?.sourceType ? ` • ${String(e.sourceType).replace('UNREST_SOURCE_TYPE_', '')}` : ''}`.trim(),
      };
    });
    return { ...data, events };
  }

  if (name === 'maritime_warnings' && Array.isArray(data.warnings)) {
    const warnings = data.warnings.map((w) => {
      const txt = String(w?.text || '');
      const lower = txt.toLowerCase();
      const sev =
        lower.includes('missile') || lower.includes('naval exercise') || lower.includes('mine') || lower.includes('hostilities')
          ? 84
          : lower.includes('danger') || lower.includes('drifting') || lower.includes('firing')
            ? 72
            : 60;
      return {
        ...w,
        severity: sev,
        title: w?.title || `Navigational warning${w?.area ? ` • ${w.area}` : ''}`,
        summary: txt ? txt.slice(0, 220) : `Authority: ${w?.authority || 'NGA'}`,
      };
    });
    return { ...data, warnings };
  }

  if (name === 'maritime_snapshot' && data.snapshot && typeof data.snapshot === 'object') {
    const disruptions = Array.isArray(data.snapshot.disruptions)
      ? data.snapshot.disruptions.map((d) => {
          const sev = maritimeSeverityFromEnum(d?.severity);
          return {
            ...d,
            lat: Number(d?.location?.latitude ?? 0),
            lon: Number(d?.location?.longitude ?? 0),
            severity: sev,
            title: d?.name || 'AIS disruption',
            summary:
              d?.description ||
              `${String(d?.type || '').replace('AIS_DISRUPTION_TYPE_', '').toLowerCase()} • vessels ${Number(d?.vesselCount || 0)} • dark ${Number(d?.darkShips || 0)}`,
          };
        })
      : [];
    const densityZones = Array.isArray(data.snapshot.densityZones)
      ? data.snapshot.densityZones.map((z) => {
          const intensity = Number(z?.intensity ?? 0);
          const sev = intensity >= 85 ? 80 : intensity >= 65 ? 72 : intensity >= 45 ? 64 : 56;
          return {
            ...z,
            lat: Number(z?.location?.latitude ?? 0),
            lon: Number(z?.location?.longitude ?? 0),
            severity: sev,
            title: z?.name || 'AIS density zone',
            summary: `intensity ${intensity} • ships/day ${Number(z?.shipsPerDay || 0)} • delta ${Number(z?.deltaPct || 0)}%`,
          };
        })
      : [];
    return { ...data, snapshot: { ...data.snapshot, disruptions, densityZones } };
  }

  return data;
}

const MODULES = {
  geocode_place: {
    description: 'Geocode a place name to coordinates (Nominatim)',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/geocode', {
      query: params.query ?? params.q ?? '',
      limit: params.limit ?? 3,
    }),
  },
  satellite_snapshot: {
    description: 'Generate satellite snapshot URL (ArcGIS default)',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/satellite-snapshot', {
      source: params.source ?? 'arcgis',
      west: params.west ?? params.bbox?.west,
      south: params.south ?? params.bbox?.south,
      east: params.east ?? params.bbox?.east,
      north: params.north ?? params.bbox?.north,
      lat: params.lat ?? params.center?.lat,
      lon: params.lon ?? params.center?.lon,
      radius_km: params.radius_km ?? params.center?.radius_km,
      width: params.width ?? 1024,
      height: params.height ?? 1024,
    }),
  },
  predictions: {
    description: 'Polymarket open prediction markets (gamma via sebuf)',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/prediction/v1/list-prediction-markets', {
      page_size: params.page_size ?? 50,
      cursor: params.cursor ?? '',
      category: params.category ?? '',
      query: params.query ?? '',
    }),
  },
  polymarket_intel: {
    description: 'Polymarket live trades + insider signals',
    run: async (ctx, params) => {
      const tradeLimit = Number(params.limit ?? 500);
      const marketPageSize = Math.max(50, Math.min(Number(params.market_page_size ?? 200), 500));
      const marketLimit = Math.max(marketPageSize, Math.min(Number(params.market_limit ?? 1200), 5000));

      const trades = await fetchJson(ctx.origin, '/api/polymarket-intel', {
        source: 'data',
        path: '/trades',
        limit: tradeLimit,
      });

      const markets = [];
      let offset = 0;
      while (markets.length < marketLimit) {
        const batch = await fetchJson(ctx.origin, '/api/polymarket-intel', {
          source: 'gamma',
          path: '/markets',
          active: 'true',
          closed: 'false',
          limit: marketPageSize,
          offset,
        });
        const arr = Array.isArray(batch) ? batch : [];
        if (!arr.length) break;
        markets.push(...arr);
        if (arr.length < marketPageSize) break;
        offset += marketPageSize;
      }

      const byCond = new Map();
      const byId = new Map();
      const bySlug = new Map();
      const byQuestion = new Map();
      for (const market of markets) {
        const conditionId = normalizeKey(market?.conditionId || market?.condition_id);
        const marketId = normalizeKey(market?.id || market?.marketId || market?.market_id);
        const slug = normalizeKey(market?.slug || market?.eventSlug || market?.questionID || market?.marketSlug);
        const question = normalizeKey(market?.question || market?.title || market?.marketQuestion);
        if (conditionId) byCond.set(conditionId, market);
        if (marketId) byId.set(marketId, market);
        if (slug) bySlug.set(slug, market);
        if (question) byQuestion.set(question, market);
      }

      const enrichedTrades = (Array.isArray(trades) ? trades : []).map((t) => {
        const market = byCond.get(normalizeKey(t?.conditionId || t?.condition_id))
          || byId.get(normalizeKey(t?.market || t?.marketId || t?.market_id))
          || bySlug.get(normalizeKey(t?.eventSlug || t?.slug || t?.marketSlug))
          || byQuestion.get(normalizeKey(t?.title || t?.question));
        const liquidity = toFiniteNumber(
          t?.marketLiquidity
          ?? t?.liquidity
          ?? market?.liquidityNum
          ?? market?.liquidityClob
          ?? market?.liquidity
          ?? market?.volumeNum
          ?? 0,
        );
        const size = toFiniteNumber(t?.size ?? t?.amount);
        const price = toFiniteNumber(t?.price ?? t?.avgPrice);
        const notional = price > 0 ? size * price : size;
        const liquidityImpactPct = liquidity > 0 ? (notional / liquidity) * 100 : null;
        return {
          ...t,
          marketLiquidity: liquidity || null,
          tradeNotional: Number.isFinite(notional) ? notional : null,
          liquidityImpactPct,
          liquidityImpactBps: liquidityImpactPct == null ? null : liquidityImpactPct * 100,
        };
      });

      const clusters = computeClusters(enrichedTrades);
      const wallets = computeWallets(enrichedTrades);
      return { markets, trades: enrichedTrades, clusters, wallets };
    },
  },
  geo_filters: {
    description: 'OSM geolocation filters (roundabouts, traffic signs, etc.)',
    run: async (_ctx, params) => {
      const bbox = normalizeBbox(params);
      const filters = Array.isArray(params.filters) && params.filters.length ? params.filters : ['roundabout', 'traffic_signals', 'stop_sign'];
      const maxPerType = Number(params.max_per_type ?? 500);
      return fetchOverpass(bbox, filters, maxPerType);
    },
  },
  intelligence_findings: {
    description: 'Aggregated intelligence findings from multiple modules (alerts + signals)',
    run: async (ctx, params) => {
      const findings = [];
      const now = Date.now();

      const modulesToPull = params.modules || [
        'conflict_acled',
        'unrest_events',
        'infrastructure_outages',
        'maritime_warnings',
        'cyber_threats',
        'seismology_earthquakes',
        'intelligence_risk_scores',
      ];

      const results = {};
      const settled = await Promise.allSettled(
        modulesToPull.map(async (name) => {
          const mod = MODULES[name];
          if (!mod) return { name, data: null };
          const data = await mod.run(ctx, params[name] || {});
          return { name, data };
        })
      );
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value.data !== null) {
          results[s.value.name] = s.value.data;
        } else if (s.status === 'rejected') {
          // Promise.allSettled preserves order — use index to recover module name
          const idx = settled.indexOf(s);
          results[modulesToPull[idx]] = { error: s.reason?.message || String(s.reason) };
        }
      }

      const conflictEvents = results.conflict_acled?.events || [];
      if (conflictEvents.length > 0) {
        findings.push({
          id: `conflict-${now}`,
          type: 'conflict_acled',
          title: 'Conflict activity detected',
          summary: `${conflictEvents.length} conflict events in ACLED feed`,
          priority: 'high',
          confidence: 0.8,
          timestamp: now,
          source: 'conflict_acled',
        });
      }

      const unrestEvents = results.unrest_events?.events || [];
      if (unrestEvents.length > 0) {
        findings.push({
          id: `unrest-${now}`,
          type: 'unrest_events',
          title: 'Unrest activity detected',
          summary: `${unrestEvents.length} unrest events in feed`,
          priority: 'medium',
          confidence: 0.7,
          timestamp: now,
          source: 'unrest_events',
        });
      }

      const outages = results.infrastructure_outages?.outages || [];
      if (outages.length > 0) {
        findings.push({
          id: `outage-${now}`,
          type: 'infrastructure_outages',
          title: 'Internet outage detected',
          summary: `${outages.length} outage(s) reported`,
          priority: 'high',
          confidence: 0.8,
          timestamp: now,
          source: 'infrastructure_outages',
        });
      }

      const warnings = results.maritime_warnings?.warnings || [];
      if (warnings.length > 0) {
        findings.push({
          id: `maritime-${now}`,
          type: 'maritime_warnings',
          title: 'Navigational warning issued',
          summary: `${warnings.length} maritime warning(s)`,
          priority: 'medium',
          confidence: 0.7,
          timestamp: now,
          source: 'maritime_warnings',
        });
      }

      const threats = results.cyber_threats?.threats || [];
      for (const threat of threats) {
        findings.push({
          id: `cyber-${threat.id || threat.indicator || now}`,
          type: 'cyber_threat',
          title: `Cyber IOC: ${threat.indicator || threat.id || 'indicator'}`,
          summary: `${threat.malwareFamily || 'IOC'} severity ${threat.severity || 'unknown'}`,
          priority: severityToPriority(threat.severity),
          confidence: 0.75,
          timestamp: now,
          source: 'cyber_threats',
          payload: threat,
        });
      }

      const quakes = results.seismology_earthquakes?.earthquakes || [];
      for (const quake of quakes) {
        const mag = Number(quake.magnitude || 0);
        if (mag < 5.5) continue;
        const priority = mag >= 7 ? 'critical' : mag >= 6 ? 'high' : 'medium';
        findings.push({
          id: `quake-${quake.id || now}`,
          type: 'seismic',
          title: `Earthquake M${mag.toFixed(1)}`,
          summary: `${quake.place || 'Unknown'} depth ${Number(quake.depthKm || 0).toFixed(1)} km`,
          priority,
          confidence: 0.9,
          timestamp: quake.occurredAt || now,
          source: 'seismology_earthquakes',
          payload: quake,
        });
      }

      const riskScores = results.intelligence_risk_scores?.strategicRisks || [];
      for (const risk of riskScores) {
        const score = Number(risk.score || 0);
        if (score < 60) continue;
        const priority = score >= 75 ? 'high' : 'medium';
        findings.push({
          id: `risk-${risk.region || now}`,
          type: 'strategic_risk',
          title: `Strategic risk: ${risk.region || 'unknown'}`,
          summary: `score ${score} trend ${risk.trend || 'unknown'}`,
          priority,
          confidence: 0.7,
          timestamp: now,
          source: 'intelligence_risk_scores',
          payload: risk,
        });
      }

      return {
        findings,
        summary: buildFindingsSummary(findings),
        sources: Object.keys(results),
      };
    },
  },
  seismology_earthquakes: {
    description: 'USGS earthquakes',
    run: (ctx) => fetchJson(ctx.origin, '/api/seismology/v1/list-earthquakes', {}),
  },
  wildfire_detections: {
    description: 'NASA FIRMS fire detections',
    run: (ctx) => fetchJson(ctx.origin, '/api/wildfire/v1/list-fire-detections', {}),
  },
  climate_anomalies: {
    description: 'Climate anomalies',
    run: (ctx) => fetchJson(ctx.origin, '/api/climate/v1/list-climate-anomalies', {}),
  },
  unrest_events: {
    description: 'Protests and unrest (ACLED/GDELT)',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/unrest/v1/list-unrest-events', {
      min_confidence: params.min_confidence ?? 0,
      limit: params.limit ?? 500,
    }),
  },
  conflict_acled: {
    description: 'ACLED conflict events',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/conflict/v1/list-acled-events', {
      limit: params.limit ?? 500,
      from_date: params.from_date ?? '',
      to_date: params.to_date ?? '',
    }),
  },
  conflict_ucdp_events: {
    description: 'UCDP GED conflict events',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/conflict/v1/list-ucdp-events', {
      page_size: params.page_size ?? 1000,
      page: params.page ?? 1,
    }),
  },
  conflict_hapi: {
    description: 'HDX HAPI humanitarian conflict summary',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/conflict/v1/get-humanitarian-summary', {
      country: params.country ?? '',
      limit: params.limit ?? 200,
    }),
  },
  displacement_summary: {
    description: 'UNHCR displacement summary',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/displacement/v1/get-displacement-summary', {
      country: params.country ?? '',
    }),
  },
  population_exposure: {
    description: 'WorldPop exposure estimates',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/displacement/v1/get-population-exposure', {
      country: params.country ?? '',
    }),
  },
  maritime_warnings: {
    description: 'Navigational warnings',
    run: (ctx) => fetchJson(ctx.origin, '/api/maritime/v1/list-navigational-warnings', {}),
  },
  maritime_snapshot: {
    description: 'AIS vessel snapshot and disruptions',
    run: (ctx) => fetchJson(ctx.origin, '/api/maritime/v1/get-vessel-snapshot', {}),
  },
  military_flights: {
    description: 'Military flights (OpenSky/relay)',
    run: (ctx, params) => {
      const bbox = normalizeBbox(params);
      return fetchJson(ctx.origin, '/api/military/v1/list-military-flights', {
        sw_lat: bbox.south,
        sw_lon: bbox.west,
        ne_lat: bbox.north,
        ne_lon: bbox.east,
        operator: params.operator ?? '',
        aircraft_type: params.aircraft_type ?? '',
        page_size: params.page_size ?? 1000,
      });
    },
  },
  military_posture: {
    description: 'Theater posture summary',
    run: (ctx) => fetchJson(ctx.origin, '/api/military/v1/get-theater-posture', {}),
  },
  military_usni: {
    description: 'USNI Fleet report',
    run: (ctx) => fetchJson(ctx.origin, '/api/military/v1/get-usni-fleet-report', {}),
  },
  infrastructure_outages: {
    description: 'Internet outages',
    run: (ctx) => fetchJson(ctx.origin, '/api/infrastructure/v1/list-internet-outages', {}),
  },
  infrastructure_cable_health: {
    description: 'Undersea cable health',
    run: (ctx) => fetchJson(ctx.origin, '/api/infrastructure/v1/get-cable-health', {}),
  },
  infrastructure_baseline: {
    description: 'Infrastructure temporal baseline',
    run: (ctx) => fetchJson(ctx.origin, '/api/infrastructure/v1/get-temporal-baseline', {}),
  },
  infrastructure_services: {
    description: 'Service status checks',
    run: (ctx) => fetchJson(ctx.origin, '/api/infrastructure/v1/list-service-statuses', {}),
  },
  cyber_threats: {
    description: 'Cyber threat IOCs',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/cyber/v1/list-cyber-threats', {
      limit: params.limit ?? 200,
    }),
  },
  markets: {
    description: 'Market quotes',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/market/v1/list-market-quotes', {
      symbols: params.symbols ?? '',
    }),
  },
  markets_crypto: {
    description: 'Crypto quotes',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/market/v1/list-crypto-quotes', {
      ids: params.ids ?? '',
    }),
  },
  markets_commodities: {
    description: 'Commodity quotes',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/market/v1/list-commodity-quotes', {
      symbols: params.symbols ?? '',
    }),
  },
  markets_stablecoins: {
    description: 'Stablecoin market data',
    run: (ctx) => fetchJson(ctx.origin, '/api/market/v1/list-stablecoin-markets', {}),
  },
  markets_etf_flows: {
    description: 'ETF flows',
    run: (ctx) => fetchJson(ctx.origin, '/api/market/v1/list-etf-flows', {}),
  },
  economic_macro: {
    description: 'Macro signals',
    run: (ctx) => fetchJson(ctx.origin, '/api/economic/v1/get-macro-signals', {}),
  },
  economic_energy: {
    description: 'Energy prices',
    run: (ctx) => fetchJson(ctx.origin, '/api/economic/v1/get-energy-prices', {}),
  },
  economic_bis_rates: {
    description: 'BIS policy rates',
    run: (ctx) => fetchJson(ctx.origin, '/api/economic/v1/get-bis-policy-rates', {}),
  },
  economic_bis_fx: {
    description: 'BIS exchange rates',
    run: (ctx) => fetchJson(ctx.origin, '/api/economic/v1/get-bis-exchange-rates', {}),
  },
  economic_bis_credit: {
    description: 'BIS credit indicators',
    run: (ctx) => fetchJson(ctx.origin, '/api/economic/v1/get-bis-credit', {}),
  },
  trade_restrictions: {
    description: 'Trade restrictions',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/trade/v1/get-trade-restrictions', {
      countries: params.countries ?? '',
      limit: params.limit ?? 200,
    }),
  },
  trade_tariffs: {
    description: 'Tariff trends',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/trade/v1/get-tariff-trends', {
      reporting_country: params.reporting_country ?? '',
      partner_country: params.partner_country ?? '',
      product_sector: params.product_sector ?? '',
      years: params.years ?? '',
    }),
  },
  trade_flows: {
    description: 'Trade flows',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/trade/v1/get-trade-flows', {
      reporting_country: params.reporting_country ?? '',
      partner_country: params.partner_country ?? '',
      years: params.years ?? '',
    }),
  },
  trade_barriers: {
    description: 'Trade barriers',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/trade/v1/get-trade-barriers', {
      reporting_country: params.reporting_country ?? '',
      partner_country: params.partner_country ?? '',
      years: params.years ?? '',
    }),
  },
  supply_chain_shipping: {
    description: 'Shipping rates',
    run: (ctx) => fetchJson(ctx.origin, '/api/supply-chain/v1/get-shipping-rates', {}),
  },
  supply_chain_chokepoints: {
    description: 'Chokepoint status',
    run: (ctx) => fetchJson(ctx.origin, '/api/supply-chain/v1/get-chokepoint-status', {}),
  },
  supply_chain_critical_minerals: {
    description: 'Critical minerals',
    run: (ctx) => fetchJson(ctx.origin, '/api/supply-chain/v1/get-critical-minerals', {}),
  },
  positive_events: {
    description: 'Positive geo events',
    run: (ctx) => fetchJson(ctx.origin, '/api/positive-events/v1/list-positive-geo-events', {}),
  },
  giving_summary: {
    description: 'Giving summary',
    run: (ctx) => fetchJson(ctx.origin, '/api/giving/v1/get-giving-summary', {}),
  },
  research_tech_events: {
    description: 'Tech events',
    run: (ctx) => fetchJson(ctx.origin, '/api/research/v1/list-tech-events', {}),
  },
  research_arxiv: {
    description: 'Arxiv papers',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/research/v1/list-arxiv-papers', {
      query: params.query ?? '',
      limit: params.limit ?? 50,
    }),
  },
  research_trending_repos: {
    description: 'Trending repos',
    run: (ctx) => fetchJson(ctx.origin, '/api/research/v1/list-trending-repos', {}),
  },
  research_hackernews: {
    description: 'Hacker News',
    run: (ctx) => fetchJson(ctx.origin, '/api/research/v1/list-hackernews-items', {}),
  },
  intelligence_risk_scores: {
    description: 'Risk scores',
    run: (ctx) => fetchJson(ctx.origin, '/api/intelligence/v1/get-risk-scores', {}),
  },
  intelligence_pizzint: {
    description: 'PizzINT status',
    run: (ctx) => fetchJson(ctx.origin, '/api/intelligence/v1/get-pizzint-status', {}),
  },
  intelligence_gdelt: {
    description: 'GDELT document search',
    run: (ctx, params) => fetchJson(ctx.origin, '/api/intelligence/v1/search-gdelt-documents', {
      query: params.query ?? 'conflict OR protest',
      max_records: params.max_records ?? params.maxrecords ?? 50,
      timespan: params.timespan ?? '',
      sort: params.sort ?? 'date',
      tone_filter: params.tone_filter ?? '',
    }),
  },
  financial_fred_macro: {
    description: 'FRED macro series (latest + timeseries)',
    run: (_ctx, params) => fetchFredSeries({
      seriesId: params.series_id ?? params.seriesId ?? 'UNRATE',
      limit: params.limit ?? 120,
      apiKey: params.api_key ?? params.apikey ?? '',
    }),
  },
  macro_worldbank_indicator: {
    description: 'World Bank indicator data by country',
    run: (_ctx, params) => fetchWorldBankIndicator({
      indicator: params.indicator ?? 'NY.GDP.MKTP.CD',
      countries: params.countries ?? params.country ?? 'US',
      startYear: params.start_year ?? '',
      endYear: params.end_year ?? '',
      perPage: params.per_page ?? 200,
    }),
  },
  macro_imf_series: {
    description: 'IMF DataMapper macro series (country latest values)',
    run: (_ctx, params) => fetchImfDatamapper({
      series: params.series ?? 'NGDP_RPCH',
      countries: params.countries ?? '',
      limit: params.limit ?? 200,
    }),
  },
  macro_oecd_dataset: {
    description: 'OECD SDMX dataset fetch (best-effort)',
    run: (_ctx, params) => fetchOecdDataset({
      dataset: params.dataset ?? 'DP_LIVE',
      query: params.query ?? '.GDP...A',
      format: params.format_type ?? 'json',
    }),
  },
  filings_sec_company: {
    description: 'SEC EDGAR company recent filings by ticker',
    run: (_ctx, params) => fetchSecFilings({
      ticker: params.ticker ?? 'AAPL',
      limit: params.limit ?? 20,
    }),
  },
  financial_fmp_quote: {
    description: 'FMP stable quote by symbol',
    run: (_ctx, params) => fetchFmp('quote', {
      symbol: params.symbol ?? 'AAPL',
      apikey: params.apikey ?? params.api_key ?? '',
    }),
  },
  financial_fmp_profile: {
    description: 'FMP stable company profile',
    run: (_ctx, params) => fetchFmp('profile', {
      symbol: params.symbol ?? 'AAPL',
      apikey: params.apikey ?? params.api_key ?? '',
    }),
  },
  financial_fmp_ratios_ttm: {
    description: 'FMP stable TTM ratios',
    run: (_ctx, params) => fetchFmp('ratios-ttm', {
      symbol: params.symbol ?? 'AAPL',
      apikey: params.apikey ?? params.api_key ?? '',
    }),
  },
  financial_fmp_analyst_estimates: {
    description: 'FMP stable analyst estimates',
    run: (_ctx, params) => fetchFmp('analyst-estimates', {
      symbol: params.symbol ?? 'AAPL',
      period: params.period ?? 'annual',
      apikey: params.apikey ?? params.api_key ?? '',
    }),
  },
  news_rss: {
    description: 'RSS news feeds (parsed server-side)',
    run: async (ctx, params) => {
      const urlsParam = params.urls || params.url || '';
      const urls = Array.isArray(urlsParam)
        ? urlsParam
        : String(urlsParam)
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean);
      const limitPerFeed = Number(params.limit_per_feed ?? 20);
      const maxTotal = Number(params.max_total ?? 200);

      const defaultFeeds = [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.cnn.com/rss/edition_world.rss',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://www.theguardian.com/world/rss',
        'https://www.ft.com/world?format=rss',
        'https://www.defenseone.com/rss/all/',
        'https://breakingdefense.com/feed/',
        'https://news.usni.org/feed',
        'https://www.state.gov/feed/',
        'https://www.defense.gov/News/News-Stories/RSS/',
        'https://feeds.reuters.com/reuters/worldNews',
        'https://feeds.reuters.com/reuters/topNews',
        'https://news.google.com/rss/search?q=site:reuters.com%20when:24h&hl=en-US&gl=US&ceid=US:en',
        'https://news.google.com/rss/search?q=site:apnews.com%20when:24h&hl=en-US&gl=US&ceid=US:en',
        'https://news.google.com/rss/search?q=site:afp.com%20when:24h&hl=en-US&gl=US&ceid=US:en',
      ];

      const feedList = urls.length ? urls : defaultFeeds;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      // Fetch all feeds in parallel (change 8)
      const feedPromises = feedList.map(async (feedUrl) => {
        try {
          const proxied = `${ctx.origin}/api/rss-proxy?url=${encodeURIComponent(feedUrl)}`;
          const resp = await fetch(proxied, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(20000) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const xml = await resp.text();
          const data = parser.parse(xml) || {};
          const channel = data.rss?.channel || data.channel;
          const channelTitle = channel?.title || data.feed?.title || '';
          const items = channel?.item || data.feed?.entry || [];
          const list = Array.isArray(items) ? items : [items].filter(Boolean);
          return list.slice(0, limitPerFeed).map((item) => ({
            title: item.title || '',
            link: item.link?.['@_href'] || item.link?.href || item.link || item.guid || '',
            pubDate: item.pubDate || item.published || item.updated || '',
            source: channelTitle || item.source || '',
            feed: feedUrl,
          }));
        } catch (error) {
          return [{
            title: '',
            link: '',
            pubDate: '',
            source: '',
            feed: feedUrl,
            error: error?.message || String(error),
          }];
        }
      });

      const settled = await Promise.allSettled(feedPromises);
      const results = [];
      for (const s of settled) {
        const items = s.status === 'fulfilled' ? s.value : [];
        for (const item of items) {
          results.push(item);
          if (results.length >= maxTotal) break;
        }
        if (results.length >= maxTotal) break;
      }
      return { items: results, feedCount: feedList.length };
    },
  },
  news_telegram: {
    description: 'Telegram OSINT feed (relay)',
    run: async (ctx, params) => {
      const qs = buildQuery({
        limit: params.limit ?? 50,
        topic: params.topic ?? '',
        channel: params.channel ?? '',
      });
      const url = `${ctx.origin}/api/telegram-feed${qs ? `?${qs}` : ''}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
      }
      const parsed = parseJsonLenient(text);
      if (!parsed) throw new Error('Empty Telegram response');
      return parsed;
    },
  },
  aviation_delays: {
    description: 'Airport delays',
    run: (ctx) => fetchJson(ctx.origin, '/api/aviation/v1/list-airport-delays', {}),
  },
  intelligence_report: {
    description: 'Comprehensive intelligence report for a region/topic with keyword filtering',
    run: async (ctx, params) => {
      const query = params.query ?? params.q ?? '';
      const keywords = (params.keywords ?? query).split(',').map(k => k.trim()).filter(Boolean);
      if (!query && keywords.length === 0) {
        return { error: 'Required: query (region or topic) or keywords (comma-separated)' };
      }

      const reportModules = [
        'news_rss', 'intelligence_risk_scores', 'conflict_acled', 'unrest_events',
        'supply_chain_chokepoints', 'maritime_warnings', 'maritime_snapshot',
        'military_posture', 'military_usni', 'cyber_threats', 'aviation_delays',
        'economic_macro', 'infrastructure_outages', 'infrastructure_services',
      ];

      const filterFn = (item) => {
        if (keywords.length === 0) return true;
        const text = JSON.stringify(item).toLowerCase();
        return keywords.some(k => text.includes(k.toLowerCase()));
      };

      const results = {};
      const errors = [];
      const startTime = Date.now();

      const settled = await Promise.allSettled(
        reportModules.map(async (name) => {
          const mod = MODULES[name];
          if (!mod) return { name, result: { error: 'Unknown module' } };
          try {
            const rawData = await mod.run(ctx, params);
            return { name, result: rawData };
          } catch (err) {
            return { name, result: { error: err.message || String(err) } };
          }
        })
      );

      for (const s of settled) {
        const { name, result } = s.status === 'fulfilled' ? s.value : { name: 'unknown', result: { error: s.reason?.message } };
        if (result.error) {
          errors.push({ module: name, error: result.error });
          continue;
        }

        const data = result.data || result;
        const filtered = {};

        // Filter arrays by keyword
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            const matched = value.filter(filterFn);
            if (matched.length > 0) filtered[key] = matched;
          } else if (typeof value === 'object' && value !== null && filterFn(value)) {
            filtered[key] = value;
          } else if (typeof value !== 'object') {
            filtered[key] = value;
          }
        }

        if (Object.keys(filtered).length > 0) {
          const modDef = MODULES[name];
          results[name] = { data: filtered, description: result.description || (modDef && modDef.description) || name };
        }
      }

      // Also include unfiltered summary modules (risk scores, chokepoints always relevant)
      for (const s of settled) {
        if (s.status !== 'fulfilled') continue;
        const { name, result } = s.value;
        if (result.error) continue;
        if (['intelligence_risk_scores', 'supply_chain_chokepoints', 'economic_macro'].includes(name) && !results[name]) {
          results[name] = { data: result.data || result, description: result.description || '' };
        }
      }

      return {
        query,
        keywords,
        durationMs: Date.now() - startTime,
        modulesQueried: reportModules.length,
        modulesWithResults: Object.keys(results).length,
        errors: errors.length > 0 ? errors : undefined,
        report: results,
      };
    },
  },
};

const CORE_MODULES = [
  'seismology_earthquakes', 'conflict_acled', 'unrest_events',
  'cyber_threats', 'infrastructure_outages', 'maritime_warnings',
  'news_rss', 'intelligence_risk_scores',
];

const FAST_MODULES = [
  'conflict_acled',
  'unrest_events',
  'maritime_snapshot',
  'infrastructure_outages',
  'seismology_earthquakes',
  'wildfire_detections',
  'military_usni',
];

// Lazy in-memory cache (per Cloud Run instance):
// - fetched on demand
// - reused until TTL expires
// - no background refresh
const MODULE_CACHE = new Map();
const DEFAULT_CACHE_TTL_MS = Math.max(0, Number(process.env.HEADLESS_CACHE_TTL_MS || 300000));
const MAX_CACHE_SIZE = Math.max(1, Number(process.env.HEADLESS_MAX_CACHE_SIZE || 500));

function makeCacheKey(moduleName, moduleParams) {
  return `${moduleName}::${JSON.stringify(moduleParams || {})}`;
}

function getCachedModule(moduleName, moduleParams, ttlMs) {
  const key = makeCacheKey(moduleName, moduleParams);
  const item = MODULE_CACHE.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > ttlMs) {
    MODULE_CACHE.delete(key);
    return null;
  }
  return item.data;
}

function setCachedModule(moduleName, moduleParams, data) {
  const key = makeCacheKey(moduleName, moduleParams);
  if (MODULE_CACHE.size >= MAX_CACHE_SIZE) {
    const oldest = MODULE_CACHE.keys().next().value;
    MODULE_CACHE.delete(oldest);
  }
  MODULE_CACHE.set(key, { ts: Date.now(), data });
}

function summarizeModule(name, data) {
  const lines = [`## ${name}`];
  if (data == null) {
    lines.push('- No data');
    return lines.join('\n');
  }
  if (Array.isArray(data)) {
    lines.push(`- Count: ${data.length}`);
    if (data[0]) lines.push(`- Sample: \`${JSON.stringify(data[0]).slice(0, 200)}...\``);
    return lines.join('\n');
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    lines.push(`- Keys: ${keys.join(', ')}`);
    for (const key of keys) {
      const value = data[key];
      if (Array.isArray(value)) {
        lines.push(`- ${key}: ${value.length}`);
      }
    }
    return lines.join('\n');
  }
  lines.push(`- Value: ${String(data).slice(0, 200)}`);
  return lines.join('\n');
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Optional bearer token auth (change 6)
  const HEADLESS_API_KEY = process.env.HEADLESS_API_KEY;
  if (HEADLESS_API_KEY) {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== HEADLESS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const format = (url.searchParams.get('format') || 'both').toLowerCase();
  const moduleParam = url.searchParams.get('module') || '';
  const modulesParam = url.searchParams.get('modules') || '';
  const modeParam = (url.searchParams.get('mode') || '').toLowerCase();
  const params = parseJsonParam(url.searchParams.get('params'), {});
  const ctx = { origin };

  let moduleList = [];
  if (moduleParam === 'list') {
    return new Response(JSON.stringify({
      requestedAt: new Date().toISOString(),
      modules: Object.entries(MODULES).map(([name, mod]) => ({
        name,
        description: mod.description,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (moduleParam && moduleParam !== 'all') {
    moduleList = [moduleParam];
  } else if (modulesParam) {
    moduleList = modulesParam.split(',').map((m) => m.trim()).filter(Boolean);
  } else if (modeParam === 'all' || moduleParam === 'all') {
    moduleList = Object.keys(MODULES);
  } else if (modeParam === 'fast') {
    moduleList = FAST_MODULES;
  } else {
    moduleList = CORE_MODULES || Object.keys(MODULES);
  }

  const results = {};
  const markdownChunks = [];

  // Request-level timeout (safety net — individual modules have their own shorter timeouts)
  const HEADLESS_REQUEST_TIMEOUT = Number(process.env.HEADLESS_REQUEST_TIMEOUT || 120000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEADLESS_REQUEST_TIMEOUT);

  try {
    // Run all modules in parallel via Promise.allSettled
    const promises = moduleList.map(async (name) => {
      const mod = MODULES[name];
      if (!mod) return { name, record: { error: 'Unknown module' } };

      // Param isolation: use module-keyed params if available, fall back to
      // top-level params for single-module queries (allows direct params passthrough)
      const moduleParams = (typeof params[name] === 'object' && params[name] !== null)
        ? params[name]
        : (moduleList.length === 1 ? params : {});
      const requestedTtl = Number(moduleParams.cache_ttl_ms ?? params.cache_ttl_ms ?? DEFAULT_CACHE_TTL_MS);
      const ttlMs = Number.isFinite(requestedTtl) ? Math.max(0, requestedTtl) : DEFAULT_CACHE_TTL_MS;

      if (ttlMs > 0) {
        const cachedRecord = getCachedModule(name, moduleParams, ttlMs);
        if (cachedRecord) {
          return {
            name,
            record: {
              ...cachedRecord,
              cached: true,
              cacheTtlMs: ttlMs,
              _meta: {
                cachedAt: cachedRecord._meta?.fetchedAt || null,
                fetchedAt: new Date().toISOString(),
                durationMs: 0,
                fromCache: true,
              },
            },
          };
        }
      }

      if (controller.signal.aborted) {
        return { name, record: { error: 'Request timeout' } };
      }

      const started = Date.now();
      const rawData = await mod.run(ctx, moduleParams);
      const data = normalizeModuleData(name, rawData);
      const durationMs = Date.now() - started;
      const fetchedAt = new Date().toISOString();
      const record = {
        data, durationMs, description: mod.description, cached: false, cacheTtlMs: ttlMs,
        _meta: { cachedAt: null, fetchedAt, durationMs, fromCache: false },
      };
      if (format === 'md' || format === 'both') {
        record.markdown = summarizeModule(name, data);
      }
      if (ttlMs > 0) {
        setCachedModule(name, moduleParams, record);
      }
      return { name, record };
    });

    const settled = await Promise.allSettled(promises);
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { name, record } = s.value;
        results[name] = record;
        if ((format === 'md' || format === 'both') && record.markdown) {
          markdownChunks.push(record.markdown);
        }
      } else {
        // Rejected promise — extract name from reason if possible
        const errMsg = s.reason?.message || String(s.reason);
        // Can't reliably get module name from rejection, but allSettled preserves order
        const idx = settled.indexOf(s);
        const name = moduleList[idx];
        results[name] = { error: errMsg };
      }
    }
  } finally {
    clearTimeout(timer);
  }

  const responseBody = {
    requestedAt: new Date().toISOString(),
    modules: results,
    markdown: format === 'md' || format === 'both' ? markdownChunks.join('\n\n') : undefined,
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
