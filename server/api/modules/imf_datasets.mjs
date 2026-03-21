/**
 * IMF Datasets — multiple indicators via DataMapper API
 * Free, no auth. Supports IFS, WEO indicators with full time series.
 * DataMapper is reliable; CompactData (SDMX) is frequently unreachable.
 */
export const name = 'imf_datasets';
export const description = 'IMF economic indicators via DataMapper API — GDP growth, inflation, debt, unemployment, current account, exchange rates for any country. Query: INDICATOR.COUNTRY (e.g. "NGDP_RPCH.USA", "PCPIPCH.DEU") or just country code for key indicators.';

// Key IMF DataMapper indicators
const KEY_INDICATORS = {
  NGDP_RPCH: 'Real GDP Growth (%)',
  PCPIPCH: 'Inflation Rate (%)',
  GGXWDG_NGDP: 'Government Debt (% GDP)',
  LUR: 'Unemployment Rate (%)',
  BCA_NGDPD: 'Current Account (% GDP)',
  NGDPD: 'GDP (USD billions)',
  NGDPDPC: 'GDP Per Capita (USD)',
  LP: 'Population (millions)',
  GGR_NGDP: 'Government Revenue (% GDP)',
  GGX_NGDP: 'Government Expenditure (% GDP)',
  PPPSH: 'PPP Share of World (%)',
};

const ISO2_TO_ISO3 = {
  US: 'USA', GB: 'GBR', DE: 'DEU', FR: 'FRA', JP: 'JPN', CN: 'CHN',
  IN: 'IND', BR: 'BRA', RU: 'RUS', AU: 'AUS', CA: 'CAN', KR: 'KOR',
  MX: 'MEX', ID: 'IDN', TR: 'TUR', SA: 'SAU', AE: 'ARE', IL: 'ISR',
  IR: 'IRN', UA: 'UKR', PK: 'PAK', EG: 'EGY', NG: 'NGA', ZA: 'ZAF',
  AR: 'ARG', CL: 'CHL', CO: 'COL', PE: 'PER', VE: 'VEN', TH: 'THA',
  MY: 'MYS', SG: 'SGP', PH: 'PHL', VN: 'VNM', BD: 'BGD', PL: 'POL',
  SE: 'SWE', NO: 'NOR', FI: 'FIN', NZ: 'NZL', IE: 'IRL', CH: 'CHE',
  NL: 'NLD', IT: 'ITA', ES: 'ESP', GR: 'GRC', QA: 'QAT', KW: 'KWT',
  BH: 'BHR', OM: 'OMN', JO: 'JOR', IQ: 'IRQ', AF: 'AFG',
};

function pickLatest(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const years = Object.keys(obj).filter((k) => /^\d{4}$/.test(k)).sort();
  if (!years.length) return null;
  const year = years[years.length - 1];
  const value = Number(obj[year]);
  return Number.isFinite(value) ? { year, value } : null;
}

export async function run(_ctx, params) {
  const query = (params.query || '').trim().toUpperCase();
  if (!query) throw new Error('query required: INDICATOR.COUNTRY (e.g. "NGDP_RPCH.USA") or just country code (e.g. "US") for key indicators');

  const parts = query.split('.');
  let indicators, country;

  if (parts.length >= 2) {
    // INDICATOR.COUNTRY format
    indicators = [parts[0]];
    country = ISO2_TO_ISO3[parts[1]] || parts[1];
  } else if (/^[A-Z]{2,3}$/.test(query)) {
    // Just country — fetch all key indicators
    country = ISO2_TO_ISO3[query] || query;
    indicators = Object.keys(KEY_INDICATORS);
  } else {
    // Assume it's an indicator for all major economies
    indicators = [query];
    country = '';
  }

  const results = [];

  // Fetch each indicator in parallel
  const fetches = indicators.map(async (indicator) => {
    try {
      const urlPath = country ? `${indicator}/${country}` : indicator;
      const url = `https://www.imf.org/external/datamapper/api/v1/${urlPath}`;
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const values = data?.values?.[indicator];
      if (!values) return null;

      if (country) {
        const countryValues = values[country] || {};
        const latest = pickLatest(countryValues);
        if (latest || Object.keys(countryValues).length > 0) {
          return {
            indicator,
            indicatorName: KEY_INDICATORS[indicator] || indicator,
            country,
            latest,
            timeSeries: countryValues,
            dataPoints: Object.keys(countryValues).length,
          };
        }
      } else {
        // Multiple countries for one indicator
        const entries = [];
        for (const [c, vals] of Object.entries(values)) {
          const latest = pickLatest(vals);
          if (latest) entries.push({ country: c, ...latest });
        }
        entries.sort((a, b) => b.value - a.value);
        return {
          indicator,
          indicatorName: KEY_INDICATORS[indicator] || indicator,
          countries: entries.slice(0, Number(params.limit || 30)),
          totalCountries: entries.length,
        };
      }
      return null;
    } catch { return null; }
  });

  const settled = await Promise.allSettled(fetches);
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) results.push(s.value);
  }

  return {
    indicators: results,
    country: country || 'multiple',
    query,
    availableIndicators: KEY_INDICATORS,
    source: 'IMF DataMapper API',
  };
}
