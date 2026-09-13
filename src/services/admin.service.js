import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';
import { databaseService } from '../config/database.js';

class AdminService {
  constructor() {
    this.secretPath = path.resolve('./data/.admin_secret');
    this.adminKey = '';
    this.keySource = 'none'; // 'env' | 'generated'
    this.initialized = false;
  }

  _ensureStorage() {
    try {
      const dir = path.dirname(this.secretPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error('[AdminService] Failed to create data directory:', err.message);
    }
  }

  async init() {
    if (this.initialized) return;

    // 1. Explicit ADMIN_API_KEY in environment takes highest priority
    if (ENV.ADMIN_API_KEY && ENV.ADMIN_API_KEY.trim()) {
      this.adminKey = ENV.ADMIN_API_KEY.trim();
      this.keySource = 'env';
      this.initialized = true;
      return;
    }

    // 2. If MongoDB is connected, load or store in settings collection
    if (databaseService.isConnected()) {
      try {
        const col = databaseService.getCollection('settings');
        if (col) {
          const doc = await col.findOne({ _id: 'admin_secret' });
          if (doc && doc.value) {
            this.adminKey = doc.value;
            this.keySource = 'generated';
            this.initialized = true;
            return;
          }

          // Check if local file exists to migrate
          if (fs.existsSync(this.secretPath)) {
            const storedKey = fs.readFileSync(this.secretPath, 'utf-8').trim();
            if (storedKey) {
              await col.updateOne(
                { _id: 'admin_secret' },
                { $set: { value: storedKey, updatedAt: new Date() } },
                { upsert: true }
              );
              this.adminKey = storedKey;
              this.keySource = 'generated';
              this.initialized = true;
              return;
            }
          }

          // Generate a new secure random admin key
          const randomHex = crypto.randomBytes(24).toString('hex');
          const generatedKey = `adm_live_${randomHex}`;
          await col.updateOne(
            { _id: 'admin_secret' },
            { $set: { value: generatedKey, createdAt: new Date() } },
            { upsert: true }
          );

          // Also write locally as backup if possible
          this._ensureStorage();
          try {
            fs.writeFileSync(this.secretPath, generatedKey, { encoding: 'utf-8', mode: 0o600 });
          } catch {}

          this.adminKey = generatedKey;
          this.keySource = 'generated';
          this.initialized = true;
          return;
        }
      } catch (err) {
        console.error('[AdminService] Error checking admin key in MongoDB:', err.message);
      }
    }

    // 3. Fallback: Persistent auto-generated key stored in data directory
    this._ensureStorage();
    try {
      if (fs.existsSync(this.secretPath)) {
        const storedKey = fs.readFileSync(this.secretPath, 'utf-8').trim();
        if (storedKey) {
          this.adminKey = storedKey;
          this.keySource = 'generated';
          this.initialized = true;
          return;
        }
      }

      // Generate a new secure random admin key
      const randomHex = crypto.randomBytes(24).toString('hex');
      const generatedKey = `adm_live_${randomHex}`;
      fs.writeFileSync(this.secretPath, generatedKey, { encoding: 'utf-8', mode: 0o600 });
      this.adminKey = generatedKey;
      this.keySource = 'generated';
      this.initialized = true;
    } catch (err) {
      console.error('[AdminService] Error loading or generating admin secret:', err.message);
      this.adminKey = `adm_live_${crypto.randomBytes(24).toString('hex')}`;
      this.keySource = 'generated';
      this.initialized = true;
    }
  }

  getAdminKey() {
    if (!this.initialized) this.init();
    return this.adminKey;
  }

  getKeySource() {
    if (!this.initialized) this.init();
    return this.keySource;
  }

  getMaskedAdminKey() {
    const key = this.getAdminKey();
    if (!key || key.length <= 10) return '***';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }

  safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  validateAdminKey(candidateKey) {
    if (!candidateKey || typeof candidateKey !== 'string') return false;
    const expected = this.getAdminKey();
    if (!expected) return false;
    return this.safeCompare(expected, candidateKey.trim());
  }

  printStartupBanner() {
    if (!this.initialized) this.init();

    if (this.keySource === 'env') {
      console.log(`🛡️  Master Admin Auth: ENABLED (Source: ADMIN_API_KEY environment variable)`);
    } else {
      console.log('------------------------------------------------------');
      console.log('🛡️  [SECURITY] Auto-generated Master Admin Key:');
      console.log(`👉 ${this.adminKey}`);
      console.log('Use this key to unlock the Web Cockpit and manage API tokens.');
      if (databaseService.isConnected()) {
        console.log(`Persisted to: MongoDB collection "settings"`);
      } else {
        console.log(`Persisted to: ${this.secretPath}`);
      }
      console.log('------------------------------------------------------');
    }
  }
}

export const adminService = new AdminService();
adminService.init();
