import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import type { PolymarketIntelSnapshot } from '@/services/polymarket-intel';

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatNotional(value: number): string {
  return `$${formatNumber(value)}`;
}

export class PolymarketIntelPanel extends Panel {
  private snapshot: PolymarketIntelSnapshot | null = null;

  constructor() {
    super({
      id: 'polymarket-intel',
      title: t('panels.polymarketIntel') || 'Polymarket Intel',
      infoTooltip: t('components.polymarketIntel.infoTooltip') || 'Open markets, recent trades, and trade clusters from Polymarket public APIs.',
    });
  }

  public renderIntel(snapshot: PolymarketIntelSnapshot): void {
    this.snapshot = snapshot;
    this.render();
  }

  private render(): void {
    if (!this.snapshot) {
      this.showLoading();
      return;
    }

    const marketsHtml = this.snapshot.markets.slice(0, 12).map((m) => {
      const price = Array.isArray(m.outcomePrices) ? `${(m.outcomePrices[0] ?? 0).toFixed(2)}` : '?';
      const volume = m.volumeNum ? formatNotional(m.volumeNum) : '';
      const endDate = m.endDate ? new Date(m.endDate).toISOString().slice(0, 10) : '';
      const url = m.slug ? `https://polymarket.com/market/${m.slug}` : '';
      const safeUrl = sanitizeUrl(url);
      const titleHtml = safeUrl
        ? `<a class="pm-intel-link" href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(m.question)}</a>`
        : `<span class="pm-intel-title">${escapeHtml(m.question)}</span>`;
      return `
        <div class="pm-intel-item">
          ${titleHtml}
          <div class="pm-intel-meta">${volume ? `${volume} · ` : ''}Yes ${price}${endDate ? ` · ${endDate}` : ''}</div>
        </div>
      `;
    }).join('');

    const tradesHtml = this.snapshot.trades.slice(0, 10).map((t) => {
      const notional = (typeof t.tradeNotional === 'number' && Number.isFinite(t.tradeNotional))
        ? t.tradeNotional
        : t.size * t.price;
      const when = new Date(t.timestamp * 1000).toISOString().slice(11, 19);
      const liqImpact = (typeof t.liquidityImpactPct === 'number' && Number.isFinite(t.liquidityImpactPct))
        ? ` · Liq impact ${t.liquidityImpactPct >= 0.01 ? t.liquidityImpactPct.toFixed(2) : '<0.01'}%`
        : '';
      return `
        <div class="pm-intel-item">
          <div class="pm-intel-title">${escapeHtml(t.title)}</div>
          <div class="pm-intel-meta">${t.side} ${escapeHtml(t.outcome)} · ${formatNotional(notional)} · ${when}${liqImpact}</div>
        </div>
      `;
    }).join('');

    const clustersHtml = this.snapshot.clusters.map((c) => `
      <div class="pm-intel-item">
        <div class="pm-intel-title">${escapeHtml(c.title)}</div>
        <div class="pm-intel-meta">${formatNotional(c.notional)} · ${c.tradeCount} trades · ${c.wallets} wallets · ${c.windowMinutes}m</div>
      </div>
    `).join('');

    const walletsHtml = this.snapshot.wallets.map((w) => `
      <div class="pm-intel-item">
        <div class="pm-intel-title">${escapeHtml(w.wallet.slice(0, 10))}</div>
        <div class="pm-intel-meta">${formatNotional(w.notional)} · ${w.tradeCount} trades · ${w.markets} markets</div>
      </div>
    `).join('');

    const html = `
      <div class="pm-intel-section">
        <div class="pm-intel-section-title">Open markets</div>
        ${marketsHtml || '<div class="pm-intel-empty">No markets.</div>'}
      </div>
      <div class="pm-intel-section">
        <div class="pm-intel-section-title">Recent trades</div>
        ${tradesHtml || '<div class="pm-intel-empty">No trades.</div>'}
      </div>
      <div class="pm-intel-section">
        <div class="pm-intel-section-title">Trade clusters</div>
        ${clustersHtml || '<div class="pm-intel-empty">No clusters.</div>'}
      </div>
      <div class="pm-intel-section">
        <div class="pm-intel-section-title">Top wallets</div>
        ${walletsHtml || '<div class="pm-intel-empty">No wallet activity.</div>'}
      </div>
    `;

    this.setContent(html);
  }
}
