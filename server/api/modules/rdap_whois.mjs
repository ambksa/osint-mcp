/**
 * RDAP/WHOIS — domain and IP registration lookup
 * Free, no auth. Uses RDAP protocol (modern WHOIS replacement).
 */
export const name = 'rdap_whois';
export const description = 'Domain and IP WHOIS/RDAP lookup — registrar, registration dates, nameservers, abuse contacts. Free, no auth. Query with domain (example.com) or IP (8.8.8.8).';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: domain name or IP address');

  const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(query);
  const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(query);

  if (isIP) {
    const resp = await fetch(`https://rdap.org/ip/${query}`, {
      headers: { Accept: 'application/rdap+json, application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`RDAP IP HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      ip: query,
      name: data.name || '',
      type: data.type || '',
      handle: data.handle || '',
      parentHandle: data.parentHandle || '',
      startAddress: data.startAddress || '',
      endAddress: data.endAddress || '',
      country: data.country || '',
      entities: (data.entities || []).map((e) => ({
        handle: e.handle || '',
        roles: e.roles || [],
        name: e.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3] || '',
      })),
      events: (data.events || []).map((e) => ({ action: e.eventAction, date: e.eventDate })),
      links: (data.links || []).filter((l) => l.rel === 'self').map((l) => l.href),
      source: 'RDAP',
    };
  }

  if (isDomain) {
    const resp = await fetch(`https://rdap.org/domain/${query}`, {
      headers: { Accept: 'application/rdap+json, application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`RDAP domain HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      domain: query,
      handle: data.handle || '',
      status: data.status || [],
      nameservers: (data.nameservers || []).map((ns) => ns.ldhName || ns.unicodeName || ''),
      entities: (data.entities || []).map((e) => ({
        handle: e.handle || '',
        roles: e.roles || [],
        name: e.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3] || '',
      })),
      events: (data.events || []).map((e) => ({ action: e.eventAction, date: e.eventDate })),
      secureDNS: data.secureDNS || null,
      source: 'RDAP',
    };
  }

  throw new Error('query must be a domain (example.com) or IP address (8.8.8.8)');
}
