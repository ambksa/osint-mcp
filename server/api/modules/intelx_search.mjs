/**
 * Intelligence X — dark web, paste, leak search
 * Requires INTELX_API_KEY (free tier at intelx.io).
 */
export const name = 'intelx_search';
export const description = 'Intelligence X — search dark web, paste sites, data leaks for emails, domains, IPs, bitcoin addresses. Requires INTELX_API_KEY (free tier at intelx.io).';

export async function run(_ctx, params) {
  const apiKey = process.env.INTELX_API_KEY || '';
  if (!apiKey) {
    return {
      error: 'INTELX_API_KEY not configured. Get a free key at https://intelx.io/signup',
      setup: 'Add to server/.env: INTELX_API_KEY=your_key_here',
      results: [],
    };
  }

  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: email, domain, IP, bitcoin address, or keyword');
  const limit = Number(params.limit || 20);

  // Start search
  const searchResp = await fetch('https://2.intelx.io/intelligent/search', {
    method: 'POST',
    headers: { 'x-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      term: query,
      maxresults: limit,
      media: 0, // all media types
      timeout: 10,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!searchResp.ok) throw new Error(`IntelX search HTTP ${searchResp.status}`);
  const searchData = await searchResp.json();
  const searchId = searchData.id;

  if (!searchId) throw new Error('IntelX did not return a search ID');

  // Poll for results
  await new Promise((r) => setTimeout(r, 2000));

  const resultResp = await fetch(`https://2.intelx.io/intelligent/search/result?id=${searchId}&limit=${limit}`, {
    headers: { 'x-key': apiKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!resultResp.ok) throw new Error(`IntelX result HTTP ${resultResp.status}`);
  const resultData = await resultResp.json();

  const records = (resultData.records || []).map((r) => ({
    systemId: r.systemid || '',
    name: r.name || '',
    date: r.date || '',
    bucket: r.bucket || '',
    media: r.media || 0,
    type: r.type || 0,
    storageid: r.storageid || '',
    size: r.size || 0,
  }));

  return {
    results: records,
    total: resultData.count || records.length,
    status: resultData.status || 0,
    query,
    source: 'Intelligence X',
  };
}
