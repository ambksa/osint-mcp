/**
 * NVD/CVE — NIST National Vulnerability Database
 * No auth required (5 req/30s rate limit).
 * Search by keyword, CVE ID, or get recent vulnerabilities.
 */

export const name = 'nvd_cves';
export const description = 'NIST NVD vulnerability database — CVEs with CVSS scores, severity, affected products. Search by keyword or CVE ID. No auth (rate limited 5/30s).';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  const limit = Math.min(Number(params.limit || 20), 50);
  const days = Number(params.days || 7);

  const url = new URL('https://services.nvd.nist.gov/rest/json/cves/2.0');
  url.searchParams.set('resultsPerPage', String(limit));

  if (query && /^CVE-\d{4}-\d+$/i.test(query)) {
    url.searchParams.set('cveId', query.toUpperCase());
  } else if (query) {
    url.searchParams.set('keywordSearch', query);
    url.searchParams.set('keywordExactMatch', '');
  } else {
    const now = new Date();
    const start = new Date(now.getTime() - days * 86400000);
    url.searchParams.set('pubStartDate', start.toISOString());
    url.searchParams.set('pubEndDate', now.toISOString());
  }

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`NVD HTTP ${resp.status}`);
  const data = await resp.json();
  const items = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];

  return {
    vulnerabilities: items.map((item) => {
      const cve = item.cve || {};
      const metrics = cve.metrics || {};
      const cvss31 = metrics.cvssMetricV31?.[0]?.cvssData;
      const cvss2 = metrics.cvssMetricV2?.[0]?.cvssData;
      const cvss = cvss31 || cvss2 || {};
      const desc = (cve.descriptions || []).find((d) => d.lang === 'en')?.value || '';
      const weaknesses = (cve.weaknesses || []).flatMap((w) => (w.description || []).map((d) => d.value));
      const refs = (cve.references || []).map((r) => r.url).slice(0, 5);

      return {
        cveId: cve.id || '',
        description: desc.slice(0, 300),
        cvssScore: cvss.baseScore ?? null,
        severity: cvss.baseSeverity || (typeof cvss.baseScore === 'number' ? (cvss.baseScore >= 9 ? 'CRITICAL' : cvss.baseScore >= 7 ? 'HIGH' : cvss.baseScore >= 4 ? 'MEDIUM' : 'LOW') : 'UNKNOWN'),
        attackVector: cvss.attackVector || '',
        published: cve.published || '',
        lastModified: cve.lastModified || '',
        weaknesses,
        references: refs,
      };
    }),
    totalResults: data.totalResults || items.length,
    source: 'NIST NVD',
  };
}
