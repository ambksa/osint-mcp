/**
 * Shared RSS fetch + parse helper for feed plugin modules.
 * Files starting with _ are skipped by the plugin loader.
 */

import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

/**
 * Fetch and parse multiple RSS/Atom feeds in parallel.
 * @param {string} origin - server origin for RSS proxy
 * @param {string[]} feeds - array of RSS feed URLs
 * @param {object} opts - { limitPerFeed, maxTotal, category }
 * @returns {{ items: object[], feedCount: number, errors: string[] }}
 */
export async function fetchFeeds(origin, feeds, opts = {}) {
  const limitPerFeed = opts.limitPerFeed || 15;
  const maxTotal = opts.maxTotal || 200;
  const category = opts.category || '';

  const promises = feeds.map(async (feedUrl) => {
    try {
      const proxied = `${origin}/api/rss-proxy?url=${encodeURIComponent(feedUrl)}`;
      const resp = await fetch(proxied, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return { items: [], error: `${feedUrl}: HTTP ${resp.status}` };
      const xml = await resp.text();
      const data = parser.parse(xml) || {};
      const channel = data.rss?.channel || data.channel;
      const channelTitle = channel?.title || data.feed?.title || '';
      const rawItems = channel?.item || data.feed?.entry || [];
      const list = Array.isArray(rawItems) ? rawItems : [rawItems].filter(Boolean);
      return {
        items: list.slice(0, limitPerFeed).map((item) => ({
          title: (item.title || '').replace(/[\x00-\x1f]/g, ' ').trim(),
          link: item.link?.['@_href'] || item.link?.href || item.link || item.guid || '',
          pubDate: item.pubDate || item.published || item.updated || '',
          description: ((item.description || item.summary || item.content || '').toString()).replace(/<[^>]*>/g, '').replace(/[\x00-\x1f]/g, ' ').slice(0, 300).trim(),
          source: channelTitle || '',
          category,
        })),
        error: null,
      };
    } catch (e) {
      return { items: [], error: `${feedUrl}: ${e.message}` };
    }
  });

  const settled = await Promise.allSettled(promises);
  const items = [];
  const errors = [];
  for (const s of settled) {
    const result = s.status === 'fulfilled' ? s.value : { items: [], error: s.reason?.message };
    if (result.error) errors.push(result.error);
    for (const item of result.items) {
      items.push(item);
      if (items.length >= maxTotal) break;
    }
    if (items.length >= maxTotal) break;
  }

  return { items, feedCount: feeds.length, feedErrors: errors.length, errors };
}
