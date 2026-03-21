/**
 * Energy & Commodities News — oil, gas, OPEC, LNG, mining, metals.
 * Major gap in OSINT coverage — energy prices drive geopolitics.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'energy_commodities_news';
export const description = 'Energy & commodities news — oil/OPEC, natural gas/LNG, mining, metals, energy markets. Critical for supply chain and geopolitical analysis.';

const FEEDS = [
  'https://news.google.com/rss/search?q=(oil+price+OR+OPEC+OR+"natural+gas"+OR+"crude+oil"+OR+WTI+OR+Brent)+when:2d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(LNG+OR+"liquefied+natural+gas"+OR+pipeline+OR+"energy+security")+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(lithium+OR+"rare+earth"+OR+cobalt+OR+mining+OR+uranium)+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(gold+price+OR+silver+price+OR+copper+OR+platinum+OR+"precious+metals")+when:2d&hl=en-US&gl=US&ceid=US:en',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 12);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 60),
    category: 'energy_commodities',
  });
  return { ...result, source: 'Energy & Commodities news (4 sources)' };
}
