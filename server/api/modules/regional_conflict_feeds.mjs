/**
 * Regional Conflict & Hotspot Feeds — area-specific coverage.
 * BBC Middle East, BBC Africa, Sahel, Latin America crime, India diplomacy.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'regional_conflict_feeds';
export const description = 'Regional conflict news — BBC Middle East, BBC Africa, Sahel/Wagner, Latin America cartels, India diplomacy. Hotspot-focused coverage.';

const FEEDS = [
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
  'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
  'https://news.google.com/rss/search?q=(Sahel+OR+Mali+OR+Niger+OR+"Burkina+Faso"+OR+Wagner)+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://insightcrime.org/feed/',
  'https://news.google.com/rss/search?q=India+diplomacy+foreign+policy+news&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(tariff+OR+"trade+war"+OR+"trade+deficit"+OR+sanctions)+when:2d&hl=en-US&gl=US&ceid=US:en',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 10);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 100),
    category: 'regional_conflict',
  });
  return { ...result, source: 'Regional Conflict feeds (8 sources)' };
}
