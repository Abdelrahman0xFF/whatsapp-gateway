import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

class WebhookService {
  constructor() {
    this.webhookUrl = ENV.WEBHOOK_URL;
    this.secret = ENV.WEBHOOK_SECRET;
    this.deliveredCount = 0;
    this.failedCount = 0;
  }

  setWebhookUrl(url) {
    this.webhookUrl = url;
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
