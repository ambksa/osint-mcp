/**
 * Cyber Security News — investigative cybersecurity reporting.
 * Krebs on Security, The Hacker News, BleepingComputer, Ars Technica Security.
 */

import { fetchFeeds } from './_rss_helper.mjs';

export const name = 'cyber_news';
export const description = 'Cybersecurity news — Krebs on Security, The Hacker News, BleepingComputer, Ars Technica Security. Complements IOC tools (CISA KEV, ThreatFox, ransomware).';

const FEEDS = [
  'https://krebsonsecurity.com/feed/',
  'https://feeds.feedburner.com/TheHackersNews',
  'https://www.bleepingcomputer.com/feed/',
  'https://feeds.arstechnica.com/arstechnica/security',
];

export async function run(ctx, params) {
  const limit = Number(params.limit_per_feed ?? 10);
  const result = await fetchFeeds(ctx.origin, FEEDS, {
    limitPerFeed: limit,
    maxTotal: Number(params.max_total ?? 60),
    category: 'cyber_security',
  });
  return { ...result, source: 'Cyber Security news (4 sources)' };
}
