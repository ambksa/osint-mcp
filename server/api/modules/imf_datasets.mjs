/**
 * IMF Datasets — IFS, DOT, BOP, FSI, CPIS, CDIS via CompactData API
 * Free, no auth. Full time-series support (annual, quarterly, monthly).
 * Based on github.com/c-cf/imf-data-mcp approach.
 */
export const name = 'imf_datasets';
export const description = 'IMF economic datasets via CompactData API — IFS (financial stats), DOT (trade), BOP (balance of payments), FSI (financial soundness), CPIS (portfolio investment), CDIS (FDI). Query: dataset.country.indicator (e.g. "IFS.US.NGDP_XDC" or just "FSI.US").';

const DATASETS = {
  IFS: 'International Financial Statistics',
  DOT: 'Direction of Trade Statistics',
  BOP: 'Balance of Payments',
  FSI: 'Financial Soundness Indicators',
  CPIS: 'Coordinated Portfolio Investment Survey',
  CDIS: 'Coordinated Direct Investment Survey',
  GFSMAB: 'Government Finance Statistics',
  MFS: 'Monetary and Financial Statistics',
};

const ISO2_TO_ISO2 = {
  US: 'US', GB: 'GB', DE: 'DE', FR: 'FR', JP: 'JP', CN: 'CN',
  IN: 'IN', BR: 'BR', RU: 'RU', AU: 'AU', CA: 'CA', KR: 'KR',
  MX: 'MX', ID: 'ID', TR: 'TR', SA: 'SA', AE: 'AE', IL: 'IL',
  IR: 'IR', UA: 'UA', PK: 'PK', EG: 'EG',
};

export async function run(_ctx, params) {
  const query = (params.query || '').trim().toUpperCase();
  if (!query) throw new Error('query required. Format: DATASET.COUNTRY.INDICATOR or DATASET.COUNTRY\nDatasets: ' + Object.keys(DATASETS).join(', '));

  const parts = query.split('.');
  const dataset = parts[0] || 'IFS';
  const country = parts[1] || 'US';
  const indicator = parts[2] || '';
  const frequency = (params.frequency || 'A').toUpperCase(); // A=annual, Q=quarterly, M=monthly
  const startPeriod = params.start || '';
  const endPeriod = params.end || '';
  const limit = Number(params.limit || 50);

  if (!DATASETS[dataset]) {
    return { error: `Unknown dataset: ${dataset}. Available: ${Object.keys(DATASETS).join(', ')}`, datasets: DATASETS };
  }

  // Build CompactData dimension string: frequency.country[.indicator]
  const dimension = indicator ? `${frequency}.${country}.${indicator}` : `${frequency}.${country}`;

  const url = new URL(`https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/${dataset}/${dimension}`);
  if (startPeriod) url.searchParams.set('startPeriod', startPeriod);
  if (endPeriod) url.searchParams.set('endPeriod', endPeriod);

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`IMF CompactData HTTP ${resp.status} for ${dataset}/${dimension}`);
  const data = await resp.json();

  // Parse IMF CompactData JSON response
  const dataSet = data?.CompactData?.DataSet;
  const series = dataSet?.Series;
  const seriesArr = Array.isArray(series) ? series : series ? [series] : [];

  const results = [];
  for (const s of seriesArr.slice(0, limit)) {
    const obs = s.Obs;
    const obsArr = Array.isArray(obs) ? obs : obs ? [obs] : [];
    const indicatorCode = s['@INDICATOR'] || s['@SUBJECT'] || indicator || '';

    const observations = obsArr.map((o) => ({
      period: o['@TIME_PERIOD'] || '',
      value: o['@OBS_VALUE'] != null ? Number(o['@OBS_VALUE']) : null,
      status: o['@OBS_STATUS'] || '',
    })).filter((o) => o.value !== null);

    if (observations.length > 0) {
      results.push({
        country: s['@REF_AREA'] || country,
        indicator: indicatorCode,
        frequency: s['@FREQ'] || frequency,
        unit: s['@UNIT_MULT'] || '',
        observations: observations.slice(-limit),
        latest: observations[observations.length - 1],
      });
    }
  }

  return {
    dataset,
    datasetName: DATASETS[dataset],
    country,
    indicator: indicator || '(all)',
    frequency,
    series: results,
    seriesCount: results.length,
    source: 'IMF CompactData API',
  };
}
