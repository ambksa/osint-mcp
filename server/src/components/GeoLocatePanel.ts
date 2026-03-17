import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren, clearChildren } from '@/utils/dom-utils';
import { fetchGeoFilterFeatures } from '@/services/osm-geofilters';
import { haversineDistanceKm } from '@/services/related-assets';
import type { MapContainer } from './MapContainer';
import type { GeoFilterFeature, GeoFilterMatch, GeoFilterType } from '@/types';

type Bounds = { west: number; south: number; east: number; north: number };

const FILTERS: Array<{ type: GeoFilterType; label: string; hint: string }> = [
  { type: 'roundabout', label: 'Roundabouts', hint: 'junction=roundabout' },
  { type: 'traffic_signals', label: 'Traffic signals', hint: 'highway=traffic_signals' },
  { type: 'stop_sign', label: 'Stop signs', hint: 'traffic_sign=stop' },
  { type: 'street_sign', label: 'Street signs', hint: 'traffic_sign=*' },
  { type: 'milestone', label: 'Milestones', hint: 'highway=milestone' },
  { type: 'level_crossing', label: 'Rail crossings', hint: 'railway=level_crossing' },
  { type: 'bridge', label: 'Bridges', hint: 'bridge=yes' },
];

const FILTER_COLORS: Record<GeoFilterType, string> = {
  roundabout: '#3b82f6',
  traffic_signals: '#ea580c',
  stop_sign: '#dc2626',
  street_sign: '#10b981',
  milestone: '#d97706',
  level_crossing: '#8b5cf6',
  bridge: '#0e7490',
};

export class GeoLocatePanel extends Panel {
  private map: MapContainer | null;
  private selectedFilters = new Set<GeoFilterType>();
  private distanceKm = 1.0;
  private anchorType: GeoFilterType | null = null;
  private lastBounds: Bounds | null = null;
  private loading = false;
  private lastCounts: Record<GeoFilterType, number> = Object.create(null) as Record<GeoFilterType, number>;
  private lastTruncated = false;
  private lastMatches: GeoFilterMatch[] = [];

  constructor(map: MapContainer | null) {
    super({ id: 'geo-filters', title: t('panels.geoLocate') || 'Geo Locate' });
    this.map = map;
    this.render();
  }

  private render(): void {
    clearChildren(this.content);

    const boundsLabel = this.lastBounds
      ? `W ${this.lastBounds.west.toFixed(2)} | S ${this.lastBounds.south.toFixed(2)} | E ${this.lastBounds.east.toFixed(2)} | N ${this.lastBounds.north.toFixed(2)}`
      : 'No area selected';

    const boundsEl = h('div', { className: 'geo-filter-bounds' }, boundsLabel);
    const useViewBtn = h('button', {
      className: 'geo-filter-btn primary',
      onClick: () => this.captureBounds(),
    }, 'Use map view');

    const hero = h('div', { className: 'geo-filter-hero' },
      h('div', { className: 'geo-filter-hero-text' },
        h('div', { className: 'geo-filter-kicker' }, 'Bellingcat OSINT'),
        h('div', { className: 'geo-filter-title' }, 'Geo Locate'),
        h('div', { className: 'geo-filter-subtitle' },
          'Find OSM‑mapped clues and match them by proximity to narrow down locations.',
        ),
        h('div', { className: 'geo-filter-pills' },
          h('span', { className: 'geo-filter-pill' }, 'OSM'),
          h('span', { className: 'geo-filter-pill' }, 'Street‑level clues'),
          h('span', { className: 'geo-filter-pill' }, 'Multi‑feature match'),
        ),
      ),
      h('div', { className: 'geo-filter-hero-actions' }, useViewBtn, boundsEl),
    );

    const filtersEl = h('div', { className: 'geo-filter-grid' },
      ...FILTERS.map((filter) => {
        const active = this.selectedFilters.has(filter.type);
        return h('label', { className: `geo-filter-item ${active ? 'active' : ''}` },
          h('input', {
            type: 'checkbox',
            checked: active,
            onChange: () => this.toggleFilter(filter.type),
          }),
          h('span', { className: 'geo-filter-swatch', style: { background: FILTER_COLORS[filter.type] } }),
          h('span', { className: 'geo-filter-label' }, filter.label),
          h('span', { className: 'geo-filter-hint' }, filter.hint),
        );
      }),
    );

    const distanceInput = h('input', {
      type: 'range',
      min: '0',
      max: '10',
      step: '0.1',
      value: String(this.distanceKm),
      onInput: (e: Event) => {
        const value = Number((e.target as HTMLInputElement).value);
        this.distanceKm = value;
        this.render();
      },
    }) as HTMLInputElement;

    const distanceNumber = h('input', {
      type: 'number',
      min: '0',
      max: '20',
      step: '0.1',
      value: String(this.distanceKm),
      onChange: (e: Event) => {
        const value = Number((e.target as HTMLInputElement).value);
        if (!Number.isFinite(value)) return;
        this.distanceKm = Math.min(20, Math.max(0, value));
        this.render();
      },
    }) as HTMLInputElement;

    const anchorOptions = Array.from(this.selectedFilters);
    const anchorSelect = h('select', {
      className: 'geo-filter-anchor',
      onChange: (e: Event) => {
        const value = (e.target as HTMLSelectElement).value as GeoFilterType;
        this.anchorType = value || null;
      },
    },
    ...anchorOptions.map((type) =>
      h('option', { value: type, selected: type === this.anchorType }, this.formatType(type)),
    ),
    );

    const runBtn = h('button', {
      className: 'geo-filter-btn primary',
      disabled: this.loading,
      onClick: () => void this.runSearch(),
    }, this.loading ? 'Searching...' : 'Run search');

    const clearBtn = h('button', {
      className: 'geo-filter-btn subtle',
      onClick: () => this.clearResults(),
    }, 'Clear');

    const summary = this.renderSummary();

    replaceChildren(this.content,
      hero,
      h('div', { className: 'geo-filter-section' },
        h('div', { className: 'geo-filter-section-title' }, 'Filters'),
        filtersEl,
      ),
      h('div', { className: 'geo-filter-section' },
        h('div', { className: 'geo-filter-section-title' }, 'Distance match (km)'),
        h('div', { className: 'geo-filter-distance' }, distanceInput, distanceNumber),
        h('div', { className: 'geo-filter-anchor-row' },
          h('span', { className: 'geo-filter-anchor-label' }, 'Anchor'),
          anchorSelect,
        ),
      ),
      h('div', { className: 'geo-filter-actions' }, runBtn, clearBtn),
      summary,
    );
  }

  private renderSummary(): HTMLElement {
    const summary = h('div', { className: 'geo-filter-summary' });

    if (!Object.keys(this.lastCounts).length) {
      summary.textContent = 'Pick filters and run a search to see OSM matches.';
      return summary;
    }

    const items = Object.entries(this.lastCounts).map(([type, count]) =>
      h('div', { className: 'geo-filter-summary-item' },
        h('span', { className: 'geo-filter-swatch', style: { background: FILTER_COLORS[type as GeoFilterType] } }),
        h('span', { className: 'geo-filter-summary-label' }, this.formatType(type as GeoFilterType)),
        h('span', { className: 'geo-filter-summary-count' }, String(count)),
      ),
    );

    const matchCount = h('div', { className: 'geo-filter-summary-match' },
      `Matches: ${this.lastMatches.length}`,
    );

    const truncated = this.lastTruncated
      ? h('div', { className: 'geo-filter-warning' }, 'Result limit hit - zoom in for more detail.')
      : null;

    replaceChildren(summary, ...items, matchCount, ...(truncated ? [truncated] : []));
    return summary;
  }

  private toggleFilter(type: GeoFilterType): void {
    if (this.selectedFilters.has(type)) {
      this.selectedFilters.delete(type);
    } else {
      this.selectedFilters.add(type);
    }
    if (!this.anchorType || !this.selectedFilters.has(this.anchorType)) {
      this.anchorType = this.selectedFilters.values().next().value ?? null;
    }
    this.render();
  }

  private captureBounds(): void {
    const bounds = this.map?.getBounds() ?? null;
    if (!bounds) {
      this.lastBounds = null;
      this.render();
      return;
    }
    this.lastBounds = bounds;
    this.render();
  }

  private clearResults(): void {
    this.lastCounts = Object.create(null) as Record<GeoFilterType, number>;
    this.lastMatches = [];
    this.lastTruncated = false;
    this.map?.setGeoFilterResults([], []);
    this.render();
  }

  private async runSearch(): Promise<void> {
    if (this.loading) return;
    if (!this.selectedFilters.size) {
      this.clearResults();
      return;
    }

    if (!this.lastBounds) {
      this.captureBounds();
    }
    if (!this.lastBounds) return;

    this.loading = true;
    this.render();

    try {
      const bbox: [number, number, number, number] = [
        this.lastBounds.west,
        this.lastBounds.south,
        this.lastBounds.east,
        this.lastBounds.north,
      ];

      const filters = Array.from(this.selectedFilters);
      const { features, counts, truncated } = await fetchGeoFilterFeatures(bbox, filters);
      const matches = this.distanceKm > 0 && filters.length > 1
        ? this.computeMatches(features, filters, this.anchorType ?? filters[0]!, this.distanceKm)
        : [];

      this.lastCounts = counts;
      this.lastTruncated = truncated;
      this.lastMatches = matches;

      this.map?.setGeoFilterResults(features, matches);
      this.map?.setLayerEnabled('geoFilters', true);
    } catch (error) {
      console.warn('[GeoLocatePanel] search failed', error);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private computeMatches(
    features: GeoFilterFeature[],
    filters: GeoFilterType[],
    anchor: GeoFilterType,
    distanceKm: number,
  ): GeoFilterMatch[] {
    const byType = new Map<GeoFilterType, GeoFilterFeature[]>();
    for (const type of filters) byType.set(type, []);
    for (const feature of features) {
      const list = byType.get(feature.type);
      if (list) list.push(feature);
    }
    const anchorFeatures = byType.get(anchor) ?? [];
    const others = filters.filter((t) => t !== anchor);
    const matches: GeoFilterMatch[] = [];

    for (const feature of anchorFeatures) {
      let matched = true;
      let maxDistance = 0;
      for (const type of others) {
        const candidates = byType.get(type) ?? [];
        let nearest = Infinity;
        for (const candidate of candidates) {
          const dist = haversineDistanceKm(feature.lat, feature.lon, candidate.lat, candidate.lon);
          if (dist < nearest) nearest = dist;
        }
        if (!Number.isFinite(nearest) || nearest > distanceKm) {
          matched = false;
          break;
        }
        if (nearest > maxDistance) maxDistance = nearest;
      }
      if (matched) {
        matches.push({
          id: `match-${feature.id}`,
          lat: feature.lat,
          lon: feature.lon,
          anchorType: anchor,
          matchedTypes: others,
          distanceKm: Number.isFinite(maxDistance) ? maxDistance : distanceKm,
        });
      }
    }
    return matches;
  }

  private formatType(type: GeoFilterType): string {
    return FILTERS.find((f) => f.type === type)?.label ?? type;
  }
}
