import { createCircuitBreaker } from '@/utils';
import type { GeoFilterFeature, GeoFilterType } from '@/types';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  timestamp?: string;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

const FILTER_QUERIES: Record<GeoFilterType, string[]> = {
  roundabout: ['way["junction"="roundabout"]'],
  traffic_signals: ['node["highway"="traffic_signals"]'],
  stop_sign: ['node["traffic_sign"="stop"]', 'node["highway"="stop"]'],
  street_sign: ['node["traffic_sign"]'],
  milestone: ['node["highway"="milestone"]'],
  level_crossing: ['node["railway"="level_crossing"]'],
  bridge: ['way["bridge"="yes"]', 'way["man_made"="bridge"]'],
};

const FILTER_PRIORITY: GeoFilterType[] = [
  'roundabout',
  'traffic_signals',
  'stop_sign',
  'street_sign',
  'milestone',
  'level_crossing',
  'bridge',
];

const breaker = createCircuitBreaker<GeoFilterFeature[]>({
  name: 'OSM Geo Filters',
  cacheTtlMs: 2 * 60 * 1000,
  persistCache: false,
});

function pickEndpoint(idx: number): string {
  return OVERPASS_ENDPOINTS[idx % OVERPASS_ENDPOINTS.length];
}

function buildQuery(bbox: [number, number, number, number], filters: GeoFilterType[]): string {
  const parts: string[] = [];
  for (const filter of filters) {
    const queries = FILTER_QUERIES[filter];
    for (const query of queries) {
      parts.push(`${query}(${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});`);
    }
  }
  return `
[out:json][timeout:25];
(
  ${parts.join('\n  ')}
);
out center qt;
`;
}

function classifyFeature(tags: Record<string, string> | undefined): GeoFilterType | null {
  if (!tags) return null;
  if (tags.junction === 'roundabout') return 'roundabout';
  if (tags.highway === 'traffic_signals') return 'traffic_signals';
  if (tags.traffic_sign === 'stop' || tags.highway === 'stop') return 'stop_sign';
  if (tags.traffic_sign) return 'street_sign';
  if (tags.highway === 'milestone') return 'milestone';
  if (tags.railway === 'level_crossing') return 'level_crossing';
  if (tags.bridge === 'yes' || tags.man_made === 'bridge') return 'bridge';
  return null;
}

function toFeature(el: OverpassElement, type: GeoFilterType): GeoFilterFeature | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  return {
    id: `${el.type}/${el.id}`,
    type,
    lat,
    lon,
    tags: el.tags,
    source: 'osm',
  };
}

export interface GeoFilterFetchResult {
  features: GeoFilterFeature[];
  truncated: boolean;
  counts: Record<GeoFilterType, number>;
}

export async function fetchGeoFilterFeatures(
  bbox: [number, number, number, number],
  filters: GeoFilterType[],
  maxPerType = 500,
): Promise<GeoFilterFetchResult> {
  if (!filters.length) {
    return { features: [], truncated: false, counts: Object.create(null) as Record<GeoFilterType, number> };
  }

  const counts = Object.fromEntries(filters.map((f) => [f, 0])) as Record<GeoFilterType, number>;
  let truncated = false;

  const features = await breaker.execute(async () => {
    const query = buildQuery(bbox, filters);
    const body = new URLSearchParams({ data: query });

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt += 1) {
      try {
        response = await fetch(pickEndpoint(attempt), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body,
          signal: AbortSignal.timeout(20_000),
        });
        if (response.ok) break;
        lastError = new Error(`Overpass ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Overpass fetch failed');
      }
    }

    if (!response || !response.ok) {
      throw lastError ?? new Error('Overpass request failed');
    }

    const data = (await response.json()) as OverpassResponse;
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const seen = new Set<string>();
    const collected: GeoFilterFeature[] = [];

    for (const el of elements) {
      let type = classifyFeature(el.tags);
      if (type === 'stop_sign' && !filters.includes('stop_sign') && filters.includes('street_sign')) {
        type = 'street_sign';
      }
      if (!type || !filters.includes(type)) continue;
      if (counts[type] >= maxPerType) {
        truncated = true;
        continue;
      }
      const feature = toFeature(el, type);
      if (!feature) continue;
      if (seen.has(feature.id)) continue;
      seen.add(feature.id);
      counts[type] = (counts[type] ?? 0) + 1;
      collected.push(feature);
    }

    return collected;
  }, []);

  // Ensure counts for all filters
  for (const filter of filters) {
    if (counts[filter] == null) counts[filter] = 0;
  }

  // Stable ordering for UI display
  features.sort((a, b) => {
    const pA = FILTER_PRIORITY.indexOf(a.type);
    const pB = FILTER_PRIORITY.indexOf(b.type);
    if (pA !== pB) return pA - pB;
    return a.id.localeCompare(b.id);
  });

  return { features, truncated, counts };
}
