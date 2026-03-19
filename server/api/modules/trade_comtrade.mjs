/**
 * UN Comtrade — International trade flow data
 *
 * Free preview API (no key needed, 500 records max).
 * Covers merchandise trade between any two countries by commodity.
 */

export const name = 'trade_comtrade';
export const description = 'UN Comtrade international trade flows — imports/exports between countries by commodity. No auth needed (preview mode). Query: reporter country code.';

// ISO3 codes for common countries
const ISO2_TO_ISO3_NUM = {
  US: '842', CN: '156', DE: '276', JP: '392', GB: '826', FR: '251',
  IN: '356', BR: '076', RU: '643', KR: '410', CA: '124', AU: '036',
  MX: '484', ID: '360', TR: '792', SA: '682', AE: '784', IL: '376',
  IR: '364', UA: '804', PK: '586', EG: '818', NG: '566', ZA: '710',
  TW: '158', TH: '764', MY: '458', SG: '702', PH: '608', VN: '704',
  IT: '380', ES: '724', NL: '528', PL: '616', SE: '752', NO: '578',
  CH: '756', QA: '634', KW: '414', BH: '048', OM: '512', JO: '400',
  IQ: '368', AF: '004', KP: '408',
};

export async function run(_ctx, params) {
  const reporter = (params.query || params.reporter || '').toUpperCase().trim();
  if (!reporter) throw new Error('query required: reporter country code (e.g. "US", "CN")');

  const partner = (params.partner || '').toUpperCase().trim();
  const year = params.year || '2023';
  const flow = params.flow || ''; // M=import, X=export, empty=both
  const limit = Number(params.limit || 20);

  const reporterCode = ISO2_TO_ISO3_NUM[reporter] || reporter;
  const partnerCode = partner ? (ISO2_TO_ISO3_NUM[partner] || partner) : '0'; // 0 = World

  const url = new URL('https://comtradeapi.un.org/public/v1/preview/C/A/HS');
  url.searchParams.set('reporterCode', reporterCode);
  url.searchParams.set('period', year);
  url.searchParams.set('partnerCode', partnerCode);
  url.searchParams.set('cmdCode', 'TOTAL');
  if (flow) url.searchParams.set('flowCode', flow);

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`UN Comtrade HTTP ${resp.status}`);
  const data = await resp.json();

  const records = (data.data || []).slice(0, limit).map((r) => ({
    reporter: r.reporterDesc || r.reporterCode || '',
    partner: r.partnerDesc || r.partnerCode || '',
    flow: r.flowDesc || r.flowCode || '',
    commodity: r.cmdDesc || r.cmdCode || '',
    year: r.period || '',
    tradeValueUsd: r.primaryValue || r.TradeValue || 0,
    netWeight: r.netWgt || 0,
    quantity: r.qty || 0,
  }));

  return {
    records,
    total: data.count || records.length,
    reporter,
    partner: partner || 'World',
    year,
    source: 'UN Comtrade (preview, no auth)',
  };
}
