import { MongoClient } from 'mongodb';
import dns from 'node:dns';
import { ENV } from './env.js';

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
    this.isConnecting = false;
  }

  isMongoEnabled() {
    return Boolean(ENV.MONGODB_URI && ENV.MONGODB_URI.trim());
  }

  isConnected() {
    return this.connected;
  }

  getDb() {
    return this.db;
  }

  getCollection(name) {
    if (!this.connected || !this.db) return null;
    return this.db.collection(name);
  }

  maskUri(uri) {
    if (!uri) return '';
    try {
      return uri.replace(/\/\/(.*?):(.*?)@/, '//$1:***@');
    } catch {
      return 'mongodb://***';
    }
  }

  async connect() {
    if (!this.isMongoEnabled()) {
      return { mode: 'file', connected: false };
    }

    if (this.connected) {
      return { mode: 'mongodb', connected: true, dbName: this.db?.databaseName };
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(r => setTimeout(r, 50));
      }
      return { mode: this.connected ? 'mongodb' : 'file', connected: this.connected, dbName: this.db?.databaseName };
    }

    this.isConnecting = true;
    const masked = this.maskUri(ENV.MONGODB_URI);
    console.log(`🍃 Linking with MongoDB: ${masked} ...`);

    try {
      this.client = new MongoClient(ENV.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });

      try {
        await this.client.connect();
      } catch (connErr) {
        // If local DNS fails to resolve SRV record (common on Windows with local stub DNS), retry using public DNS
        if (connErr.message && (connErr.message.includes('querySrv') || connErr.message.includes('ECONNREFUSED'))) {
          console.log('🌐 Local DNS failed to resolve MongoDB SRV record. Retrying with public DNS resolver...');
          dns.setServers(['8.8.8.8', '1.1.1.1']);
          await this.client.close().catch(() => {});
          this.client = new MongoClient(ENV.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
          });
          await this.client.connect();
        } else {
          throw connErr;
        }
      }

      const specifiedDbName = ENV.MONGODB_DB_NAME ? ENV.MONGODB_DB_NAME.trim() : undefined;
      this.db = this.client.db(specifiedDbName || undefined);
      this.connected = true;
      this.isConnecting = false;

      console.log(`🍃 Connected to MongoDB successfully! (Database: "${this.db.databaseName}")`);
      return { mode: 'mongodb', connected: true, dbName: this.db.databaseName };
    } catch (err) {
      this.connected = false;
      this.isConnecting = false;
      console.error(`❌ [MongoDB] Connection error: ${err.message}`);
      console.warn(`⚠️  Falling back to local file storage in "${ENV.SESSION_DATA_PATH}".`);
      return { mode: 'file', connected: false, error: err.message };
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        console.log('🍃 MongoDB connection closed.');
      } catch (err) {
        console.error('Error disconnecting MongoDB:', err.message);
      } finally {
        this.client = null;
        this.db = null;
        this.connected = false;
      }
    }
  }

  getStorageInfo(verbose = false) {
    if (this.connected && this.db) {
      return {
        type: 'mongodb',
        status: 'connected',
        ...(verbose
          ? {
              database: this.db.databaseName,
              uri: this.maskUri(ENV.MONGODB_URI)
            }
          : {})
      };
    }
    if (this.isMongoEnabled()) {
      return {
        type: 'mongodb',
        status: 'disconnected_fallback_file',
        ...(verbose ? { path: ENV.SESSION_DATA_PATH } : {})
      };
    }
    return {
      type: 'file',
      status: 'active',
      ...(verbose ? { path: ENV.SESSION_DATA_PATH } : {})
    };
  }
}

export const databaseService = new DatabaseService();
