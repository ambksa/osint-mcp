/**
 * URLhaus — malware URL tracking from abuse.ch
 * No auth required. Parses the CSV recent dump.
 */

export const name = 'urlhaus_urls';
export const description = 'URLhaus malware URL tracking — phishing, malware distribution, C2 callback URLs from abuse.ch. No auth required.';

export async function run(_ctx, params) {
  const limit = Number(params.limit || 100);

  const resp = await fetch('https://urlhaus.abuse.ch/downloads/csv_recent/', {
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`URLhaus HTTP ${resp.status}`);
  const text = await resp.text();

  // Parse CSV (skip comment lines starting with #)
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#'));
  const urls = [];
  for (const line of lines) {
    if (urls.length >= limit) break;
    // CSV format: "id","dateadded","url","url_status","last_online","threat","tags","urlhaus_link","reporter"
    const match = line.match(/^"(\d+)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
    if (!match) continue;
    urls.push({
      id: match[1],
      dateAdded: match[2],
      url: match[3],
      urlStatus: match[4],
      lastOnline: match[5],
      threat: match[6],
      tags: match[7] ? match[7].split(',').map((t) => t.trim()) : [],
      urlhausRef: match[8],
      reporter: match[9],
    });
  }

  return {
    urls,
    totalRecent: lines.length,
    source: 'URLhaus (abuse.ch)',
  };
}
