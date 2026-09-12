import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

class ActivityService {
  constructor() {
    this.storagePath = path.resolve('./data/activity_log.json');
    this.maxRecords = 100;
    this.activities = [];
    this.saveTimeout = null;
    this._load();
  }

  _load() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        this.activities = JSON.parse(raw || '[]');
      }
    } catch (err) {
      console.error('[ActivityService] Error loading activity storage:', err.message);
      this.activities = [];
    }
  }

  _debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const tmpPath = `${this.storagePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(this.activities, null, 2), 'utf-8');
        fs.renameSync(tmpPath, this.storagePath);
      } catch (err) {
        console.error('[ActivityService] Error saving activity:', err.message);
      }
    }, 500);
  }

  log({ type, recipient, status, messageId, preview, error, durationMs }) {
    const entry = {
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      type: type || 'TEXT',
      recipient: recipient ? String(recipient) : null,
      status: status || 'PENDING',
      messageId: messageId || null,
      preview: preview ? String(preview).slice(0, 100) : null,
      error: error || null,
      durationMs: durationMs || null
    };

    this.activities.unshift(entry);
    if (this.activities.length > this.maxRecords) {
      this.activities = this.activities.slice(0, this.maxRecords);
    }

    this._debouncedSave();
    return entry;
  }

  getActivities(limit = 50) {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    return this.activities.slice(0, parsedLimit);
  }

  getStats() {
    const total = this.activities.length;
    const sent = this.activities.filter(a => a.status === 'SENT' || a.status === 'SUCCESS' || a.status === 'VERIFIED').length;
    const failed = this.activities.filter(a => a.status === 'FAILED').length;
    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? `${Math.round((sent / total) * 100)}%` : '100%'
    };
  }

  clear() {
    this.activities = [];
    this._debouncedSave();
  }
}

export const activityService = new ActivityService();
