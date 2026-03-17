import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

const SOURCES = {
  arcgis: {
    type: 'arcgis',
    name: 'ArcGIS World Imagery',
    endpoint: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export',
  },
  gibs_modis_truecolor: {
    type: 'wms',
    name: 'NASA GIBS MODIS Terra True Color (WMS)',
    endpoint: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    format: 'image/png',
  },
  gibs_viirs_truecolor: {
    type: 'wms',
    name: 'NASA GIBS VIIRS SNPP True Color (WMS)',
    endpoint: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
    layer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    format: 'image/png',
  },
  eox_s2cloudless: {
    type: 'wms',
    name: 'EOX Sentinel-2 Cloudless (WMS)',
    endpoint: 'http://tiles.maps.eox.at/wms?',
    layer: 's2cloudless',
    format: 'image/jpeg',
  },
  custom_wms: {
    type: 'wms_custom',
    name: 'Custom WMS (user-supplied endpoint/layer)',
    endpoint: '',
    layer: '',
    format: 'image/png',
  },
};

const DEFAULT_SIZE = 1024;
const MAX_SIZE = 2048;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function bboxFromCenter(centerLat, centerLon, radiusKm) {
  const lat = Number(centerLat);
  const lon = Number(centerLon);
  const r = Number(radiusKm);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(r) || r <= 0) return null;
  const latDelta = r / 110.574;
  const lonDelta = r / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    west: lon - lonDelta,
    east: lon + lonDelta,
    south: lat - latDelta,
    north: lat + latDelta,
  };
}

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
  const sourceId = (url.searchParams.get('source') || 'arcgis').toLowerCase();
  const source = SOURCES[sourceId];
  if (!source) {
    return new Response(JSON.stringify({ error: 'Unknown source', available: Object.keys(SOURCES) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const west = Number(url.searchParams.get('west') ?? url.searchParams.get('w'));
  const south = Number(url.searchParams.get('south') ?? url.searchParams.get('s'));
  const east = Number(url.searchParams.get('east') ?? url.searchParams.get('e'));
  const north = Number(url.searchParams.get('north') ?? url.searchParams.get('n'));
  const centerLat = url.searchParams.get('lat');
  const centerLon = url.searchParams.get('lon');
  const radiusKm = url.searchParams.get('radius_km');

  let bbox = null;
  if (Number.isFinite(west) && Number.isFinite(south) && Number.isFinite(east) && Number.isFinite(north)) {
    bbox = { west, south, east, north };
  } else if (centerLat && centerLon && radiusKm) {
    bbox = bboxFromCenter(centerLat, centerLon, radiusKm);
  }

  if (!bbox) {
    return new Response(JSON.stringify({ error: 'Missing bbox (west,south,east,north) or center+radius_km' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const width = clamp(Number(url.searchParams.get('width') || DEFAULT_SIZE), 256, MAX_SIZE);
  const height = clamp(Number(url.searchParams.get('height') || DEFAULT_SIZE), 256, MAX_SIZE);
  const output = (url.searchParams.get('output') || 'json').toLowerCase();
  const time = url.searchParams.get('time') || '';
  const layer = url.searchParams.get('layer') || source.layer;
  const wmsEndpoint = url.searchParams.get('wms_url') || source.endpoint;

  let imageUrl = '';
  if (source.type === 'arcgis') {
    const params = new URLSearchParams({
      bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
      bboxSR: '4326',
      imageSR: '4326',
      size: `${width},${height}`,
      format: 'png',
      transparent: 'false',
      f: 'image',
    });
    imageUrl = `${source.endpoint}?${params.toString()}`;
  } else {
    if (!wmsEndpoint || !layer) {
      return new Response(JSON.stringify({ error: 'Missing WMS endpoint or layer', available: Object.keys(SOURCES) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const params = new URLSearchParams({
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      layers: layer,
      styles: '',
      srs: 'EPSG:4326',
      bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
      width: String(width),
      height: String(height),
      format: source.format || 'image/png',
      transparent: 'false',
    });
    if (time) params.set('time', time);
    imageUrl = `${wmsEndpoint}${wmsEndpoint.includes('?') ? '' : '?'}${params.toString()}`;
  }

  if (output === 'image') {
    try {
      const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
      if (!resp.ok) {
        const text = await resp.text();
        return new Response(JSON.stringify({ error: `Snapshot failed: ${resp.status}`, details: text.slice(0, 200) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const buffer = await resp.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=120',
          ...corsHeaders,
        },
      });
    } catch (error) {
      const isTimeout = error?.name === 'AbortError';
      return new Response(JSON.stringify({ error: isTimeout ? 'Snapshot timeout' : 'Snapshot failed', details: error?.message || String(error) }), {
        status: isTimeout ? 504 : 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response(JSON.stringify({
    source: source.name,
    sourceId,
    sourceType: source.type,
    bbox,
    width,
    height,
    imageUrl,
    availableSources: Object.keys(SOURCES),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
