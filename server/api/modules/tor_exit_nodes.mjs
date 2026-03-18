/**
 * Tor Exit Nodes — current Tor exit relays
 * Tries Onionoo API first, falls back to CollecTor, then bulk exit list.
 * No auth required.
 */

export const name = 'tor_exit_nodes';
export const description = 'Current Tor exit relay nodes — IPs, bandwidth, country, flags. Use query to search by IP or country code. No auth required.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  const limit = Number(params.limit || 100);

  // Try Onionoo first (richest data)
  for (const base of [
    'https://onionoo.torproject.org',
    'https://onionoo.torbsd.org',
  ]) {
    try {
      const url = `${base}/details?type=relay&running=true&flag=Exit&limit=${Math.min(limit * 2, 500)}`;
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const relays = Array.isArray(data?.relays) ? data.relays : [];
      if (relays.length === 0) continue;

      let nodes = relays.map((r) => ({
        nickname: r.nickname || '',
        ip: (r.or_addresses || [])[0]?.split(':')[0] || '',
        exitAddresses: r.exit_addresses || [],
        country: r.country || '',
        countryName: r.country_name || '',
        as: r.as || '',
        asName: r.as_name || '',
        bandwidthMbps: r.bandwidth ? Math.round((r.bandwidth[2] || 0) / 125000) : null,
        flags: r.flags || [],
        firstSeen: r.first_seen || '',
        lastSeen: r.last_seen || '',
        platform: r.platform || '',
      }));

      if (query) {
        const ql = query.toLowerCase();
        nodes = nodes.filter((n) =>
          n.ip.includes(ql) || n.country.toLowerCase() === ql ||
          n.countryName.toLowerCase().includes(ql) || n.nickname.toLowerCase().includes(ql) ||
          n.exitAddresses.some((a) => a.includes(ql))
        );
      }

      return {
        exitNodes: nodes.slice(0, limit),
        totalRunning: relays.length,
        source: `Tor Onionoo (${base})`,
      };
    } catch { continue; }
  }

  // Fallback: bulk exit list (IPs only, no metadata)
  try {
    const resp = await fetch('https://check.torproject.org/torbulkexitlist', {
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      const text = await resp.text();
      let ips = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      if (query) {
        ips = ips.filter((ip) => ip.includes(query));
      }
      return {
        exitNodes: ips.slice(0, limit).map((ip) => ({ ip, nickname: '', country: '', flags: ['Exit'] })),
        totalRunning: ips.length,
        source: 'Tor Project bulk exit list (IPs only)',
      };
    }
  } catch { /* fall through */ }

  return {
    exitNodes: [],
    totalRunning: 0,
    error: 'All Tor data sources unreachable',
    source: 'none',
  };
}
