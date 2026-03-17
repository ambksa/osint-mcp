import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { fetchWithTimeout } from './_fetch.js';

export const config = { runtime: 'edge' };

const SOURCE_BASE = {
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
  clob: 'https://clob.polymarket.com',
};

const ALLOWED_PATHS = new Set(['/markets', '/trades', '/book']);

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

  const requestUrl = new URL(req.url);
  const source = requestUrl.searchParams.get('source') || '';
  const path = requestUrl.searchParams.get('path') || '';
  const base = SOURCE_BASE[source];

  if (!base || !ALLOWED_PATHS.has(path)) {
    return new Response(JSON.stringify({ error: 'Invalid source or path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  requestUrl.searchParams.delete('source');
  requestUrl.searchParams.delete('path');
  const qs = requestUrl.searchParams.toString();
  const target = `${base}${path}${qs ? `?${qs}` : ''}`;

  try {
    const response = await fetchWithTimeout(target, {
      headers: { Accept: 'application/json' },
    }, 15000);

    const body = await response.text();
    const headers = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': response.headers.get('cache-control') || 'public, max-age=120',
      ...corsHeaders,
    };

    return new Response(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return new Response(JSON.stringify({
      error: isTimeout ? 'Upstream timeout' : 'Upstream request failed',
      details: error?.message || String(error),
    }), {
      status: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
