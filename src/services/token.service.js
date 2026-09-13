import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { databaseService } from '../config/database.js';

class TokenService {
  constructor() {
    this.storagePath = path.resolve('./data/api_tokens.json');
    this.tokens = [];
    this.loaded = false;
    this.saveTimeout = null;
    this.pendingMongoUpdates = new Map();
    this.mongoUpdateTimeout = null;
  }

  _loadFromFile() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.storagePath)) {
        fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), 'utf-8');
        this.tokens = [];
      } else {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        this.tokens = JSON.parse(raw || '[]');
      }
      this.loaded = true;
    } catch (err) {
      console.error('[TokenService] Error loading tokens storage:', err.message);
      this.tokens = [];
    }
  }

  async _loadFromMongo() {
    try {
      const col = databaseService.getCollection('tokens');
      if (!col) return false;

      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      if (docs.length > 0) {
        this.tokens = docs.map(({ _id, ...token }) => ({ id: _id || token.id, ...token }));
        this.loaded = true;
        return true;
      }

      // Check migration from local file
      if (fs.existsSync(this.storagePath)) {
        try {
          const raw = fs.readFileSync(this.storagePath, 'utf-8');
          const localTokens = JSON.parse(raw || '[]');
          if (Array.isArray(localTokens) && localTokens.length > 0) {
            console.log(`🍃 Migrating ${localTokens.length} local API tokens into MongoDB...`);
            const ops = localTokens.map(t => ({
              updateOne: {
                filter: { _id: t.id },
                update: { $set: t },
                upsert: true
              }
            }));
            await col.bulkWrite(ops);
            this.tokens = localTokens;
            this.loaded = true;
            console.log('🍃 Local API tokens successfully migrated to MongoDB!');
            return true;
          }
        } catch (migErr) {
          console.warn('[TokenService] Migration warning:', migErr.message);
        }
      }

      this.tokens = [];
      this.loaded = true;
      return true;
    } catch (err) {
      console.error('[TokenService] Error loading tokens from MongoDB:', err.message);
      return false;
    }
  }

  _ensureStorage() {
    if (this.loaded) return;
    this._loadFromFile();
  }

  _debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this._saveStorage();
    }, 1000);
  }

  _debouncedMongoUpdate(id, lastUsedAt) {
    this.pendingMongoUpdates.set(id, lastUsedAt);
    if (this.mongoUpdateTimeout) clearTimeout(this.mongoUpdateTimeout);
    this.mongoUpdateTimeout = setTimeout(async () => {
      const col = databaseService.getCollection('tokens');
      if (!col || this.pendingMongoUpdates.size === 0) return;

      const entries = Array.from(this.pendingMongoUpdates.entries());
      this.pendingMongoUpdates.clear();

      try {
        const ops = entries.map(([tid, timestamp]) => ({
          updateOne: {
            filter: { _id: tid },
            update: { $set: { lastUsedAt: timestamp } }
          }
        }));
        await col.bulkWrite(ops, { ordered: false });
      } catch (err) {
        console.error('[TokenService] Error updating token lastUsedAt in MongoDB:', err.message);
      }
    }, 1000);
  }

  flushSync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (!databaseService.isConnected()) {
      this._saveStorage();
    }
  }

  _saveStorage() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.storagePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.tokens, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmpPath, this.storagePath);
    } catch (err) {
      console.error('[TokenService] Error saving tokens:', err.message);
    }
  }

  async init() {
    if (databaseService.isConnected()) {
      await this._loadFromMongo();
    } else {
      this._loadFromFile();
    }
  }

  listTokens(includeSecret = false) {
    if (!this.loaded) this._ensureStorage();
    return this.tokens.map(t => {
      const masked = t.token.length > 12 
        ? `${t.token.slice(0, 7)}...${t.token.slice(-4)}`
        : '***';
      return {
        id: t.id,
        name: t.name,
        token: includeSecret ? t.token : masked,
        maskedToken: masked,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        status: t.status,
        source: t.source || (databaseService.isConnected() ? 'mongodb' : 'file')
      };
    });
  }

  generateToken(name = 'API Key') {
    if (!this.loaded) this._ensureStorage();

    if (this.tokens.length >= 100) {
      throw new Error('Maximum token capacity reached (100 tokens). Please revoke unused tokens before creating new ones.');
    }

    const cleanName = (typeof name === 'string' ? name.trim().slice(0, 50) : '') || 'API Key';
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const token = `wa_live_${randomBytes}`;
    const id = `tok_${crypto.randomBytes(6).toString('hex')}`;

    const tokenObj = {
      id,
      name: cleanName,
      token,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      source: databaseService.isConnected() ? 'mongodb' : 'custom',
      status: 'active'
    };

    this.tokens.unshift(tokenObj);

    if (databaseService.isConnected()) {
      const col = databaseService.getCollection('tokens');
      if (col) {
        col.updateOne({ _id: tokenObj.id }, { $set: tokenObj }, { upsert: true }).catch(err => {
          console.error('[TokenService] MongoDB error saving token:', err.message);
        });
      }
    } else {
      this._saveStorage();
    }

    return {
      id: tokenObj.id,
      name: tokenObj.name,
      token: tokenObj.token,
      createdAt: tokenObj.createdAt,
      status: tokenObj.status
    };
  }

  revokeToken(id) {
    if (!this.loaded) this._ensureStorage();

    const index = this.tokens.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.tokens.splice(index, 1);

    if (databaseService.isConnected()) {
      const col = databaseService.getCollection('tokens');
      if (col) {
        col.deleteOne({ _id: id }).catch(err => {
          console.error('[TokenService] MongoDB error revoking token:', err.message);
        });
      }
    } else {
      this._saveStorage();
    }
    return true;
  }

  safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  validateToken(clientKey) {
    if (!this.loaded) this._ensureStorage();

    if (!clientKey) {
      return { valid: false, reason: 'Missing API key' };
    }

    // Check against active tokens in token store with timing-safe comparison
    for (const t of this.tokens) {
      if (t.status === 'active' && this.safeCompare(t.token, clientKey)) {
        t.lastUsedAt = new Date().toISOString();
        if (databaseService.isConnected()) {
          this._debouncedMongoUpdate(t.id, t.lastUsedAt);
        } else {
          this._debouncedSave();
        }
        return { valid: true, token: t };
      }
    }

    return { valid: false, reason: 'Invalid API key' };
  }

  hasKeys() {
    if (!this.loaded) this._ensureStorage();
    return this.tokens.some(t => t.status === 'active');
  }
}

export const tokenService = new TokenService();
tokenService._ensureStorage();
