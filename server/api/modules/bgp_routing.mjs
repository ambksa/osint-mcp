/**
 * BGP Routing — prefix lookups and AS information via RIPEstat
 * Free, no auth. Shows BGP routing, AS ownership, prefix announcements.
 */
export const name = 'bgp_routing';
export const description = 'BGP routing intelligence via RIPEstat — AS info, prefix announcements, routing status, looking glass. Query with IP, prefix, or ASN (e.g. "8.8.8.0/24", "AS15169"). No auth.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: IP address, prefix (8.8.8.0/24), or ASN (AS15169)');

  const isASN = /^AS?\d+$/i.test(query);
  const asn = isASN ? query.replace(/^AS/i, '') : null;

  if (asn) {
    // AS overview
    const [overviewResp, prefixResp] = await Promise.all([
      fetch(`https://stat.ripe.net/data/as-overview/data.json?resource=AS${asn}`, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asn}`, { signal: AbortSignal.timeout(10000) }),
    ]);

    const overview = overviewResp.ok ? await overviewResp.json() : {};
    const prefixes = prefixResp.ok ? await prefixResp.json() : {};
    const oData = overview?.data || {};
    const pData = prefixes?.data?.prefixes || [];

    return {
      asn: `AS${asn}`,
      holder: oData.holder || '',
      announced: oData.announced || false,
      block: oData.block?.name || '',
      prefixCount: pData.length,
      prefixes: pData.slice(0, Number(params.limit || 20)).map((p) => ({
        prefix: p.prefix,
        timelines: p.timelines?.map((t) => ({ start: t.starttime, end: t.endtime })) || [],
      })),
      source: 'RIPEstat',
    };
  }

  // IP/prefix lookup
  const resource = query.includes('/') ? query : `${query}/32`;
  const [routingResp, geoResp, abuseResp] = await Promise.all([
    fetch(`https://stat.ripe.net/data/routing-status/data.json?resource=${encodeURIComponent(resource)}`, { signal: AbortSignal.timeout(10000) }),
    fetch(`https://stat.ripe.net/data/maxmind-geo-lite/data.json?resource=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) }),
    fetch(`https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) }),
  ]);

  const routing = routingResp.ok ? (await routingResp.json())?.data || {} : {};
  const geo = geoResp.ok ? (await geoResp.json())?.data?.located_resources?.[0] || {} : {};
  const abuse = abuseResp.ok ? (await abuseResp.json())?.data || {} : {};

  return {
    resource: query,
    routing: {
      announced: routing.first_seen ? true : false,
      visibility: routing.visibility?.v4?.total_peers || routing.visibility?.v6?.total_peers || null,
      origins: (routing.last_seen?.origin || '').split(',').filter(Boolean),
      prefix: routing.last_seen?.prefix || '',
      firstSeen: routing.first_seen?.time || '',
    },
    geolocation: {
      country: geo.locations?.[0]?.country || '',
      city: geo.locations?.[0]?.city || '',
      latitude: geo.locations?.[0]?.latitude || null,
      longitude: geo.locations?.[0]?.longitude || null,
    },
    abuse: {
      contacts: abuse.abuse_contacts || [],
      authorityInfo: abuse.authoritative_rir || '',
    },
    source: 'RIPEstat',
  };
}
