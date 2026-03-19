/**
 * Defense & Military Feeds — industry news, ops, force structure.
 * Defense News, Military Times, Breaking Defense, USNI, DefenseOne,
 * The War Zone, Task & Purpose, UK MOD, Defense.gov.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'defense_military_feeds';
export const description = 'Defense & military news — Defense News, Military Times, Breaking Defense, USNI, DefenseOne, The War Zone, Task & Purpose, UK MOD. 9 sources.';

const FEEDS = [
  'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml',
  'https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml',
  'https://breakingdefense.com/feed/',
  'https://news.usni.org/feed',
  'https://www.defenseone.com/rss/all/',
  'https://www.twz.com/feed',
  'https://taskandpurpose.com/feed/',
  'https://www.gov.uk/government/organisations/ministry-of-defence.atom',
  'https://www.defense.gov/News/News-Stories/RSS/',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 10);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 120),
    category: 'defense_military',
  });
  return { ...result, source: 'Defense & Military feeds (9 sources)' };
}
