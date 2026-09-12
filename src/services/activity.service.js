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
      this.flushSync();
    }, 500);
  }

  flushSync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.storagePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.activities, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmpPath, this.storagePath);
    } catch (err) {
      console.error('[ActivityService] Error saving activity:', err.message);
    }
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

  getActivities({ page = 1, limit = 10, type, status, search } = {}) {
    let filtered = [...this.activities];

    if (type && type !== 'ALL') {
      const targetType = type.toUpperCase();
      filtered = filtered.filter(a => (a.type || '').toUpperCase() === targetType);
    }

    if (status && status !== 'ALL') {
      const targetStatus = status.toUpperCase();
      filtered = filtered.filter(a => (a.status || '').toUpperCase() === targetStatus);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(a =>
        (a.recipient && String(a.recipient).toLowerCase().includes(q)) ||
        (a.preview && String(a.preview).toLowerCase().includes(q)) ||
        (a.error && String(a.error).toLowerCase().includes(q)) ||
        (a.messageId && String(a.messageId).toLowerCase().includes(q)) ||
        (a.type && String(a.type).toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const totalPages = Math.max(Math.ceil(total / parsedLimit), 1);
    const validPage = Math.min(parsedPage, totalPages);
    const startIndex = (validPage - 1) * parsedLimit;
    const paginated = filtered.slice(startIndex, startIndex + parsedLimit);

    return {
      activities: paginated,
      pagination: {
        page: validPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      }
    };
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

  deleteActivity(id) {
    const initialLen = this.activities.length;
    this.activities = this.activities.filter(a => a.id !== id);
    if (this.activities.length !== initialLen) {
      this._debouncedSave();
      return true;
    }
    return false;
  }

  clear() {
    this.activities = [];
    this._debouncedSave();
  }
}

export const activityService = new ActivityService();
