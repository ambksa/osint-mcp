/**
 * Policy & Think Tank Feeds — strategic analysis from major research institutions.
 * CSIS, Arms Control Association, FAS, Bulletin of Atomic Scientists, MEI, Brookings.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'policy_feeds';
export const description = 'Policy & think tank analysis — CSIS, Arms Control Association, Federation of American Scientists, Bulletin of Atomic Scientists, Middle East Institute, Brookings. Strategic/nuclear/regional analysis.';

const FEEDS = [
  'https://news.google.com/rss/search?q=site:csis.org+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:armscontrol.org+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:fas.org+nuclear+weapons+security&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:thebulletin.org+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:mei.edu+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:brookings.edu+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:carnegieendowment.org+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:chathamhouse.org+when:7d&hl=en-US&gl=US&ceid=US:en',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 8);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 80),
    category: 'policy_analysis',
  });
  return { ...result, source: 'Policy & Think Tank feeds (8 sources)' };
}
