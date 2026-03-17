import { createCircuitBreaker } from '@/utils';

const POLYMARKET_INTEL_PROXY_URL = '/api/polymarket-intel';

export interface PolymarketOpenMarket {
  id: string;
  question: string;
  slug: string;
  endDate?: string;
  createdAt?: string;
  volumeNum?: number;
  liquidityNum?: number;
  outcomes?: string[];
  outcomePrices?: number[];
  clobTokenIds?: string[];
}

export interface PolymarketTrade {
  conditionId: string;
  slug: string;
  title: string;
  outcome: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  wallet: string;
  marketLiquidity?: number | null;
  tradeNotional?: number | null;
  liquidityImpactPct?: number | null;
  liquidityImpactBps?: number | null;
}

export interface PolymarketOrderbook {
  tokenId: string;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  timestamp?: number;
}

export interface PolymarketTradeCluster {
  slug: string;
  title: string;
  tradeCount: number;
  notional: number;
  windowMinutes: number;
  wallets: number;
  largestTrade: number;
}

export interface PolymarketWalletSummary {
  wallet: string;
  tradeCount: number;
  notional: number;
  markets: number;
}

export interface PolymarketIntelSnapshot {
  markets: PolymarketOpenMarket[];
  trades: PolymarketTrade[];
  clusters: PolymarketTradeCluster[];
  wallets: PolymarketWalletSummary[];
  orderbooks: PolymarketOrderbook[];
  updatedAt: Date;
}

export interface PolymarketLiveTradesSnapshot {
  trades: PolymarketTrade[];
  clusters: PolymarketTradeCluster[];
  wallets: PolymarketWalletSummary[];
  updatedAt: Date;
}

const breaker = createCircuitBreaker<PolymarketIntelSnapshot>({
  name: 'Polymarket Intel',
  cacheTtlMs: 2 * 60 * 1000,
  persistCache: false,
});

const liveTradesBreaker = createCircuitBreaker<PolymarketLiveTradesSnapshot>({
  name: 'Polymarket Live Trades',
  cacheTtlMs: 30 * 1000,
  persistCache: false,
});

function parseJsonArray<T>(text: string): T[] {
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchJson(source: 'gamma' | 'data' | 'clob', path: string, params?: URLSearchParams): Promise<string> {
  const qs = new URLSearchParams(params);
  qs.set('source', source);
  qs.set('path', path);
  const url = `${POLYMARKET_INTEL_PROXY_URL}?${qs.toString()}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!resp.ok) {
    throw new Error(`Polymarket fetch failed: ${resp.status}`);
  }
  return resp.text();
}

function toNumberList(value?: string): number[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((v) => Number(v));
  } catch {
    return undefined;
  }
}

function toStringList(value?: string): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((v) => String(v));
  } catch {
    return undefined;
  }
}

function toFiniteNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function tradeNotional(trade: PolymarketTrade): number {
  if (typeof trade.tradeNotional === 'number' && Number.isFinite(trade.tradeNotional)) return trade.tradeNotional;
  return trade.size * trade.price;
}

async function fetchOpenMarkets(limit = 40): Promise<PolymarketOpenMarket[]> {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    order: 'createdAt',
    ascending: 'false',
    limit: String(limit),
  });
  const text = await fetchJson('gamma', '/markets', params);
  const raw = parseJsonArray<Record<string, string | number | boolean | null>>(text);
  return raw.map((m) => ({
    id: String(m.id ?? ''),
    question: String(m.question ?? ''),
    slug: String(m.slug ?? ''),
    endDate: typeof m.endDate === 'string' ? m.endDate : undefined,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : undefined,
    volumeNum: typeof m.volumeNum === 'number' ? m.volumeNum : Number(m.volumeNum ?? 0),
    liquidityNum: typeof m.liquidityNum === 'number' ? m.liquidityNum : Number(m.liquidityNum ?? 0),
    outcomes: typeof m.outcomes === 'string' ? toStringList(m.outcomes) : undefined,
    outcomePrices: typeof m.outcomePrices === 'string' ? toNumberList(m.outcomePrices) : undefined,
    clobTokenIds: typeof m.clobTokenIds === 'string' ? toStringList(m.clobTokenIds) : undefined,
  })).filter((m) => m.id && m.question);
}

async function fetchRecentTrades(limit = 200): Promise<PolymarketTrade[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const text = await fetchJson('data', '/trades', params);
  const raw = parseJsonArray<Record<string, unknown>>(text);
  return raw.map((t) => ({
    conditionId: String(t.conditionId ?? ''),
    slug: String(t.slug ?? ''),
    title: String(t.title ?? ''),
    outcome: String(t.outcome ?? ''),
    side: (String(t.side ?? 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
    size: Number(t.size ?? 0),
    price: Number(t.price ?? 0),
    timestamp: Number(t.timestamp ?? 0),
    wallet: String(t.proxyWallet ?? t.wallet ?? t.trader ?? ''),
  })).filter((t) => t.slug && t.timestamp);
}

async function fetchOrderbook(tokenId: string): Promise<PolymarketOrderbook | null> {
  const params = new URLSearchParams({ token_id: tokenId });
  const text = await fetchJson('clob', '/book', params);
  try {
    const data = JSON.parse(text) as { bids?: Array<{ price: string }>; asks?: Array<{ price: string }>; timestamp?: string };
    const bestBid = data.bids && data.bids.length > 0 ? Number(data.bids[0]?.price) : undefined;
    const bestAsk = data.asks && data.asks.length > 0 ? Number(data.asks[0]?.price) : undefined;
    const spread = bestBid != null && bestAsk != null ? Math.max(0, bestAsk - bestBid) : undefined;
    return {
      tokenId,
      bestBid,
      bestAsk,
      spread,
      timestamp: data.timestamp ? Number(data.timestamp) : undefined,
    };
  } catch {
    return null;
  }
}

function computeClusters(trades: PolymarketTrade[]): PolymarketTradeCluster[] {
  const bySlug = new Map<string, PolymarketTrade[]>();
  trades.forEach((t) => {
    const list = bySlug.get(t.slug) ?? [];
    list.push(t);
    bySlug.set(t.slug, list);
  });

  const clusters: PolymarketTradeCluster[] = [];
  for (const [slug, list] of bySlug) {
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    let windowStart = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      while (sorted[i] && sorted[windowStart] && sorted[i].timestamp - sorted[windowStart].timestamp > 15 * 60) {
        windowStart += 1;
      }
      const window = sorted.slice(windowStart, i + 1);
      if (window.length < 4) continue;
      const first = window[0];
      const last = window[window.length - 1];
      if (!first || !last) continue;
      const notional = window.reduce((sum, w) => sum + tradeNotional(w), 0);
      const wallets = new Set(window.map((w) => w.wallet)).size;
      const largestTrade = Math.max(...window.map((w) => tradeNotional(w)));
      clusters.push({
        slug,
        title: last.title,
        tradeCount: window.length,
        notional,
        wallets,
        largestTrade,
        windowMinutes: Math.round((last.timestamp - first.timestamp) / 60),
      });
      break;
    }
  }
  return clusters.sort((a, b) => b.notional - a.notional).slice(0, 12);
}

function computeWallets(trades: PolymarketTrade[]): PolymarketWalletSummary[] {
  const map = new Map<string, { tradeCount: number; notional: number; markets: Set<string> }>();
  trades.forEach((t) => {
    if (!t.wallet) return;
    const entry = map.get(t.wallet) ?? { tradeCount: 0, notional: 0, markets: new Set<string>() };
    entry.tradeCount += 1;
    entry.notional += tradeNotional(t);
    entry.markets.add(t.slug);
    map.set(t.wallet, entry);
  });
  return Array.from(map.entries())
    .map(([wallet, v]) => ({
      wallet,
      tradeCount: v.tradeCount,
      notional: v.notional,
      markets: v.markets.size,
    }))
    .sort((a, b) => b.notional - a.notional)
    .slice(0, 12);
}

export async function fetchPolymarketIntel(): Promise<PolymarketIntelSnapshot> {
  return breaker.execute(async () => {
    const [markets, rawTrades] = await Promise.all([
      fetchOpenMarkets(50),
      fetchRecentTrades(250),
    ]);

    const byCondition = new Map<string, PolymarketOpenMarket>();
    const bySlug = new Map<string, PolymarketOpenMarket>();
    for (const market of markets) {
      const conditionIds = Array.from(new Set([
        market.id,
        ...(market as unknown as { conditionId?: string }).conditionId ? [(market as unknown as { conditionId?: string }).conditionId as string] : [],
      ].filter(Boolean).map((v) => String(v))));
      conditionIds.forEach((id) => byCondition.set(id, market));
      if (market.slug) bySlug.set(market.slug, market);
    }

    const trades = rawTrades.map((trade) => {
      const market = byCondition.get(trade.conditionId) || bySlug.get(trade.slug);
      const liquidity = toFiniteNumber(
        market?.liquidityNum
          ?? (market as unknown as { liquidityClob?: number | string }).liquidityClob
          ?? (market as unknown as { liquidity?: number | string }).liquidity
          ?? trade.marketLiquidity
          ?? 0,
      );
      const notional = tradeNotional(trade);
      const liquidityImpactPct = liquidity > 0 ? (notional / liquidity) * 100 : null;
      return {
        ...trade,
        marketLiquidity: liquidity > 0 ? liquidity : null,
        tradeNotional: Number.isFinite(notional) ? notional : null,
        liquidityImpactPct,
        liquidityImpactBps: liquidityImpactPct == null ? null : liquidityImpactPct * 100,
      };
    });

    const clusters = computeClusters(trades);
    const wallets = computeWallets(trades);

    const topMarkets = markets
      .filter((m) => Array.isArray(m.clobTokenIds) && m.clobTokenIds.length > 0)
      .slice(0, 8);
    const tokenIds = topMarkets.flatMap((m) => m.clobTokenIds ?? []).slice(0, 16);
    const orderbooks = (await Promise.all(tokenIds.map((t) => fetchOrderbook(t))))
      .filter((o): o is PolymarketOrderbook => o != null);

    return {
      markets,
      trades,
      clusters,
      wallets,
      orderbooks,
      updatedAt: new Date(),
    };
  }, {
    markets: [],
    trades: [],
    clusters: [],
    wallets: [],
    orderbooks: [],
    updatedAt: new Date(0),
  });
}

export async function fetchPolymarketLiveTrades(limit = 250): Promise<PolymarketLiveTradesSnapshot> {
  return liveTradesBreaker.execute(async () => {
    const trades = await fetchRecentTrades(limit);
    const clusters = computeClusters(trades);
    const wallets = computeWallets(trades);
    return {
      trades,
      clusters,
      wallets,
      updatedAt: new Date(),
    };
  }, {
    trades: [],
    clusters: [],
    wallets: [],
    updatedAt: new Date(0),
  });
}
