import app from './src/app.js';
import { ENV } from './src/config/env.js';

const TEST_PORT = 7865;

async function runTests() {
  console.log('🧪 Starting WhatsApp REST Gateway Test Suite...\n');

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, '127.0.0.1', () => resolve(s));
  });

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

  try {
    const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /api/health returns 200 OK');

    // 2. Web UI dashboard serves
    const webRes = await fetch(`${baseUrl}/`);
    const webHtml = await webRes.text();
    assert(webRes.status === 200 && webHtml.includes('WhatsApp REST Gateway'), 'GET / serves Web Dashboard HTML');

    // 3. Token Generation & Management
    const genTokenRes = await fetch(`${baseUrl}/api/tokens/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Test Key' })
    });
    const genTokenData = await genTokenRes.json();
    assert(
      genTokenRes.status === 201 && genTokenData.success && genTokenData.data.token.startsWith('wa_live_'),
      'POST /api/tokens/generate creates secure wa_live_ token'
    );
    const createdToken = genTokenData.data.token;
    const createdTokenId = genTokenData.data.id;

    // 4. Token Listing
    const listTokenRes = await fetch(`${baseUrl}/api/tokens`);
    const listTokenData = await listTokenRes.json();
    assert(
      listTokenRes.status === 200 && listTokenData.count >= 1 && listTokenData.hasKeys === true,
      'GET /api/tokens lists active tokens with masked secrets'
    );

    const testAuthHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': createdToken
    };

    // 5. Auth Middleware with valid token
    const invalidSendRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: testAuthHeaders,
      body: JSON.stringify({ message: 'Hello' })
    });
    const invalidSendData = await invalidSendRes.json();
    assert(
      invalidSendRes.status === 400 && invalidSendData.success === false,
      'POST /api/messages/send accepts valid token and validates phone number'
    );

    // 6. Auth Middleware with invalid token
    const badKeyRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'invalid_secret_key' },
      body: JSON.stringify({ number: '201012345678', message: 'Hello' })
    });
    assert(badKeyRes.status === 403, 'POST /api/messages/send rejects invalid token with 403 Forbidden');

    // 7. Media Messaging validation
    const mediaRes = await fetch(`${baseUrl}/api/messages/send-media`, {
      method: 'POST',
      headers: testAuthHeaders,
      body: JSON.stringify({ number: '201012345678' })
    });
    const mediaData = await mediaRes.json();
    assert(
      mediaRes.status === 400 && mediaData.error.includes('Either "mediaUrl" or "mediaBase64"'),
      'POST /api/messages/send-media validates required mediaUrl/mediaBase64'
    );

    // 8. OTP Endpoint validation
    const otpRes = await fetch(`${baseUrl}/api/otp/send`, {
      method: 'POST',
      headers: testAuthHeaders,
      body: JSON.stringify({})
    });
    assert(otpRes.status === 400, 'POST /api/otp/send validates missing phone number');

    // 9. Activity Feed
    const actRes = await fetch(`${baseUrl}/api/activity`);
    const actData = await actRes.json();
    assert(
      actRes.status === 200 && Array.isArray(actData.data) && actData.stats,
      'GET /api/activity returns dispatch history and statistics'
    );

    // 10. Webhooks status
    const whRes = await fetch(`${baseUrl}/api/webhooks/status`);
    const whData = await whRes.json();
    assert(whRes.status === 200 && whData.success, 'GET /api/webhooks/status returns webhook configuration');

    // 11. Instance Status
    const statusRes = await fetch(`${baseUrl}/api/instance/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.instance, 'GET /api/instance/status returns instance info');

    // 12. Token Revocation
    const revokeRes = await fetch(`${baseUrl}/api/tokens/${createdTokenId}`, {
      method: 'DELETE'
    });
    const revokeData = await revokeRes.json();
    assert(revokeRes.status === 200 && revokeData.success, 'DELETE /api/tokens/:id successfully revokes token');

    console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed!`);
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
}

runTests();
