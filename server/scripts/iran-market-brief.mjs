#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);

function getArg(name, fallback = '') {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.valueOf()) ? date : null;
}

function isoDate(value) {
  const date = toDate(value);
  return date ? date.toISOString() : '';
}

function shortDate(value) {
  const date = toDate(value);
  if (!date) return 'n/a';
  return date.toISOString().replace('T', ' ').replace('.000Z', 'Z');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

function buildHeadlessUrl(baseUrl, modules, params) {
  const qs = new URLSearchParams();
  qs.set('modules', modules.join(','));
  qs.set('format', 'json');
  qs.set('params', JSON.stringify(params));
  return `${baseUrl.replace(/\/$/, '')}/api/headless?${qs.toString()}`;
}

const BASE_URL = getArg('--base', process.env.HEADLESS_BASE_URL || 'http://127.0.0.1:3000');
const DAYS = Number(getArg('--days', '7')) || 7;
const OUT_MD = getArg('--out-md', '');
const OUT_JSON = getArg('--out-json', '');

const PRIMARY_MARKET_SLUG = 'us-iran-nuclear-deal-by-march-31';
const MARKET_SLUGS = [
  PRIMARY_MARKET_SLUG,
  'iran-agrees-to-end-enrichment-of-uranium-by-march-31',
  'will-the-us-conduct-a-cyberattack-on-iran-by-march-31',
  'will-the-iranian-regime-fall-by-march-31',
];

const BACKGROUND_SOURCES = [
  {
    label: 'IAEA statement to the UN Security Council on the situation in Iran (June 20, 2025)',
    url: 'https://www.iaea.org/newscenter/pressreleases/statement-to-unsc-by-iaea-director-general-rafael-mariano-grossi-on-the-situation-in-iran',
  },
  {
    label: 'IAEA update on monitoring and verification in Iran (September 2025 archive reference)',
    url: 'https://www.iaea.org/topics/monitoring-and-verification-in-iran',
  },
  {
    label: 'U.S. Department of State main feed',
    url: 'https://www.state.gov/feed/',
  },
  {
    label: 'U.S. Department of Defense news RSS',
    url: 'https://www.defense.gov/News/News-Stories/RSS/',
  },
];

const THEATER_REGIONS = new Set([
  'Persian Gulf',
  'Arabian Sea',
  'Red Sea',
  'Eastern Mediterranean Sea',
]);

const FEEDS = [
  `https://news.google.com/rss/search?q=Iran%20Israel%20Trump%20Hormuz%20uranium%20when%3A${DAYS}d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=site%3Areuters.com%20Iran%20Israel%20when%3A${DAYS}d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=site%3Aapnews.com%20Iran%20Israel%20when%3A${DAYS}d&hl=en-US&gl=US&ceid=US:en`,
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://www.state.gov/feed/',
  'https://www.defense.gov/News/News-Stories/RSS/',
  'https://news.usni.org/feed',
];

const NEWS_KEYWORDS = [
  'iran',
  'israel',
  'tehran',
  'hormuz',
  'nuclear',
  'uranium',
  'enrichment',
  'ceasefire',
  'persian gulf',
  'arabian sea',
  'khamenei',
  'netanyahu',
  'trump',
  'rubio',
  'hegseth',
  'iaea',
  'irgc',
];

const ACTORS = [
  { id: 'iran-state', label: 'Iranian state', aliases: ['iran', 'tehran', 'iranian government', 'iranian regime'] },
  { id: 'khamenei', label: 'Khamenei / supreme leadership', aliases: ['khamenei', 'supreme leader'] },
  { id: 'irgc', label: 'IRGC', aliases: ['irgc', 'revolutionary guard'] },
  { id: 'israel-state', label: 'Israeli state', aliases: ['israel', 'israeli government', 'idf'] },
  { id: 'netanyahu', label: 'Netanyahu', aliases: ['netanyahu'] },
  { id: 'us-state', label: 'United States', aliases: ['united states', 'u.s.', 'us ', 'washington', 'trump administration'] },
  { id: 'trump', label: 'Trump', aliases: ['trump'] },
  { id: 'rubio', label: 'Rubio / State Department', aliases: ['rubio', 'state department'] },
  { id: 'hegseth', label: 'Hegseth / Pentagon', aliases: ['hegseth', 'pentagon', 'defense department'] },
  { id: 'saudi', label: 'Saudi Arabia', aliases: ['saudi', 'saudi arabia'] },
  { id: 'uae', label: 'UAE', aliases: ['uae', 'united arab emirates', 'dubai', 'abu dhabi'] },
  { id: 'qatar', label: 'Qatar', aliases: ['qatar'] },
  { id: 'iaea', label: 'IAEA', aliases: ['iaea', 'grossi'] },
  { id: 'hamas', label: 'Hamas', aliases: ['hamas'] },
  { id: 'hezbollah', label: 'Hezbollah', aliases: ['hezbollah'] },
  { id: 'houthis', label: 'Houthis', aliases: ['houthi', 'houthis'] },
];

function isRelevantNewsItem(item) {
  const haystack = `${item.title || ''} ${item.link || ''} ${item.source || ''}`.toLowerCase();
  return NEWS_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function extractActors(newsItems) {
  const actorStats = new Map();
  for (const actor of ACTORS) {
    actorStats.set(actor.id, { label: actor.label, count: 0, headlines: [] });
  }

  for (const item of newsItems) {
    const haystack = `${item.title || ''} ${item.source || ''}`.toLowerCase();
    for (const actor of ACTORS) {
      const matched = actor.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
      if (!matched) continue;
      const stat = actorStats.get(actor.id);
      stat.count += 1;
      if (stat.headlines.length < 3) stat.headlines.push(item.title);
    }
  }

  return Array.from(actorStats.values())
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function classifyTheme(title) {
  const text = title.toLowerCase();
  if (/(hormuz|gulf|shipping|escort|oil|port)/.test(text)) return 'Shipping and energy';
  if (/(deal|talks|ceasefire|diplomacy|enrichment|nuclear)/.test(text)) return 'Diplomacy and nuclear file';
  if (/(cyber|blackout|internet)/.test(text)) return 'Cyber and information control';
  if (/(regime|leader|supreme leader|khamenei|topple|protest)/.test(text)) return 'Regime stability';
  if (/(strike|missile|drone|attack|offensive|war)/.test(text)) return 'Kinetic conflict';
  return 'General conflict';
}

function summarizeThemes(newsItems) {
  const counts = new Map();
  for (const item of newsItems) {
    const theme = classifyTheme(item.title || '');
    counts.set(theme, (counts.get(theme) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}

async function fetchNewsSnapshot() {
  const url = buildHeadlessUrl(BASE_URL, ['news_rss'], {
    news_rss: {
      urls: FEEDS,
      limit_per_feed: 25,
      max_total: 250,
    },
  });
  const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
  const rawItems = data.modules?.news_rss?.data?.items || [];
  const relevantItems = dedupeBy(
    rawItems
      .filter((item) => item && item.title && !item.error)
      .filter(isRelevantNewsItem)
      .map((item) => ({
        ...item,
        pubDateIso: isoDate(item.pubDate),
      }))
      .sort((a, b) => (toDate(b.pubDate)?.valueOf() || 0) - (toDate(a.pubDate)?.valueOf() || 0)),
    (item) => `${slugify(item.title)}|${item.link}`,
  );
  return {
    feeds: FEEDS,
    items: relevantItems,
    actors: extractActors(relevantItems),
    themes: summarizeThemes(relevantItems),
  };
}

async function fetchRiskAndPosture() {
  const url = buildHeadlessUrl(BASE_URL, ['intelligence_risk_scores', 'military_usni'], {});
  const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
  const riskScores = data.modules?.intelligence_risk_scores?.data?.ciiScores || [];
  const riskRegions = ['IR', 'IL', 'SA', 'US'];
  const riskRows = riskScores.filter((row) => riskRegions.includes(row.region));

  const report = data.modules?.military_usni?.data?.report || {};
  const vessels = Array.isArray(report.vessels) ? report.vessels : [];
  const theaterAssets = vessels
    .filter((vessel) => THEATER_REGIONS.has(vessel.region))
    .map((vessel) => ({
      name: vessel.name,
      hullNumber: vessel.hullNumber,
      type: vessel.vesselType,
      region: vessel.region,
      status: vessel.deploymentStatus,
      articleUrl: vessel.articleUrl,
    }));

  return {
    riskRows,
    usniArticleUrl: report.articleUrl || '',
    usniArticleTitle: report.articleTitle || '',
    theaterAssets,
  };
}

async function fetchClobBook(tokenId) {
  if (!tokenId) return null;
  try {
    const data = await fetchJson(`https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`, {
      headers: { Accept: 'application/json' },
    });
    const bestBid = data.bids?.[0] ? Number(data.bids[0].price) : null;
    const bestAsk = data.asks?.[0] ? Number(data.asks[0].price) : null;
    return {
      bestBid,
      bestAsk,
      spread: bestBid != null && bestAsk != null ? +(bestAsk - bestBid).toFixed(4) : null,
    };
  } catch {
    return null;
  }
}

function parseJsonList(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function deriveMarketPrice(market, yesBook) {
  if (market.bestBid != null && market.bestAsk != null) {
    return {
      bestBid: Number(market.bestBid),
      bestAsk: Number(market.bestAsk),
      spread: +(Number(market.bestAsk) - Number(market.bestBid)).toFixed(4),
      source: 'gamma-clob-fields',
    };
  }
  if (yesBook?.bestBid != null && yesBook?.bestAsk != null && yesBook.bestAsk < 0.95) {
    return {
      ...yesBook,
      source: 'clob-book-endpoint',
    };
  }
  const outcomePrices = parseJsonList(market.outcomePrices, []);
  const midpoint = outcomePrices[0] != null ? Number(outcomePrices[0]) : Number(market.lastTradePrice || 0);
  return {
    bestBid: midpoint,
    bestAsk: midpoint,
    spread: 0,
    source: 'outcome-prices-fallback',
  };
}

function summarizeResolution(market) {
  switch (market.slug) {
    case 'us-iran-nuclear-deal-by-march-31':
      return [
        'Yes if the United States and Iran publicly announce an official agreement on Iranian nuclear research and/or weapons development by March 31, 2026 11:59 PM ET.',
        'A multilateral deal still qualifies if both the United States and Iran are parties.',
        'Official announcements are primary; overwhelming credible reporting can also qualify.',
      ];
    case 'iran-agrees-to-end-enrichment-of-uranium-by-march-31':
      return [
        'Yes only if Iran publicly agrees to end all uranium enrichment by March 31, 2026 11:59 PM ET.',
        'A unilateral pledge or a clause inside a broader deal qualifies.',
        'Partial caps or reduced enrichment levels do not qualify.',
      ];
    case 'will-the-us-conduct-a-cyberattack-on-iran-by-march-31':
      return [
        'Yes only if a U.S.-attributable cyber operation causes major disruption or damage to core Iranian national systems by March 31, 2026 11:59 PM ET.',
        'Operations tied directly to kinetic strikes do not qualify.',
        'Official acknowledgment or broad credible attribution is required.',
      ];
    case 'will-the-iranian-regime-fall-by-march-31':
      return [
        'Yes only if the Islamic Republic ceases to govern as the sovereign system by March 31, 2026 11:59 PM ET.',
        'Leadership succession or reforms do not qualify.',
        'A clear break in regime continuity is required.',
      ];
    default:
      return ['See linked market page for exact resolution terms.'];
  }
}

async function fetchMarkets() {
  const rows = [];
  for (const slug of MARKET_SLUGS) {
    const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&slug=${encodeURIComponent(slug)}`;
    const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
    const market = Array.isArray(data) ? data[0] : null;
    if (!market) continue;
    const tokenIds = parseJsonList(market.clobTokenIds, []);
    const yesBookRaw = await fetchClobBook(tokenIds[0]);
    const price = deriveMarketPrice(market, yesBookRaw);
    rows.push({
      slug: market.slug,
      question: String(market.question || '').trim(),
      id: market.id,
      url: `https://polymarket.com/event/${market.slug}`,
      endDate: market.endDate,
      volumeNum: Number(market.volumeNum || 0),
      liquidityNum: Number(market.liquidityNum || market.liquidityClob || 0),
      acceptingOrders: Boolean(market.acceptingOrders),
      outcomePrices: parseJsonList(market.outcomePrices, []),
      lastTradePrice: Number(market.lastTradePrice || 0),
      bestBid: price.bestBid,
      bestAsk: price.bestAsk,
      spread: price.spread,
      pricingSource: price.source,
      description: String(market.description || '').trim(),
      resolutionSummary: summarizeResolution(market),
    });
  }
  return rows.sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function buildMarkdown(snapshot) {
  const primaryMarket = snapshot.markets.find((market) => market.slug === PRIMARY_MARKET_SLUG) || snapshot.markets[0];
  const relatedMarkets = snapshot.markets.filter((market) => market.slug !== primaryMarket.slug);
  const topThemes = snapshot.news.themes.slice(0, 5);
  const topActors = snapshot.news.actors.slice(0, 10);
  const recentHeadlines = snapshot.news.items.slice(0, 18);
  const recentHeadlineCount = snapshot.news.items.filter((item) => {
    const published = toDate(item.pubDate);
    return published && (Date.now() - published.valueOf()) <= 72 * 60 * 60 * 1000;
  }).length;

  const lines = [];
  lines.push(`# MiroFish Seed Packet: Iran Conflict / Polymarket`);
  lines.push('');
  lines.push(`Generated at: ${snapshot.generatedAt}`);
  lines.push(`Source base: ${BASE_URL}`);
  lines.push('');
  lines.push('## Primary contract');
  lines.push('');
  lines.push(`- Market: ${primaryMarket.question}`);
  lines.push(`- URL: ${primaryMarket.url}`);
  lines.push(`- Deadline: ${shortDate(primaryMarket.endDate)} (Polymarket market end)`);
  lines.push(`- Implied Yes probability: ${pct(primaryMarket.bestAsk)}`);
  lines.push(`- Best bid / ask: ${pct(primaryMarket.bestBid)} / ${pct(primaryMarket.bestAsk)}`);
  lines.push(`- Liquidity / volume: $${primaryMarket.liquidityNum.toFixed(0)} / $${primaryMarket.volumeNum.toFixed(0)}`);
  lines.push(`- Pricing source: ${primaryMarket.pricingSource}`);
  lines.push('');
  lines.push('Resolution mapping for simulation:');
  for (const point of primaryMarket.resolutionSummary) {
    lines.push(`- ${point}`);
  }
  lines.push('');
  lines.push('## Related open markets');
  lines.push('');
  lines.push('| Market | Yes | Bid | Ask | End date |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const market of relatedMarkets) {
    lines.push(`| ${market.question} | ${pct(market.bestAsk)} | ${pct(market.bestBid)} | ${pct(market.bestAsk)} | ${shortDate(market.endDate)} |`);
  }
  lines.push('');
  lines.push('## Situation snapshot');
  lines.push('');
  lines.push(`- Relevant RSS headlines collected: ${snapshot.news.items.length}`);
  lines.push(`- Relevant headlines in the last 72 hours: ${recentHeadlineCount}`);
  lines.push(`- Official / defense feeds monitored: ${FEEDS.filter((feed) => /state\.gov|defense\.gov|usni/.test(feed)).length}`);
  lines.push(`- Theater military assets from USNI in Red Sea / Persian Gulf / Arabian Sea / East Med: ${snapshot.context.theaterAssets.length}`);
  lines.push('');
  if (topThemes.length) {
    lines.push('Dominant themes:');
    for (const theme of topThemes) {
      lines.push(`- ${theme.theme}: ${theme.count} headlines`);
    }
    lines.push('');
  }
  lines.push('## Actor map');
  lines.push('');
  for (const actor of topActors) {
    const examples = actor.headlines.slice(0, 2).join(' | ');
    lines.push(`- ${actor.label}: ${actor.count} headline hits${examples ? `; sample: ${examples}` : ''}`);
  }
  lines.push('');
  lines.push('## WorldOSINT monitoring signals');
  lines.push('');
  if (snapshot.context.riskRows.length) {
    lines.push('| Region | Combined risk | Static baseline | Dynamic score | Trend |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of snapshot.context.riskRows) {
      lines.push(`| ${row.region} | ${row.combinedScore} | ${row.staticBaseline} | ${row.dynamicScore} | ${row.trend.replace('TREND_DIRECTION_', '')} |`);
    }
    lines.push('');
  }
  if (snapshot.context.usniArticleUrl) {
    lines.push(`- USNI posture source: [${snapshot.context.usniArticleTitle}](${snapshot.context.usniArticleUrl})`);
  }
  for (const asset of snapshot.context.theaterAssets.slice(0, 12)) {
    lines.push(`- ${asset.name} (${asset.hullNumber || 'n/a'}, ${asset.type}) in ${asset.region}, status=${asset.status}`);
  }
  lines.push('');
  lines.push('## Historical context for the simulation');
  lines.push('');
  lines.push('- 2015: the JCPOA established limits on Iran enrichment in exchange for sanctions relief.');
  lines.push('- 2018: the United States withdrew from the JCPOA, and the nuclear file re-escalated over subsequent years.');
  lines.push('- 2025-06-20: IAEA Director General Grossi told the UN Security Council that more than 400 kg of uranium enriched up to 60% U-235 had to be accounted for after strikes and access disruptions at Iranian sites.');
  lines.push('- 2025-09-08: Grossi said restoring IAEA inspections in Iran would create promising ground for wider progress.');
  lines.push('- As of March 16, 2026 UTC, open-source reporting monitored here points to ongoing U.S.-Israel-Iran hostilities, Gulf shipping risk, and continued diplomacy speculation but no public evidence of a near-term formal nuclear agreement.');
  lines.push('');
  lines.push('## Recent headlines');
  lines.push('');
  for (const item of recentHeadlines) {
    lines.push(`- ${shortDate(item.pubDate)} | ${item.source || 'Unknown source'} | [${item.title}](${item.link})`);
  }
  lines.push('');
  lines.push('## MiroFish simulation brief');
  lines.push('');
  lines.push('Use this packet to simulate whether the primary contract resolves Yes before March 31, 2026 ET.');
  lines.push('');
  lines.push('Entity and actor coverage to model:');
  lines.push('- Iranian state leadership, IRGC, Atomic Energy Organization of Iran, foreign ministry, and domestic elite factions.');
  lines.push('- U.S. White House, State Department, Pentagon, CENTCOM, and sanction / negotiation channels.');
  lines.push('- Israeli government, war cabinet, IDF, and intelligence services.');
  lines.push('- IAEA, Gulf states (Saudi Arabia, UAE, Qatar), and major non-party mediators.');
  lines.push('- Non-state escalators and spoiler actors, especially Hezbollah, Houthis, and Hamas.');
  lines.push('');
  lines.push('Questions the simulation should answer:');
  lines.push('- What sequence of events could still produce an official U.S.-Iran nuclear agreement by March 31, 2026 ET?');
  lines.push('- What sequence could force Iran to publicly commit to end all uranium enrichment by that deadline?');
  lines.push('- Which escalation pathways make a diplomatic breakthrough even less likely?');
  lines.push('- What observable milestones would change the primary market from low-probability to live?');
  lines.push('');
  lines.push('Suggested scoring approach inside the simulation:');
  lines.push('- Base case: No agreement by deadline.');
  lines.push('- Diplomatic upside path: mediation, mutual public framework, enrichment concession, inspection restoration, sanctions language.');
  lines.push('- Escalation downside path: shipping disruption, widened strikes, leadership hardening, blackout / cyber escalation, no inspection restart.');
  lines.push('- Evidence threshold for Yes: a public official announcement or overwhelming credible reporting of an agreement.');
  lines.push('');
  lines.push('## Source notes');
  lines.push('');
  lines.push('- RSS feeds were fetched through the local WorldOSINT headless `news_rss` module.');
  lines.push('- Market metadata and top-of-book fields came from Polymarket gamma / CLOB-backed market fields using `closed=false` and `active=true` on exact slugs.');
  lines.push('- Background references to IAEA and State are included to ground the nuclear-file history and official context.');
  lines.push('');
  lines.push('Reference URLs:');
  for (const source of BACKGROUND_SOURCES) {
    lines.push(`- [${source.label}](${source.url})`);
  }
  for (const market of snapshot.markets) {
    lines.push(`- [Polymarket: ${market.question}](${market.url})`);
  }
  if (snapshot.context.usniArticleUrl) {
    lines.push(`- [USNI Fleet Tracker source](${snapshot.context.usniArticleUrl})`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const [news, context, markets] = await Promise.all([
    fetchNewsSnapshot(),
    fetchRiskAndPosture(),
    fetchMarkets(),
  ]);

  if (!markets.length) {
    throw new Error('No open Iran-related Polymarket markets were resolved from the configured slugs.');
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    news,
    context,
    markets,
  };

  const markdown = buildMarkdown(snapshot);

  if (OUT_JSON) {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2));
  }

  if (OUT_MD) {
    fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
    fs.writeFileSync(OUT_MD, markdown);
  } else {
    process.stdout.write(markdown);
  }

  if (OUT_MD) {
    process.stderr.write(`Wrote markdown brief to ${OUT_MD}\n`);
  }
  if (OUT_JSON) {
    process.stderr.write(`Wrote snapshot JSON to ${OUT_JSON}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
