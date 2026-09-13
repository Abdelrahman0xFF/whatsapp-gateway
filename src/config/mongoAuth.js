import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import fs from 'node:fs';
import path from 'node:path';
import { ENV } from './env.js';

export async function useMongoAuthState(collection) {
  const writeData = async (data, id) => {
    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await collection.updateOne(
        { _id: id },
        { $set: { data: serialized, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[MongoAuth] Error writing ${id}:`, err.message);
    }
  };

  const readData = async (id) => {
    try {
      const doc = await collection.findOne({ _id: id });
      if (!doc || !doc.data) return null;
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch (err) {
      console.error(`[MongoAuth] Error reading ${id}:`, err.message);
      return null;
    }
  };

  const removeData = async (id) => {
    try {
      await collection.deleteOne({ _id: id });
    } catch (err) {
      console.error(`[MongoAuth] Error removing ${id}:`, err.message);
    }
  };

  let credsDoc = await readData('creds');
  if (!credsDoc) {
    const localCredsPath = path.join(path.resolve(ENV.SESSION_DATA_PATH), 'creds.json');
    if (fs.existsSync(localCredsPath)) {
      try {
        const authDir = path.dirname(localCredsPath);
        console.log(`🍃 Migrating local WhatsApp session credentials from "${authDir}" to MongoDB...`);
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(authDir, file), 'utf-8');
            const docId = file === 'creds.json' ? 'creds' : file.replace(/\.json$/, '');
            await collection.updateOne(
              { _id: docId },
              { $set: { data: raw, updatedAt: new Date() } },
              { upsert: true }
            );
          }
        }
        credsDoc = await readData('creds');
        console.log('🍃 Local WhatsApp credentials migrated to MongoDB successfully!');
      } catch (migErr) {
        console.warn('[MongoAuth] Session migration warning:', migErr.message);
      }
    }
  }

  const creds = credsDoc || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!ids || ids.length === 0) return data;

          try {
            const queryIds = ids.map(id => `${type}-${id}`);
            const docs = await collection.find({ _id: { $in: queryIds } }).toArray();
            const docMap = new Map();
            for (const doc of docs) {
              if (doc.data) {
                docMap.set(doc._id, JSON.parse(doc.data, BufferJSON.reviver));
              }
            }

            for (const id of ids) {
              const docId = `${type}-${id}`;
              let value = docMap.get(docId) || null;
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }
          } catch (err) {
            console.error('[MongoAuth] Error in keys.get:', err.message);
            for (const id of ids) {
              data[id] = null;
            }
          }
          return data;
        },
        set: async (data) => {
          const writes = [];
          const deletes = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const docId = `${category}-${id}`;
              if (value) {
                writes.push({
                  updateOne: {
                    filter: { _id: docId },
                    update: {
                      $set: {
                        data: JSON.stringify(value, BufferJSON.replacer),
                        updatedAt: new Date()
                      }
                    },
                    upsert: true
                  }
                });
              } else {
                deletes.push({
                  deleteOne: {
                    filter: { _id: docId }
                  }
                });
              }
            }
          }

          const operations = [...writes, ...deletes];
          if (operations.length > 0) {
            try {
              await collection.bulkWrite(operations, { ordered: false });
            } catch (err) {
              console.error('[MongoAuth] Error in keys.set bulkWrite:', err.message);
            }
          }
        }
      }
    },
    saveCreds: async () => {
      return writeData(creds, 'creds');
    }
  };
}
