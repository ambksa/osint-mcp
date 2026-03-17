import { Panel } from './Panel';
import type { PredictionMarket } from '@/services/prediction';
import type { PolymarketIntelSnapshot, PolymarketTradeCluster, PolymarketWalletSummary, PolymarketTrade } from '@/services/polymarket-intel';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';

interface PolymarketAlertConfig {
  id: string;
  label: string;
  marketContains: string;
  walletContains: string;
  minNotional: number;
  minTrades: number;
  windowMinutes: number;
}

interface PolymarketAlertMatch {
  id: string;
  label: string;
  reason: string;
}

const ALERTS_STORAGE_KEY = 'worldmonitor-polymarket-alerts';

export class PredictionPanel extends Panel {
  private predictions: PredictionMarket[] = [];
  private intel: PolymarketIntelSnapshot | null = null;
  private alerts: PolymarketAlertConfig[] = this.loadAlerts();
  private expandedWallets = new Set<string>();
  private expandedClusters = new Set<string>();
  private handlersBound = false;

  constructor() {
    super({
      id: 'polymarket',
      title: t('panels.polymarket'),
      infoTooltip: t('components.prediction.infoTooltip'),
    });
    this.bindDelegatedHandlers();
  }

  private formatVolume(volume?: number): string {
    if (!volume) return '';
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  }

  private formatNotional(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  private tradeNotional(trade: PolymarketTrade): number {
    if (typeof trade.tradeNotional === 'number' && Number.isFinite(trade.tradeNotional)) return trade.tradeNotional;
    return trade.size * trade.price;
  }

  private loadAlerts(): PolymarketAlertConfig[] {
    try {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        id: String(item.id ?? crypto.randomUUID()),
        label: String(item.label ?? 'Alert'),
        marketContains: String(item.marketContains ?? ''),
        walletContains: String(item.walletContains ?? ''),
        minNotional: Number(item.minNotional ?? 0),
        minTrades: Number(item.minTrades ?? 0),
        windowMinutes: Number(item.windowMinutes ?? 15),
      }));
    } catch {
      return [];
    }
  }

  private saveAlerts(): void {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(this.alerts));
  }

  public renderPredictions(data: PredictionMarket[]): void {
    this.predictions = data;
    this.render();
  }

  public renderIntel(snapshot: PolymarketIntelSnapshot): void {
    this.intel = snapshot;
    this.render();
  }

  private render(): void {
    if (this.predictions.length === 0) {
      this.showError(t('common.failedPredictions'));
      return;
    }

    const marketsHtml = this.predictions
      .map((p) => {
        const yesPercent = Math.round(p.yesPrice);
        const noPercent = 100 - yesPercent;
        const volumeStr = this.formatVolume(p.volume);

        const safeUrl = sanitizeUrl(p.url || '');
        const titleHtml = safeUrl
          ? `<a href="${safeUrl}" target="_blank" rel="noopener" class="prediction-question prediction-link">${escapeHtml(p.title)}</a>`
          : `<div class="prediction-question">${escapeHtml(p.title)}</div>`;

        return `
      <div class="prediction-item">
        ${titleHtml}
        ${volumeStr ? `<div class="prediction-volume">${t('components.predictions.vol')}: ${volumeStr}</div>` : ''}
        <div class="prediction-bar">
          <div class="prediction-yes" style="width: ${yesPercent}%">
            <span class="prediction-label">${t('components.predictions.yes')} ${yesPercent}%</span>
          </div>
          <div class="prediction-no" style="width: ${noPercent}%">
            <span class="prediction-label">${t('components.predictions.no')} ${noPercent}%</span>
          </div>
        </div>
      </div>
    `;
      })
      .join('');

    const intel = this.intel;
    const tradesHtml = intel?.trades?.slice(0, 8).map((t) => this.renderTrade(t)).join('') ?? '';
    const clustersHtml = intel?.clusters?.slice(0, 6).map((c) => this.renderCluster(c, intel)).join('') ?? '';
    const walletsHtml = intel?.wallets?.slice(0, 6).map((w) => this.renderWallet(w, intel)).join('') ?? '';
    const triggered = intel ? this.computeAlertMatches(intel) : [];
    this.setNewBadge(triggered.length, triggered.length > 0);
    const alertsHtml = this.renderAlerts(triggered);

    const html = `
      <div class="prediction-section">
        <div class="prediction-section-title">Open markets</div>
        ${marketsHtml}
      </div>
      <div class="prediction-section">
        <div class="prediction-section-title">Insider monitor</div>
        ${intel ? `
          <div class="pm-intel-grid">
            <div>
              <div class="pm-intel-subtitle">Recent trades</div>
              ${tradesHtml || '<div class="pm-intel-empty">No recent trades.</div>'}
            </div>
            <div>
              <div class="pm-intel-subtitle">Trade clusters</div>
              ${clustersHtml || '<div class="pm-intel-empty">No clusters detected.</div>'}
            </div>
            <div>
              <div class="pm-intel-subtitle">Top wallets</div>
              ${walletsHtml || '<div class="pm-intel-empty">No wallet activity.</div>'}
            </div>
          </div>
        ` : '<div class="pm-intel-empty">Loading insider signals…</div>'}
        ${alertsHtml}
      </div>
    `;

    this.setContent(html);
  }

  private renderTrade(trade: PolymarketTrade): string {
    const notional = this.tradeNotional(trade);
    const when = new Date(trade.timestamp * 1000).toISOString().slice(11, 19);
    const liqImpact = (typeof trade.liquidityImpactPct === 'number' && Number.isFinite(trade.liquidityImpactPct))
      ? ` · impact ${trade.liquidityImpactPct >= 0.01 ? trade.liquidityImpactPct.toFixed(2) : '<0.01'}% liq`
      : '';
    return `
      <div class="pm-intel-item">
        <div class="pm-intel-title">${escapeHtml(trade.title)}</div>
        <div class="pm-intel-meta">${trade.side} ${escapeHtml(trade.outcome)} · ${this.formatNotional(notional)} · ${when}${liqImpact}</div>
      </div>
    `;
  }

  private renderCluster(cluster: PolymarketTradeCluster, intel: PolymarketIntelSnapshot): string {
    const key = encodeURIComponent(cluster.slug);
    const expanded = this.expandedClusters.has(cluster.slug);
    const details = expanded ? this.renderClusterDetails(cluster, intel) : '';
    return `
      <div class="pm-intel-item">
        <div class="pm-intel-title">${escapeHtml(cluster.title)}</div>
        <div class="pm-intel-meta">${this.formatNotional(cluster.notional)} · ${cluster.tradeCount} trades · ${cluster.wallets} wallets · ${cluster.windowMinutes}m</div>
        <div class="pm-intel-actions">
          <button class="pm-intel-expand" data-cluster="${key}">${expanded ? 'Hide details' : 'View details'}</button>
        </div>
        ${details}
      </div>
    `;
  }

  private renderWallet(wallet: PolymarketWalletSummary, intel: PolymarketIntelSnapshot): string {
    const shortWallet = wallet.wallet ? `${wallet.wallet.slice(0, 10)}…` : 'Unknown';
    const key = encodeURIComponent(wallet.wallet || '');
    const expanded = this.expandedWallets.has(wallet.wallet);
    const details = expanded ? this.renderWalletDetails(wallet, intel) : '';
    return `
      <div class="pm-intel-item">
        <div class="pm-intel-title">${escapeHtml(shortWallet)}</div>
        <div class="pm-intel-meta">${this.formatNotional(wallet.notional)} · ${wallet.tradeCount} trades · ${wallet.markets} markets</div>
        <div class="pm-intel-actions">
          <button class="pm-intel-expand" data-wallet="${key}">${expanded ? 'Hide details' : 'View details'}</button>
        </div>
        ${details}
      </div>
    `;
  }

  private renderWalletDetails(wallet: PolymarketWalletSummary, intel: PolymarketIntelSnapshot): string {
    const trades = intel.trades.filter((trade) => trade.wallet === wallet.wallet);
    const sorted = [...trades].sort((a, b) => b.timestamp - a.timestamp);
    const recent = sorted.slice(0, 8);
    const largest = trades.reduce((max, trade) => Math.max(max, this.tradeNotional(trade)), 0);
    const avg = trades.length ? trades.reduce((sum, t) => sum + this.tradeNotional(t), 0) / trades.length : 0;
    const lastTrade = sorted[0];
    const markets = Array.from(new Set(trades.map((t) => t.title))).slice(0, 3);
    const flags = this.computeInsiderFlags(trades);

    const flagsHtml = flags.length
      ? flags.map((flag) => `<div class="pm-intel-flag">• ${escapeHtml(flag)}</div>`).join('')
      : '<div class="pm-intel-flag">• No strong insider signals detected.</div>';

    const tradesHtml = recent.map((trade) => {
      const notional = this.tradeNotional(trade);
      const when = new Date(trade.timestamp * 1000).toISOString().slice(11, 19);
      return `
        <div class="pm-intel-detail-row">
          <div class="pm-intel-detail-title">${escapeHtml(trade.title)}</div>
          <div class="pm-intel-meta">${trade.side} ${escapeHtml(trade.outcome)} · ${this.formatNotional(notional)} · ${when}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="pm-intel-detail">
        <div class="pm-intel-metrics">
          <div>Total notional: ${this.formatNotional(wallet.notional)}</div>
          <div>Average trade: ${this.formatNotional(avg)}</div>
          <div>Largest trade: ${this.formatNotional(largest)}</div>
          ${lastTrade ? `<div>Last trade: ${new Date(lastTrade.timestamp * 1000).toISOString()}</div>` : ''}
          ${markets.length ? `<div>Top markets: ${markets.map(escapeHtml).join(', ')}</div>` : ''}
        </div>
        <div class="pm-intel-flags">
          <div class="pm-intel-subtitle">Why flagged</div>
          ${flagsHtml}
        </div>
        <div class="pm-intel-subtitle">Recent trades</div>
        ${tradesHtml || '<div class="pm-intel-empty">No recent trades.</div>'}
      </div>
    `;
  }

  private renderClusterDetails(cluster: PolymarketTradeCluster, intel: PolymarketIntelSnapshot): string {
    const clusterTrades = this.findClusterTrades(cluster, intel);
    const tradesHtml = clusterTrades.map((trade) => {
      const notional = this.tradeNotional(trade);
      const when = new Date(trade.timestamp * 1000).toISOString().slice(11, 19);
      const walletLabel = trade.wallet ? `${trade.wallet.slice(0, 10)}…` : 'Unknown';
      return `
        <div class="pm-intel-detail-row">
          <div class="pm-intel-detail-title">${escapeHtml(trade.title)}</div>
          <div class="pm-intel-meta">${walletLabel} · ${trade.side} ${escapeHtml(trade.outcome)} · ${this.formatNotional(notional)} · ${when}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="pm-intel-detail">
        <div class="pm-intel-metrics">
          <div>Cluster notional: ${this.formatNotional(cluster.notional)}</div>
          <div>Trades: ${cluster.tradeCount}</div>
          <div>Wallets: ${cluster.wallets}</div>
          <div>Window: ${cluster.windowMinutes}m</div>
        </div>
        <div class="pm-intel-subtitle">Cluster trades</div>
        ${tradesHtml || '<div class="pm-intel-empty">No trades available for this cluster.</div>'}
      </div>
    `;
  }

  private computeInsiderFlags(trades: PolymarketTrade[]): string[] {
    const flags: string[] = [];
    if (trades.length === 0) return flags;
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    const largestImpact = trades.reduce((max, trade) => Math.max(max, this.tradeNotional(trade)), 0);
    if (largestImpact >= 50_000) flags.push('Large single trade (>$50k).');

    let windowStart = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      while (sorted[i] && sorted[windowStart] && sorted[i].timestamp - sorted[windowStart].timestamp > 10 * 60) {
        windowStart += 1;
      }
      const window = sorted.slice(windowStart, i + 1);
      if (window.length >= 3) {
        flags.push('Rapid burst of trades within 10 minutes.');
        break;
      }
    }

    return flags;
  }

  private findClusterTrades(cluster: PolymarketTradeCluster, intel: PolymarketIntelSnapshot): PolymarketTrade[] {
    const trades = intel.trades.filter((trade) => trade.slug === cluster.slug);
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    let windowStart = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      while (sorted[i] && sorted[windowStart] && sorted[i].timestamp - sorted[windowStart].timestamp > 15 * 60) {
        windowStart += 1;
      }
      const window = sorted.slice(windowStart, i + 1);
      if (window.length >= 4) {
        return window;
      }
    }
    return sorted.slice(-cluster.tradeCount);
  }

  private renderAlerts(triggered: PolymarketAlertMatch[]): string {
    const listHtml = this.alerts.map((alert) => `
      <div class="pm-alert-row">
        <div>
          <div class="pm-alert-title">${escapeHtml(alert.label)}</div>
          <div class="pm-alert-meta">${alert.marketContains ? `Market: ${escapeHtml(alert.marketContains)} · ` : ''}${alert.walletContains ? `Wallet: ${escapeHtml(alert.walletContains)} · ` : ''}${alert.minNotional ? `Min ${this.formatNotional(alert.minNotional)} · ` : ''}${alert.minTrades ? `${alert.minTrades}+ trades · ` : ''}${alert.windowMinutes ? `${alert.windowMinutes}m` : ''}</div>
        </div>
        <button class="pm-alert-remove" data-alert-id="${alert.id}">Remove</button>
      </div>
    `).join('');

    const triggeredHtml = triggered.map((match) => `
      <div class="pm-alert-hit">
        <div class="pm-alert-title">${escapeHtml(match.label)}</div>
        <div class="pm-alert-meta">${escapeHtml(match.reason)}</div>
      </div>
    `).join('');

    return `
      <div class="pm-alerts">
        <div class="pm-intel-subtitle">Alerts</div>
        <div class="pm-alert-form">
          <input class="pm-alert-input" type="text" name="market" placeholder="Market contains (optional)" />
          <input class="pm-alert-input" type="text" name="wallet" placeholder="Wallet contains (optional)" />
          <input class="pm-alert-input" type="number" name="notional" min="0" placeholder="Min notional ($)" />
          <input class="pm-alert-input" type="number" name="trades" min="0" placeholder="Min trades" />
          <input class="pm-alert-input" type="number" name="window" min="1" value="15" placeholder="Window (min)" />
          <button class="pm-alert-add">Add alert</button>
        </div>
        ${listHtml || '<div class="pm-intel-empty">No alerts configured.</div>'}
        <div class="pm-alert-triggered">
          <div class="pm-intel-subtitle">Triggered</div>
          ${triggeredHtml || '<div class="pm-intel-empty">No alerts triggered.</div>'}
        </div>
      </div>
    `;
  }

  private computeAlertMatches(intel: PolymarketIntelSnapshot): PolymarketAlertMatch[] {
    const matches: PolymarketAlertMatch[] = [];
    for (const alert of this.alerts) {
      const marketNeedle = alert.marketContains.trim().toLowerCase();
      const walletNeedle = alert.walletContains.trim().toLowerCase();
      const clusterHit = intel.clusters.find((cluster) => {
        if (marketNeedle && !cluster.title.toLowerCase().includes(marketNeedle) && !cluster.slug.toLowerCase().includes(marketNeedle)) return false;
        if (alert.minNotional && cluster.notional < alert.minNotional) return false;
        if (alert.minTrades && cluster.tradeCount < alert.minTrades) return false;
        if (alert.windowMinutes && cluster.windowMinutes > alert.windowMinutes) return false;
        return true;
      });

      const tradeHit = intel.trades.find((trade) => {
        if (walletNeedle && !trade.wallet.toLowerCase().includes(walletNeedle)) return false;
        if (marketNeedle && !trade.title.toLowerCase().includes(marketNeedle) && !trade.slug.toLowerCase().includes(marketNeedle)) return false;
        const notional = this.tradeNotional(trade);
        if (alert.minNotional && notional < alert.minNotional) return false;
        return true;
      });

      if (clusterHit) {
        matches.push({
          id: alert.id,
          label: alert.label,
          reason: `Cluster ${this.formatNotional(clusterHit.notional)} · ${clusterHit.tradeCount} trades · ${clusterHit.windowMinutes}m`,
        });
      } else if (tradeHit) {
        matches.push({
          id: alert.id,
          label: alert.label,
          reason: `Trade ${this.formatNotional(this.tradeNotional(tradeHit))} · ${tradeHit.side} ${tradeHit.outcome}`,
        });
      }
    }
    return matches;
  }

  private bindDelegatedHandlers(): void {
    if (this.handlersBound) return;
    this.handlersBound = true;
    this.content.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.classList.contains('pm-intel-expand')) {
        const walletKey = target.dataset.wallet ? decodeURIComponent(target.dataset.wallet) : '';
        const clusterKey = target.dataset.cluster ? decodeURIComponent(target.dataset.cluster) : '';
        if (walletKey) {
          if (this.expandedWallets.has(walletKey)) {
            this.expandedWallets.delete(walletKey);
          } else {
            this.expandedWallets.add(walletKey);
          }
          this.render();
          return;
        }
        if (clusterKey) {
          if (this.expandedClusters.has(clusterKey)) {
            this.expandedClusters.delete(clusterKey);
          } else {
            this.expandedClusters.add(clusterKey);
          }
          this.render();
        }
        return;
      }

      if (target.classList.contains('pm-alert-add')) {
        const market = (this.content.querySelector<HTMLInputElement>('input[name="market"]')?.value ?? '').trim();
        const wallet = (this.content.querySelector<HTMLInputElement>('input[name="wallet"]')?.value ?? '').trim();
        const notional = Number(this.content.querySelector<HTMLInputElement>('input[name="notional"]')?.value ?? 0);
        const trades = Number(this.content.querySelector<HTMLInputElement>('input[name="trades"]')?.value ?? 0);
        const windowMinutes = Number(this.content.querySelector<HTMLInputElement>('input[name="window"]')?.value ?? 15);
        const label = market || wallet ? `${market || 'Any market'} · ${wallet || 'Any wallet'}` : 'Custom alert';
        this.alerts.push({
          id: crypto.randomUUID(),
          label,
          marketContains: market,
          walletContains: wallet,
          minNotional: isNaN(notional) ? 0 : notional,
          minTrades: isNaN(trades) ? 0 : trades,
          windowMinutes: isNaN(windowMinutes) ? 15 : windowMinutes,
        });
        this.saveAlerts();
        this.render();
        return;
      }

      if (target.classList.contains('pm-alert-remove')) {
        const id = target.dataset.alertId;
        if (!id) return;
        this.alerts = this.alerts.filter((alert) => alert.id !== id);
        this.saveAlerts();
        this.render();
      }
    });
  }
}
