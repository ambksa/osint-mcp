/**
 * Security & Intelligence Feeds — OSINT investigations, conflict analysis, geopolitics.
 * Bellingcat, Crisis Group, War on the Rocks, Oryx, Jamestown Foundation, Foreign Policy.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'security_intel_feeds';
export const description = 'Security & intelligence news — Bellingcat OSINT, Crisis Group conflict analysis, War on the Rocks defense essays, Oryx combat data, Jamestown Foundation, Foreign Policy.';

const FEEDS = [
  'https://www.bellingcat.com/feed/',
  'https://www.crisisgroup.org/rss',
  'https://warontherocks.com/feed/',
  'https://www.oryxspioenkop.com/feeds/posts/default?alt=rss',
  'https://jamestown.org/feed/',
  'https://foreignpolicy.com/feed/',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 10);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 100),
    category: 'security_intel',
  });
  return { ...result, source: 'Security & Intelligence feeds (6 sources)' };
}
