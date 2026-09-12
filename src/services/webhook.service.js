import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

class WebhookService {
  constructor() {
    this.storagePath = path.resolve('./data/webhook_config.json');
    this.webhookUrl = ENV.WEBHOOK_URL;
    this.secret = ENV.WEBHOOK_SECRET;
    this.deliveredCount = 0;
    this.failedCount = 0;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const data = JSON.parse(raw || '{}');
        if (data.url !== undefined) {
          this.webhookUrl = data.url;
        }
      }
    } catch (err) {
      console.error('[WebhookService] Error loading webhook config:', err.message);
    }
  }

  setWebhookUrl(url) {
    this.webhookUrl = url;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify({ url: this.webhookUrl }, null, 2), 'utf-8');
    } catch (err) {
      console.error('[WebhookService] Error saving webhook config:', err.message);
    }
  }

  getStatus() {
    return {
      enabled: Boolean(this.webhookUrl),
      url: this.webhookUrl || null,
      deliveredCount: this.deliveredCount,
      failedCount: this.failedCount
    };
  }

  async dispatch(event, data) {
    if (!this.webhookUrl) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    const payloadString = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsApp-REST-Gateway/2.0'
    };

    if (this.secret) {
      const hmac = crypto.createHmac('sha256', this.secret).update(payloadString).digest('hex');
      headers['X-Hub-Signature-256'] = `sha256=${hmac}`;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        this.deliveredCount++;
      } else {
        this.failedCount++;
        console.warn(`[WebhookService] Delivery to ${this.webhookUrl} failed with status: ${response.status}`);
      }
    } catch (err) {
      this.failedCount++;
      console.warn(`[WebhookService] Delivery error: ${err.message}`);
    }
  }
}

export const webhookService = new WebhookService();
