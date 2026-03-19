/**
 * IODA Internet Outages — Georgia Tech Internet Outage Detection & Analysis
 * No auth required. BGP + Active Probing + Google Traffic + Darknet per country.
 * Replaces broken Cloudflare Radar (needs API token we don't have).
 */

export const name = 'ioda_outages';
export const description = 'Internet outage detection (IODA/Georgia Tech) — BGP routing, active probing, Google traffic, darknet signals per country. Query by 2-letter country code. No auth.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim().toUpperCase();
  const hours = Number(params.hours || 24);

  if (!query || !/^[A-Z]{2}$/.test(query)) {
    throw new Error('query required: 2-letter country code (e.g. "IR", "SA", "AE", "US")');
  }

  const until = Math.floor(Date.now() / 1000);
  const from = until - hours * 3600;

  const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/${query}?from=${from}&until=${until}`;
  const resp = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`IODA HTTP ${resp.status}`);
  const raw = await resp.json();

  // IODA response: data[0] is an array of signal streams for the requested entity
  const streams = Array.isArray(raw?.data?.[0]) ? raw.data[0] : [];

  const signals = [];
  let overallStatus = 'NORMAL';
  let worstDrop = 0;

  for (const s of streams) {
    const ds = s.datasource || 'unknown';
    const sub = s.subtype || '';
    const vals = (s.values || []).filter((v) => typeof v === 'number');

    if (vals.length === 0) {
      signals.push({
        datasource: ds,
        subtype: sub,
        status: 'NO_DATA',
        latest: null,
        average: null,
        min: null,
        max: null,
        swingPercent: null,
        points: 0,
      });
      continue;
    }

    const latest = vals[vals.length - 1];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const swing = mx > 0 ? ((mx - mn) / mx) * 100 : 0;

    let status = 'NORMAL';
    if (swing > 70) { status = 'SIGNIFICANT_DROP'; }
    else if (swing > 40) { status = 'FLUCTUATING'; }
    else if (swing > 25) { status = 'MINOR_VARIATION'; }

    if (swing > worstDrop) {
      worstDrop = swing;
      if (status !== 'NORMAL') overallStatus = status;
    }

    signals.push({
      datasource: ds,
      subtype: sub,
      status,
      latest,
      average: Math.round(avg),
      min: mn,
      max: mx,
      swingPercent: Math.round(swing * 10) / 10,
      points: vals.length,
    });
  }

  // Summarize
  const bgp = signals.find((s) => s.datasource === 'bgp');
  const gtr = signals.find((s) => s.datasource === 'gtr');
  const ping = signals.find((s) => s.datasource === 'ping-slash24');

  return {
    country: query,
    entityName: streams[0]?.entityName || query,
    overallStatus,
    worstSwingPercent: Math.round(worstDrop * 10) / 10,
    signals,
    summary: {
      bgp: bgp ? { status: bgp.status, prefixes: bgp.latest, swing: bgp.swingPercent + '%' } : null,
      googleTraffic: gtr ? { status: gtr.status, latest: gtr.latest, swing: gtr.swingPercent + '%' } : null,
      activeProbing: ping ? { status: ping.status, respondingBlocks: ping.latest, swing: ping.swingPercent + '%' } : null,
    },
    period: { from: new Date(from * 1000).toISOString(), until: new Date(until * 1000).toISOString(), hours },
    source: 'IODA (Georgia Tech)',
  };
}
