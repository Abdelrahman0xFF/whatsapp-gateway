import { MongoClient } from 'mongodb';
import { databaseService } from './src/config/database.js';
import { ENV } from './src/config/env.js';
import { tokenService } from './src/services/token.service.js';
import { activityService } from './src/services/activity.service.js';
import { adminService } from './src/services/admin.service.js';
import { webhookService } from './src/services/webhook.service.js';
import { useMongoAuthState } from './src/config/mongoAuth.js';
import app from './src/app.js';

const TEST_MONGO_URI = 'mongodb://localhost:27017';
const TEST_DB_NAME = 'whatsapp_gateway_test_suite';

async function runMongoTests() {
  console.log('🧪 Starting WhatsApp Gateway MongoDB Integration Test Suite...\n');

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition, message) {
    testsTotal++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 0. Setup MongoDB environment overrides for test
  ENV.MONGODB_URI = `${TEST_MONGO_URI}/${TEST_DB_NAME}`;
  ENV.MONGODB_DB_NAME = TEST_DB_NAME;

  // Direct client for assertions and cleanup
  const directClient = new MongoClient(TEST_MONGO_URI);
  await directClient.connect();
  const directDb = directClient.db(TEST_DB_NAME);

  // Clean test DB before starting
  await directDb.dropDatabase();

  try {
    // 1. DatabaseService Connection
    const connResult = await databaseService.connect();
    assert(
      connResult.mode === 'mongodb' && connResult.connected && databaseService.isConnected(),
      'databaseService.connect() links successfully with MongoDB URI'
    );
    assert(
      databaseService.getDb().databaseName === TEST_DB_NAME,
      `databaseService connects to target database "${TEST_DB_NAME}"`
    );

    const storageInfo = databaseService.getStorageInfo();
    assert(
      storageInfo.type === 'mongodb' && storageInfo.status === 'connected',
      'getStorageInfo() correctly reports "mongodb" and "connected"'
    );

    // 2. TokenService MongoDB Persistence
    await tokenService.init();
    const testTokenName = 'Mongo Test Key';
    const generatedToken = tokenService.generateToken(testTokenName);
    assert(
      generatedToken.id && generatedToken.token.startsWith('wa_live_'),
      'tokenService.generateToken creates valid token'
    );
    await new Promise(r => setTimeout(r, 150));

    // Verify token exists directly in MongoDB 'tokens' collection
    const mongoTokenDoc = await directDb.collection('tokens').findOne({ _id: generatedToken.id });
    assert(
      mongoTokenDoc !== null && mongoTokenDoc.name === testTokenName && mongoTokenDoc.token === generatedToken.token,
      'Generated token is persisted directly into MongoDB "tokens" collection'
    );

    // Validate token and check lastUsedAt update
    const validation = tokenService.validateToken(generatedToken.token);
    assert(validation.valid === true, 'tokenService.validateToken validates token from MongoDB-backed store');

    // Revoke token and verify removal in MongoDB
    const revoked = tokenService.revokeToken(generatedToken.id);
    assert(revoked === true, 'tokenService.revokeToken returns true');
    await new Promise(r => setTimeout(r, 150));
    const revokedDoc = await directDb.collection('tokens').findOne({ _id: generatedToken.id });
    assert(revokedDoc === null, 'Revoked token is deleted from MongoDB "tokens" collection');

    // 3. ActivityService MongoDB Persistence
    await activityService.init();
    const loggedActivity = activityService.log({
      type: 'TEXT',
      recipient: '201012345678',
      status: 'SENT',
      messageId: 'msg_test_mongo_1',
      preview: 'Hello Mongo'
    });
    assert(loggedActivity.id.startsWith('act_'), 'activityService.log records new activity');
    await new Promise(r => setTimeout(r, 150));

    // Verify record in MongoDB
    const mongoActDoc = await directDb.collection('activities').findOne({ _id: loggedActivity.id });
    assert(
      mongoActDoc !== null && mongoActDoc.recipient === '201012345678' && mongoActDoc.status === 'SENT',
      'Activity entry is persisted into MongoDB "activities" collection'
    );

    // Activity deletion
    const deletedAct = activityService.deleteActivity(loggedActivity.id);
    assert(deletedAct === true, 'activityService.deleteActivity returns true');
    await new Promise(r => setTimeout(r, 150));
    const deletedDoc = await directDb.collection('activities').findOne({ _id: loggedActivity.id });
    assert(deletedDoc === null, 'Deleted activity is removed from MongoDB "activities" collection');

    // 4. AdminService MongoDB Persistence
    // Clear any cached adminKey in memory for test
    adminService.initialized = false;
    adminService.keySource = 'none';
    ENV.ADMIN_API_KEY = ''; // ensure it uses auto-generated key
    await adminService.init();
    const adminKey = adminService.getAdminKey();
    assert(adminKey.startsWith('adm_live_'), 'adminService generates secure admin key');

    const adminDoc = await directDb.collection('settings').findOne({ _id: 'admin_secret' });
    assert(
      adminDoc !== null && adminDoc.value === adminKey,
      'Auto-generated admin key is persisted to MongoDB "settings" collection'
    );

    // 5. WebhookService MongoDB Persistence
    const testWebhookUrl = 'https://webhook.site/test-mongo-endpoint';
    webhookService.setWebhookUrl(testWebhookUrl);
    assert(webhookService.getStatus().url === testWebhookUrl, 'webhookService.setWebhookUrl sets url in memory');
    await new Promise(r => setTimeout(r, 150));

    const webhookDoc = await directDb.collection('settings').findOne({ _id: 'webhook_config' });
    assert(
      webhookDoc !== null && webhookDoc.url === testWebhookUrl,
      'Webhook URL is persisted into MongoDB "settings" collection'
    );

    // 6. Baileys useMongoAuthState Adapter Test
    const authCollection = directDb.collection('baileys_auth');
    const mongoAuth = await useMongoAuthState(authCollection);

    assert(mongoAuth.state && mongoAuth.state.creds && mongoAuth.saveCreds, 'useMongoAuthState returns valid auth state and saveCreds');
    
    // Test creds saving
    mongoAuth.state.creds.me = { id: '201012345678:1@s.whatsapp.net', name: 'Test Bot' };
    await mongoAuth.saveCreds();

    const credsDoc = await authCollection.findOne({ _id: 'creds' });
    assert(credsDoc !== null && typeof credsDoc.data === 'string', 'WhatsApp credentials saved to MongoDB collection "baileys_auth"');

    // Test keys saving and retrieval
    const sampleKeyId = 'sample-123';
    await mongoAuth.state.keys.set({
      'session': {
        [sampleKeyId]: { foo: 'bar', timestamp: Date.now() }
      }
    });

    const retrievedKeys = await mongoAuth.state.keys.get('session', [sampleKeyId]);
    assert(
      retrievedKeys[sampleKeyId] && retrievedKeys[sampleKeyId].foo === 'bar',
      'Signal session key round-trip get/set via MongoDB succeeds'
    );

    // 7. HTTP API Health Endpoint reports MongoDB storage
    const testHttpPort = 7869;
    const testServer = await new Promise((resolve) => {
      const s = app.listen(testHttpPort, '127.0.0.1', () => resolve(s));
    });

    try {
      const healthRes = await fetch(`http://127.0.0.1:${testHttpPort}/api/health`);
      const healthData = await healthRes.json();
      assert(
        healthRes.status === 200 &&
        healthData.storage &&
        healthData.storage.type === 'mongodb' &&
        healthData.storage.status === 'connected',
        'GET /api/health dynamically reflects MongoDB storage mode'
      );
    } finally {
      await new Promise(r => testServer.close(r));
    }

    // 8. Disconnect and Fallback behavior
    await databaseService.disconnect();
    assert(!databaseService.isConnected(), 'databaseService.disconnect() terminates MongoDB connection cleanly');

    // Verify blank MONGODB_URI fallback
    ENV.MONGODB_URI = '';
    const fallbackResult = await databaseService.connect();
    assert(
      fallbackResult.mode === 'file' && fallbackResult.connected === false,
      'When MONGODB_URI is blank, databaseService seamlessly defaults to local file mode'
    );

    const fallbackStorage = databaseService.getStorageInfo();
    assert(
      fallbackStorage.type === 'file' && fallbackStorage.status === 'active',
      'Storage info correctly reports file storage active when MONGODB_URI is blank'
    );

  } finally {
    // Clean up test DB
    try {
      await directDb.dropDatabase();
      await directClient.close();
    } catch {}
  }

  console.log(`\n📊 MongoDB Test Results: ${testsPassed}/${testsTotal} tests passed!\n`);
  if (testsPassed !== testsTotal) {
    process.exitCode = 1;
  }
}

runMongoTests().catch(err => {
  console.error('💥 Test suite crashed:', err);
  process.exit(1);
});
