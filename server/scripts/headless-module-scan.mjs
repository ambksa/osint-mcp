#!/usr/bin/env node
import fs from 'node:fs';

const base = process.env.HEADLESS_BASE_URL || 'http://127.0.0.1:3000';
const listUrl = `${base}/api/headless?module=list&format=json`;

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, status: res.status, text };
  }
  return { ok: res.ok, status: res.status, data };
}

function summarizeValue(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === 'object') return `object(keys=${Object.keys(value).length})`;
  return typeof value;
}

function summarizeModulePayload(modPayload) {
  if (!modPayload || typeof modPayload !== 'object') return { note: 'empty-or-nonobject' };
  if (modPayload.error) return { error: modPayload.error };

  const summary = {};
  for (const [k, v] of Object.entries(modPayload)) {
    summary[k] = summarizeValue(v);
  }
  return summary;
}

async function main() {
  const listRes = await getJson(listUrl);
  if (!listRes.ok) {
    console.error('Failed to load module list', listRes.status, listRes.text);
    process.exit(1);
  }

  const modules = listRes.data.modules || [];
  const out = {
    requestedAt: new Date().toISOString(),
    base,
    total: modules.length,
    modules: []
  };

  for (const mod of modules) {
    const id = mod.name || mod.id || mod;
    const url = `${base}/api/headless?module=${encodeURIComponent(id)}&format=json`;
    const res = await getJson(url);

    if (!res.ok) {
      out.modules.push({ id, description: mod.description, status: res.status, error: 'non-json-or-http-error', sample: res.text?.slice?.(0, 200) });
      continue;
    }

    let payload = res.data;
    // standard shape: { modules: { <id>: {...}} }
    if (payload && payload.modules && payload.modules[id]) {
      payload = payload.modules[id];
    }

    out.modules.push({
      id,
      description: mod.description,
      status: res.status,
      summary: summarizeModulePayload(payload)
    });
  }

  const md = [];
  md.push(`# Headless Module Output Snapshot`);
  md.push('');
  md.push(`- Base: ${base}`);
  md.push(`- Captured: ${out.requestedAt}`);
  md.push(`- Modules: ${out.total}`);
  md.push('');

  for (const m of out.modules) {
    md.push(`## ${m.id}`);
    if (m.description) md.push(`- Description: ${m.description}`);
    md.push(`- Status: ${m.status}`);
    if (m.error) {
      md.push(`- Error: ${m.error}`);
    }
    if (m.sample) {
      md.push(`- Sample: ${m.sample.replace(/\n/g, ' ')}`);
    }
    if (m.summary) {
      md.push(`- Summary:`);
      for (const [k, v] of Object.entries(m.summary)) {
        md.push(`  - ${k}: ${v}`);
      }
    }
    md.push('');
  }

  const outputDir = new URL('../skills/headless-monitor/references/', import.meta.url);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(new URL('headless-modules-output.md', outputDir), md.join('\n'));
  fs.writeFileSync(new URL('headless-modules-output.json', outputDir), JSON.stringify(out, null, 2));
  console.log('Wrote output docs to headless-modules-output.md/json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
