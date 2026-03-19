/**
 * WITS Tariff Rates — World Bank tariff data
 *
 * Fully public, no auth required. Returns MFN (Most Favored Nation) tariff
 * rates by country and product category.
 */

import { XMLParser } from 'fast-xml-parser';

export const name = 'tariff_rates';
export const description = 'World Bank WITS tariff rates — MFN applied tariff rates by country and product. No auth required. Query: country code.';

const ISO2_TO_NUM = {
  US: '840', CN: '156', DE: '276', JP: '392', GB: '826', FR: '250',
  IN: '356', BR: '076', RU: '643', KR: '410', CA: '124', AU: '036',
  MX: '484', ID: '360', TR: '792', SA: '682', AE: '784', IL: '376',
  EU: '918', EG: '818', NG: '566', ZA: '710', TH: '764', MY: '458',
  VN: '704', PH: '608', PK: '586', KE: '404', AR: '032', CL: '152',
};

// Key product groups (HS 2-digit)
const PRODUCTS = {
  '01': 'Live animals', '02': 'Meat', '10': 'Cereals', '27': 'Mineral fuels/oil',
  '72': 'Iron and steel', '84': 'Machinery', '85': 'Electrical equipment',
  '87': 'Vehicles', '30': 'Pharmaceuticals', '39': 'Plastics',
};

export async function run(ctx, params) {
  const query = (params.query || '').toUpperCase().trim();
  if (!query) throw new Error('query required: country code (e.g. "US", "CN", "EU")');

  const year = params.year || '2022';
  const limit = Number(params.limit || 20);
  const reporterCode = ISO2_TO_NUM[query] || query;

  // Fetch tariff data for key product groups
  const results = [];
  const products = Object.keys(PRODUCTS).slice(0, limit);

  // Fetch a few products in parallel
  const fetches = products.map(async (prodCode) => {
    try {
      const url = `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/${reporterCode}/partner/000/product/${prodCode}0000/year/${year}/datatype/reported`;
      const resp = await fetch(url, {
        headers: { Accept: 'application/xml' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return null;
      const xml = await resp.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const data = parser.parse(xml);

      // Extract tariff value from SDMX structure
      const series = data?.['message:StructureSpecificData']?.['message:DataSet']?.Series;
      const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
      for (const s of seriesArr) {
        const obs = s.Obs;
        const obsArr = Array.isArray(obs) ? obs : obs ? [obs] : [];
        for (const o of obsArr) {
          const val = parseFloat(o?.['@_OBS_VALUE']);
          if (!isNaN(val)) {
            return {
              product: PRODUCTS[prodCode] || prodCode,
              hsCode: prodCode,
              mfnRate: val,
              year,
              reporter: query,
            };
          }
        }
      }
      return null;
    } catch { return null; }
  });

  const settled = await Promise.allSettled(fetches);
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) results.push(s.value);
  }

  return {
    tariffs: results,
    country: query,
    year,
    source: 'World Bank WITS (no auth)',
  };
}
