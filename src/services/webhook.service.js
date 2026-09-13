import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';
import { databaseService } from '../config/database.js';

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

  async init() {
    if (databaseService.isConnected()) {
      try {
        const col = databaseService.getCollection('settings');
        if (col) {
          const doc = await col.findOne({ _id: 'webhook_config' });
          if (doc && doc.url !== undefined) {
            this.webhookUrl = doc.url;
            return;
          }

          // Check if local file exists to migrate
          if (fs.existsSync(this.storagePath)) {
            const raw = fs.readFileSync(this.storagePath, 'utf-8');
            const data = JSON.parse(raw || '{}');
            if (data.url !== undefined) {
              this.webhookUrl = data.url;
              await col.updateOne(
                { _id: 'webhook_config' },
                { $set: { url: this.webhookUrl, updatedAt: new Date() } },
                { upsert: true }
              );
              return;
            }
          }
        }
      } catch (err) {
        console.error('[WebhookService] Error loading webhook config from MongoDB:', err.message);
      }
    }
    this._load();
  }

  setWebhookUrl(url) {
    this.webhookUrl = url;

    if (databaseService.isConnected()) {
      try {
        const col = databaseService.getCollection('settings');
        if (col) {
          col.updateOne(
            { _id: 'webhook_config' },
            { $set: { url: this.webhookUrl, updatedAt: new Date() } },
            { upsert: true }
          ).catch(err => {
            console.error('[WebhookService] MongoDB save error:', err.message);
          });
        }
      } catch (err) {
        console.error('[WebhookService] Error saving webhook config to MongoDB:', err.message);
      }
    } else {
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
