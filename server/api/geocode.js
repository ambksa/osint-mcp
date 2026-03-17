import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get('query') || url.searchParams.get('q') || '').trim();
  const limit = Math.max(1, Math.min(10, Number(url.searchParams.get('limit') || 3)));

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const qs = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: String(limit),
    addressdetails: '1',
  });

  try {
    const resp = await fetch(`${NOMINATIM_BASE}?${qs.toString()}`, {
      headers: {
        'User-Agent': 'worldmonitor-headless/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Geocode failed: ${resp.status}`, details: text.slice(0, 200) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const data = await resp.json();
    return new Response(JSON.stringify({ query, results: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? 'Geocode timeout' : 'Geocode failed', details: error?.message || String(error) }), {
      status: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
