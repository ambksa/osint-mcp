import { createCircuitBreaker } from '@/utils';
import type { ConstructionSite } from '@/types';

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

const MAJOR_CONSTRUCTION_FILTER = '(military|naval|port|harbour|dock|ship|airport|airbase|runway|rail|bridge|tunnel|power|plant|nuclear|oil|gas|refinery|pipeline|dam|mine|industrial|factory|manufactur|warehouse|logistics|solar|wind|hydro)';

const REGIONS: Array<{ id: string; name: string; bbox: [number, number, number, number] }> = [
  { id: 'north_america', name: 'North America', bbox: [-168, 7, -52, 72] },
  { id: 'south_america', name: 'South America', bbox: [-92, -56, -30, 13] },
  { id: 'europe', name: 'Europe', bbox: [-31, 34, 39, 72] },
  { id: 'north_africa', name: 'North Africa', bbox: [-17, 18, 52, 38] },
  { id: 'sub_saharan', name: 'Sub-Saharan Africa', bbox: [-19, -35, 52, 18] },
  { id: 'middle_east', name: 'Middle East', bbox: [26, 12, 66, 42] },
  { id: 'south_asia', name: 'South Asia', bbox: [60, 5, 98, 35] },
  { id: 'east_asia', name: 'East Asia', bbox: [99, 18, 146, 52] },
  { id: 'southeast_asia', name: 'Southeast Asia', bbox: [90, -11, 141, 23] },
  { id: 'oceania', name: 'Oceania', bbox: [110, -47, 180, -5] },
];

const QUERY_TEMPLATE = (bbox: [number, number, number, number]) => `
[out:json][timeout:25];
(
  nwr["construction"~"${MAJOR_CONSTRUCTION_FILTER}",i](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
  nwr["landuse"="construction"]["construction"~"${MAJOR_CONSTRUCTION_FILTER}",i](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
  nwr["building"="construction"]["construction"~"${MAJOR_CONSTRUCTION_FILTER}",i](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
);
out center qt;
`;

const breaker = createCircuitBreaker<ConstructionSite[]>({
  name: 'Construction Sites',
  cacheTtlMs: 5 * 60 * 1000,
  persistCache: false,
});

let lastKnownIds = new Set<string>();
const MAX_SITES_PER_REGION = 500;

function pickEndpoint(idx: number): string {
  return OVERPASS_ENDPOINTS[idx % OVERPASS_ENDPOINTS.length];
}

function toSite(el: OverpassElement, region: string): ConstructionSite | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = el.tags || {};
  const name = tags.name || tags['name:en'] || tags.description || tags.operator || 'Construction Site';
  const category = tags.construction || tags.landuse || tags.building || 'construction';
  const id = `${el.type}/${el.id}`;

  return {
    id,
    name,
    lat,
    lon,
    category,
    region,
    source: 'osm',
    updatedAt: el.timestamp,
  };
}

async function fetchRegion(region: typeof REGIONS[number], attempt = 0): Promise<ConstructionSite[]> {
  const endpoint = pickEndpoint(attempt);
  const body = new URLSearchParams({ data: QUERY_TEMPLATE(region.bbox) });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    if (attempt < OVERPASS_ENDPOINTS.length - 1) {
      return fetchRegion(region, attempt + 1);
    }
    throw new Error(`Overpass ${response.status} for ${region.name}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const sites: ConstructionSite[] = [];

  for (const el of elements) {
    const site = toSite(el, region.name);
    if (site) sites.push(site);
    if (sites.length >= MAX_SITES_PER_REGION) break;
  }

  return sites;
}

export interface ConstructionFetchResult {
  sites: ConstructionSite[];
  newSites: ConstructionSite[];
}

export async function fetchConstructionSites(): Promise<ConstructionFetchResult> {
  const sites = await breaker.execute(async () => {
    const results = await Promise.allSettled(REGIONS.map(r => fetchRegion(r)));
    const merged: ConstructionSite[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') merged.push(...r.value);
    }

    // Deduplicate by ID
    const seen = new Map<string, ConstructionSite>();
    for (const s of merged) {
      if (!seen.has(s.id)) seen.set(s.id, s);
    }

    return Array.from(seen.values());
  }, []);

  const newSites: ConstructionSite[] = [];
  const nextIds = new Set<string>();
  for (const s of sites) {
    nextIds.add(s.id);
    if (!lastKnownIds.has(s.id)) newSites.push(s);
  }
  lastKnownIds = nextIds;

  return { sites, newSites };
}
