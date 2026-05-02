/**
 * alert.service.ts – Fix #8: Telegram & webhook alerts for the bot daemon.
 *
 * Usage:
 *   import { AlertService } from '@/lib/services/alert.service';
 *   const alerts = new AlertService({ telegramBotToken: '...', telegramChatId: '...' });
 *   await alerts.sendPositionOpen('BTCUSDT', 'long', 95000, 0.01);
 */

export interface AlertConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  webhookUrl?: string;
}

export class AlertService {
  private readonly token: string;
  private readonly chatId: string;
  private readonly webhookUrl: string;

  constructor(cfg: AlertConfig = {}) {
    this.token = cfg.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.chatId = cfg.telegramChatId ?? process.env.TELEGRAM_CHAT_ID ?? '';
    this.webhookUrl = cfg.webhookUrl ?? process.env.ALERT_WEBHOOK_URL ?? '';
  }

  // ─── Public event methods ─────────────────────────────────────────────────

  async sendPositionOpen(symbol: string, side: 'long' | 'short', price: number, size: number): Promise<void> {
    await this.send(
      `🟢 *OPEN ${side.toUpperCase()}*\nSymbol: \`${symbol}\`\nPrice: ${price}\nSize: ${size}`
    );
  }

  async sendPositionClose(
    symbol: string,
    side: 'long' | 'short',
    price: number,
    size: number,
    pnl: number,
    reason: string
  ): Promise<void> {
    const emoji = pnl >= 0 ? '✅' : '🔴';
    await this.send(
      `${emoji} *CLOSE ${side.toUpperCase()}* (${reason})\nSymbol: \`${symbol}\`\nPrice: ${price}\nSize: ${size}\nPnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} USDT`
    );
  }

  async sendSafetyStopTriggered(symbol: string, side: 'long' | 'short', stopPrice: number): Promise<void> {
    await this.send(
      `⛔ *SAFETY STOP TRIGGERED*\nSymbol: \`${symbol}\` ${side.toUpperCase()}\nStop price: ${stopPrice}`
    );
  }

  async sendDailyLimitReached(realizedPnl: number): Promise<void> {
    await this.send(
      `🚫 *DAILY LOSS LIMIT REACHED*\nRealized PnL today: ${realizedPnl.toFixed(4)} USDT\nTrading disabled until tomorrow UTC.`
    );
  }

  async sendError(context: string, error: string): Promise<void> {
    await this.send(`⚠️ *BOT ERROR* (${context})\n\`${error.slice(0, 300)}\``);
  }

  async sendInfo(message: string): Promise<void> {
    await this.send(`ℹ️ ${message}`);
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async send(text: string): Promise<void> {
    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendWebhook(text),
    ]);
  }

  private async sendTelegram(text: string): Promise<void> {
    if (!this.token || !this.chatId) return;

    try {
      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[AlertService] Telegram error ${res.status}: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[AlertService] Telegram send failed:', err instanceof Error ? err.message : err);
    }
  }

  private async sendWebhook(text: string): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ts: Date.now() }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[AlertService] Webhook error ${res.status}: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[AlertService] Webhook send failed:', err instanceof Error ? err.message : err);
    }
  }
}

// Singleton factory: reads from env by default
let _defaultInstance: AlertService | null = null;

export function getDefaultAlertService(): AlertService {
  if (!_defaultInstance) {
    _defaultInstance = new AlertService();
  }
  return _defaultInstance;
}
