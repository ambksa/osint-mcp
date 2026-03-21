/**
 * MITRE ATT&CK — adversary tactics, techniques, and procedures
 * Free, no auth. Searches the ATT&CK knowledge base.
 */
export const name = 'mitre_attack';
export const description = 'MITRE ATT&CK framework — search adversary tactics, techniques, procedures (TTPs), groups, software, mitigations. Query by technique ID (T1566), group name (APT28), or keyword (phishing).';

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 24 * 3600 * 1000; // 24h — ATT&CK updates infrequently

async function loadAttack() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;
  const resp = await fetch('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json', {
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`MITRE ATT&CK HTTP ${resp.status}`);
  const data = await resp.json();
  _cache = data?.objects || [];
  _cacheTime = Date.now();
  return _cache;
}

export async function run(_ctx, params) {
  const query = (params.query || '').trim();
  if (!query) throw new Error('query required: technique ID (T1566), group name (APT28), or keyword');
  const limit = Number(params.limit || 20);
  const ql = query.toLowerCase();

  const objects = await loadAttack();

  const matches = [];
  for (const obj of objects) {
    if (matches.length >= limit) break;
    const type = obj.type || '';
    if (!['attack-pattern', 'intrusion-set', 'malware', 'tool', 'course-of-action'].includes(type)) continue;

    const name = obj.name || '';
    const desc = (obj.description || '').slice(0, 500);
    const refs = (obj.external_references || []);
    const attackId = refs.find((r) => r.source_name === 'mitre-attack')?.external_id || '';
    const searchable = `${name} ${desc} ${attackId} ${(obj.aliases || []).join(' ')}`.toLowerCase();

    if (searchable.includes(ql) || attackId.toLowerCase() === ql) {
      matches.push({
        id: attackId,
        name,
        type: type.replace('attack-pattern', 'technique').replace('intrusion-set', 'group').replace('course-of-action', 'mitigation'),
        description: desc.slice(0, 300),
        aliases: obj.aliases || [],
        platforms: obj.x_mitre_platforms || [],
        tactics: (obj.kill_chain_phases || []).map((p) => p.phase_name),
        url: refs.find((r) => r.source_name === 'mitre-attack')?.url || '',
        created: obj.created || '',
        modified: obj.modified || '',
      });
    }
  }

  return { results: matches, total: matches.length, query, source: 'MITRE ATT&CK Enterprise' };
}
