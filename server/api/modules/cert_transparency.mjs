/**
 * Certificate Transparency — crt.sh (Sectigo CT log search)
 * Free, no auth. Shows all SSL/TLS certificates ever issued for a domain.
 */
export const name = 'cert_transparency';
export const description = 'Certificate Transparency via crt.sh — find all SSL/TLS certificates issued for a domain. Detects phishing domains, infrastructure standup, certificate changes. No auth.';

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: domain name (e.g. "example.com", "%.gov.ae")');
  const limit = Number(params.limit || 30);

  const url = `https://crt.sh/?q=${encodeURIComponent(query)}&output=json`;
  const resp = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'osint-mcp/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`crt.sh HTTP ${resp.status}`);
  const data = await resp.json();
  const certs = Array.isArray(data) ? data : [];

  return {
    certificates: certs.slice(0, limit).map((c) => ({
      id: c.id || null,
      issuerCA: c.issuer_ca_id || null,
      issuerName: c.issuer_name || '',
      commonName: c.common_name || '',
      nameValue: c.name_value || '',
      notBefore: c.not_before || '',
      notAfter: c.not_after || '',
      serialNumber: c.serial_number || '',
      entryTimestamp: c.entry_timestamp || '',
    })),
    total: certs.length,
    query,
    source: 'crt.sh (Certificate Transparency)',
  };
}
