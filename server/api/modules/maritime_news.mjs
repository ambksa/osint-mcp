/**
 * Maritime & Shipping News — naval, shipping, port, chokepoint reporting.
 * gCaptain, maritime Google News.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'maritime_news';
export const description = 'Maritime & shipping news — gCaptain, Lloyd\'s List, shipping industry. Covers port congestion, piracy, chokepoint disruptions, naval ops.';

const FEEDS = [
  'https://gcaptain.com/feed/',
  'https://news.google.com/rss/search?q=maritime+shipping+port+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(Suez+OR+Panama+Canal+OR+Hormuz+OR+piracy+OR+Houthi+shipping)+when:7d&hl=en-US&gl=US&ceid=US:en',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 15);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 60),
    category: 'maritime',
  });
  return { ...result, source: 'Maritime & Shipping news (3 sources)' };
}
