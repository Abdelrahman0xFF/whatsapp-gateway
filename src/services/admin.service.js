import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

class AdminService {
  constructor() {
    this.secretPath = path.resolve('./data/.admin_secret');
    this.adminKey = '';
    this.keySource = 'none'; // 'env' | 'gateway_env' | 'generated'
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

  init() {
    if (this.initialized) return;

    this._ensureStorage();

    // 1. Explicit ADMIN_API_KEY in environment
    if (ENV.ADMIN_API_KEY && ENV.ADMIN_API_KEY.trim()) {
      this.adminKey = ENV.ADMIN_API_KEY.trim();
      this.keySource = 'env';
      this.initialized = true;
      return;
    }

    // 2. Fallback to GATEWAY_API_KEY if present in environment
    if (ENV.GATEWAY_API_KEY && ENV.GATEWAY_API_KEY.trim()) {
      const firstKey = ENV.GATEWAY_API_KEY.split(',')[0].trim();
      if (firstKey) {
        this.adminKey = firstKey;
        this.keySource = 'gateway_env';
        this.initialized = true;
        return;
      }
    }

    // 3. Persistent auto-generated key stored in data directory
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
    } else if (this.keySource === 'gateway_env') {
      console.log(`🛡️  Master Admin Auth: ENABLED (Source: GATEWAY_API_KEY fallback)`);
    } else {
      console.log('------------------------------------------------------');
      console.log('🛡️  [SECURITY] Auto-generated Master Admin Key:');
      console.log(`👉 ${this.adminKey}`);
      console.log('Use this key to unlock the Web Cockpit and manage API tokens.');
      console.log(`Persisted to: ${this.secretPath}`);
      console.log('------------------------------------------------------');
    }

    if (ENV.ALLOWED_NUMBERS && ENV.ALLOWED_NUMBERS.length > 0) {
      console.log(`🛡️  Anti-Ban Safeguard: ACTIVE (${ENV.ALLOWED_NUMBERS.length} whitelisted number(s))`);
    } else {
      console.log(`⚠️  Anti-Ban Safeguard: OPEN (Set ALLOWED_NUMBERS in .env to prevent ban risk)`);
    }

    if (ENV.SAFE_MODE) {
      console.log(`🧪 Safe Mode (Sandbox): ACTIVE (Dispatches simulated; WhatsApp network protected)`);
    }
  }
}

export const adminService = new AdminService();
adminService.init();
