/**
 * ICIJ Offshore Leaks — Panama Papers, Paradise Papers, Pandora Papers
 * Free, no auth. Entity search across all leak databases.
 */
export const name = 'icij_offshoreleaks';
export const description = 'ICIJ Offshore Leaks database — search Panama Papers, Paradise Papers, Pandora Papers for offshore entities, officers, intermediaries. No auth.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: name, company, or country');
  const limit = Number(params.limit || 20);

  // ICIJ has a search page — try to get structured data
  const url = `https://offshoreleaks.icij.org/search?q=${encodeURIComponent(query)}&cat=1`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'osint-mcp/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`ICIJ HTTP ${resp.status}`);
  const html = await resp.text();

  // Extract search results from HTML table
  const results = [];
  // Match table rows with entity data
  const rowRegex = /<tr[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    if (results.length >= limit) break;
    const nameMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/);
    const cells = row.match(/<td[^>]*>([^<]*)<\/td>/g) || [];
    const cellTexts = cells.map((c) => c.replace(/<[^>]*>/g, '').trim());

    if (nameMatch) {
      results.push({
        name: nameMatch[2].trim(),
        url: `https://offshoreleaks.icij.org${nameMatch[1]}`,
        jurisdiction: cellTexts[1] || '',
        linkedTo: cellTexts[2] || '',
        dataSource: cellTexts[3] || '',
      });
    }
  }

  // If HTML parsing failed, provide search link
  if (results.length === 0) {
    return {
      entities: [],
      query,
      searchUrl: `https://offshoreleaks.icij.org/search?q=${encodeURIComponent(query)}`,
      note: 'ICIJ search returned results but HTML structure may have changed. Use searchUrl to check manually.',
      source: 'ICIJ Offshore Leaks',
    };
  }

  return { entities: results, total: results.length, query, source: 'ICIJ Offshore Leaks' };
}
