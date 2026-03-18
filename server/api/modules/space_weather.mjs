/**
 * NOAA Space Weather — solar flares, geomagnetic storms, radio blackouts
 * No auth required. All data from SWPC (Space Weather Prediction Center).
 */

export const name = 'space_weather';
export const description = 'NOAA space weather — solar flare probability, geomagnetic storm level (G1-G5), radio blackouts (R1-R5), solar radiation storms (S1-S5), alerts. No auth required.';

export async function run(_ctx, params) {
  const limit = Number(params.limit || 20);

  const [scalesResp, alertsResp, probResp] = await Promise.allSettled([
    fetch('https://services.swpc.noaa.gov/products/noaa-scales.json', { signal: AbortSignal.timeout(10000) }),
    fetch('https://services.swpc.noaa.gov/products/alerts.json', { signal: AbortSignal.timeout(10000) }),
    fetch('https://services.swpc.noaa.gov/json/solar_probabilities.json', { signal: AbortSignal.timeout(10000) }),
  ]);

  // Current NOAA scales (G/R/S levels)
  let currentScales = null;
  if (scalesResp.status === 'fulfilled' && scalesResp.value.ok) {
    const raw = await scalesResp.value.json();
    // noaa-scales.json has format: {"0": {"DateStamp": ..., "R": {...}, "S": {...}, "G": {...}}, "-1": {...}}
    const current = raw?.['0'] || raw?.[0] || {};
    currentScales = {
      timestamp: current.DateStamp || '',
      geomagneticStorm: {
        scale: current.G?.Scale || 'G0',
        text: current.G?.Text || 'None',
      },
      solarRadiation: {
        scale: current.S?.Scale || 'S0',
        text: current.S?.Text || 'None',
      },
      radioBlackout: {
        scale: current.R?.Scale || 'R0',
        text: current.R?.Text || 'None',
      },
    };
  }

  // Recent alerts
  let alerts = [];
  if (alertsResp.status === 'fulfilled' && alertsResp.value.ok) {
    const raw = await alertsResp.value.json();
    alerts = (Array.isArray(raw) ? raw : []).slice(0, limit).map((a) => ({
      productId: a.product_id || '',
      issueTime: a.issue_datetime || '',
      message: (a.message || '').trim().slice(0, 500),
    }));
  }

  // Solar flare probabilities
  let solarProb = null;
  if (probResp.status === 'fulfilled' && probResp.value.ok) {
    const raw = await probResp.value.json();
    const latest = Array.isArray(raw) ? raw[0] : raw;
    if (latest) {
      solarProb = {
        date: latest.date || latest.Date || '',
        cClassPercent: Number(latest.c_class || latest.C || 0),
        mClassPercent: Number(latest.m_class || latest.M || 0),
        xClassPercent: Number(latest.x_class || latest.X || 0),
        protonPercent: Number(latest.proton || latest.Proton || 0),
      };
    }
  }

  return {
    currentScales,
    solarFlareProb: solarProb,
    alerts,
    source: 'NOAA SWPC',
  };
}
