import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

class TokenService {
  constructor() {
    this.storagePath = path.resolve('./data/api_tokens.json');
    this.tokens = [];
    this.loaded = false;
    this.saveTimeout = null;
  }

  _ensureStorage() {
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

  _debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this._saveStorage();
    }, 1000);
  }

  flushSync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this._saveStorage();
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

  init() {
    this._ensureStorage();
  }

  listTokens(includeSecret = false) {
    if (!this.loaded) this.init();
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
        source: t.source || 'db'
      };
    });
  }

  generateToken(name = 'API Key') {
    if (!this.loaded) this.init();

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
      source: 'custom',
      status: 'active'
    };

    this.tokens.unshift(tokenObj);
    this._saveStorage();

    return {
      id: tokenObj.id,
      name: tokenObj.name,
      token: tokenObj.token,
      createdAt: tokenObj.createdAt,
      status: tokenObj.status
    };
  }

  revokeToken(id) {
    if (!this.loaded) this.init();

    const index = this.tokens.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.tokens.splice(index, 1);
    this._saveStorage();
    return true;
  }

  safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  validateToken(clientKey) {
    if (!this.loaded) this.init();

    if (!clientKey) {
      return { valid: false, reason: 'Missing API key' };
    }

    // Check against active tokens in token store with timing-safe comparison
    for (const t of this.tokens) {
      if (t.status === 'active' && this.safeCompare(t.token, clientKey)) {
        t.lastUsedAt = new Date().toISOString();
        this._debouncedSave();
        return { valid: true, token: t };
      }
    }

    return { valid: false, reason: 'Invalid API key' };
  }

  hasKeys() {
    if (!this.loaded) this.init();
    return this.tokens.some(t => t.status === 'active');
  }
}

export const tokenService = new TokenService();
tokenService.init();
