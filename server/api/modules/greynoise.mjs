/**
 * GreyNoise — Internet scanner and mass exploitation detection
 *
 * Community API: free, no key needed for basic IP lookups
 * Enterprise API: requires GREYNOISE_API_KEY for bulk queries
 *
 * Tells you: "Is this IP a known mass scanner/bot, or targeted attack?"
 * Essential for separating noise from real threats in IOC analysis.
 */

export const name = 'greynoise';
export const description = 'GreyNoise internet noise/scanner detection — check if an IP is a known mass scanner, bot, or benign crawler. Free community API for IP lookups, key for bulk/RIOT queries.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: IP address (e.g. "8.8.8.8") or CIDR block');
  const apiKey = process.env.GREYNOISE_API_KEY || '';

  // Single IP lookup (community API, no key needed)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(query)) {
    // Try community API first (free, no key)
    const communityUrl = `https://api.greynoise.io/v3/community/${query}`;
    const headers = { Accept: 'application/json', 'User-Agent': 'osint-mcp/1.0' };
    if (apiKey) headers['key'] = apiKey;

    const resp = await fetch(communityUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        ip: query,
        noise: data.noise ?? null,
        riot: data.riot ?? null,
        classification: data.classification || '',
        name: data.name || '',
        link: data.link || '',
        lastSeen: data.last_seen || '',
        message: data.message || '',
        source: 'GreyNoise Community API',
      };
    }

    // Try enterprise context API if key available
    if (apiKey) {
      const ctxUrl = `https://api.greynoise.io/v3/context/${query}`;
      const ctxResp = await fetch(ctxUrl, {
        headers: { ...headers, key: apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (ctxResp.ok) {
        const data = await ctxResp.json();
        return {
          ip: query,
          seen: data.seen ?? null,
          classification: data.classification || '',
          noise: data.noise ?? null,
          riot: data.riot ?? null,
          firstSeen: data.first_seen || '',
          lastSeen: data.last_seen || '',
          actor: data.actor || '',
          tags: data.tags || [],
          cve: data.cve || [],
          metadata: {
            asn: data.metadata?.asn || '',
            org: data.metadata?.organization || '',
            city: data.metadata?.city || '',
            country: data.metadata?.country || '',
            os: data.metadata?.os || '',
            category: data.metadata?.category || '',
          },
          rawData: data.raw_data ? {
            ports: data.raw_data.scan?.map((s) => s.port) || [],
            webPaths: data.raw_data.web?.paths || [],
            userAgents: data.raw_data.web?.useragents || [],
          } : null,
          source: 'GreyNoise Context API',
        };
      }
    }

    throw new Error(`GreyNoise returned HTTP ${resp.status} for ${query}`);
  }

  // GNQL search query (enterprise only)
  if (apiKey) {
    const gnqlUrl = `https://api.greynoise.io/v3/query?query=${encodeURIComponent(query)}&size=${params.limit || 20}`;
    const resp = await fetch(gnqlUrl, {
      headers: { key: apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        query,
        count: data.count || 0,
        data: (data.data || []).map((d) => ({
          ip: d.ip,
          classification: d.classification || '',
          lastSeen: d.last_seen || '',
          tags: d.tags || [],
          actor: d.actor || '',
          org: d.metadata?.organization || '',
          country: d.metadata?.country || '',
        })),
        source: 'GreyNoise GNQL API',
      };
    }
    throw new Error(`GreyNoise GNQL HTTP ${resp.status}`);
  }

  return {
    error: 'For GNQL queries, set GREYNOISE_API_KEY (community key is free for IP lookups). Get key at https://viz.greynoise.io/signup',
    note: 'Single IP lookups work without a key. For bulk queries, register for free.',
    source: 'GreyNoise',
  };
}
