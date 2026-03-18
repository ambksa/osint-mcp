/**
 * IODA Internet Outages — Georgia Tech Internet Outage Detection & Analysis
 * No auth required. BGP + Active Probing + Darknet signals per country.
 */

export const name = 'ioda_outages';
export const description = 'IODA internet outage detection (Georgia Tech) — BGP, active probing, and darknet signals per country. Better than Shadowserver. Query by country code. No auth.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim().toUpperCase();
  const hours = Number(params.hours || 24);
  const limit = Number(params.limit || 20);

  const until = Math.floor(Date.now() / 1000);
  const from = until - hours * 3600;

  // If specific country requested, get detailed signals
  if (query && /^[A-Z]{2}$/.test(query)) {
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/${query}?from=${from}&until=${until}`;
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`IODA HTTP ${resp.status}`);
    const data = await resp.json();
    const signals = data?.data || [];

    // Parse signal types
    const byType = {};
    for (const s of signals) {
      const src = s.datasource || 'unknown';
      if (!byType[src]) byType[src] = [];
      byType[src].push({
        timestamp: s.from || s.timestamp,
        value: s.value ?? s.score ?? null,
      });
    }

    return {
      country: query,
      period: { from: new Date(from * 1000).toISOString(), until: new Date(until * 1000).toISOString(), hours },
      signals: byType,
      signalTypes: Object.keys(byType),
      source: 'IODA (Georgia Tech)',
    };
  }

  // Otherwise get recent alerts/outages across all countries
  const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts?from=${from}&until=${until}&limit=${limit}`;
  let alerts = [];
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok) {
      const data = await resp.json();
      alerts = (data?.data || data?.results || []).slice(0, limit).map((a) => ({
        entity: a.entity?.name || a.entity?.code || '',
        entityType: a.entity?.type || '',
        level: a.level || '',
        condition: a.condition || '',
        datasource: a.datasource || '',
        from: a.from ? new Date(a.from * 1000).toISOString() : '',
        until: a.until ? new Date(a.until * 1000).toISOString() : '',
        value: a.value ?? null,
      }));
    }
  } catch {
    // Alerts endpoint may not exist — try alternate approach
  }

  // If alerts endpoint didn't work, try getting top-level entity scores
  if (alerts.length === 0) {
    try {
      const resp = await fetch(`https://api.ioda.inetintel.cc.gatech.edu/v2/entities?entityType=country&limit=${limit}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const data = await resp.json();
        alerts = (data?.data || []).slice(0, limit).map((e) => ({
          entity: e.name || e.code || '',
          entityType: 'country',
          code: e.code || '',
        }));
      }
    } catch { /* best effort */ }
  }

  return {
    alerts,
    period: { from: new Date(from * 1000).toISOString(), until: new Date(until * 1000).toISOString(), hours },
    query: query || 'global',
    source: 'IODA (Georgia Tech)',
  };
}
