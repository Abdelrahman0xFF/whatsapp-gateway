import app from './src/app.js';
import { ENV } from './src/config/env.js';
import { adminService } from './src/services/admin.service.js';

const TEST_PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 7865;

async function runTests() {
  console.log('🧪 Starting WhatsApp REST Gateway Test Suite...\n');
  const testPhoneNumber = ENV.WHITELIST_PHONE_NUMBER || '200000000000';

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
    const adminKey = adminService.getAdminKey();
    const adminHeaders = {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    };

    // 1. Health check (Public pass-through and Whitelist Phone exposure)
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.status === 'ok' && healthData.whitelistPhone === testPhoneNumber,
      `GET /api/health returns 200 OK and exposes whitelistPhone (${testPhoneNumber})`
    );

    // 2. Web UI dashboard serves
    const webRes = await fetch(`${baseUrl}/`);
    const webHtml = await webRes.text();
    assert(webRes.status === 200 && webHtml.includes('WhatsApp REST Gateway'), 'GET / serves Web Dashboard HTML');

    // 2b. Favicon static assets serve
    const favSvgRes = await fetch(`${baseUrl}/favicon.svg`);
    const favIcoRes = await fetch(`${baseUrl}/favicon.ico`);
    assert(favSvgRes.status === 200 && favIcoRes.status === 200, 'GET /favicon.svg and /favicon.ico return 200 OK');

    // 3. Admin Key Verification Endpoint
    const badAdminVerifyRes = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'wrong_secret_key' })
    });
    assert(badAdminVerifyRes.status === 401, 'POST /api/admin/verify rejects invalid key with 401');

    const goodAdminVerifyRes = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey })
    });
    const goodAdminVerifyData = await goodAdminVerifyRes.json();
    assert(goodAdminVerifyRes.status === 200 && goodAdminVerifyData.success, 'POST /api/admin/verify accepts valid Admin Master Key');

    // 4. Token Endpoints Security: Must reject unauthenticated requests
    const unauthGenTokenRes = await fetch(`${baseUrl}/api/tokens/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Key' })
    });
    assert(unauthGenTokenRes.status === 401, 'POST /api/tokens/generate blocks unauthenticated callers with 401');

    const unauthListTokenRes = await fetch(`${baseUrl}/api/tokens`);
    assert(unauthListTokenRes.status === 401, 'GET /api/tokens blocks unauthenticated callers with 401');

    const unauthRevokeTokenRes = await fetch(`${baseUrl}/api/tokens/tok_random123`, {
      method: 'DELETE'
    });
    assert(unauthRevokeTokenRes.status === 401, 'DELETE /api/tokens/:id blocks unauthenticated callers with 401');

    // 5. Token Generation with Admin Key
    const genTokenRes = await fetch(`${baseUrl}/api/tokens/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Integration Test Key' })
    });
    const genTokenData = await genTokenRes.json();
    assert(
      genTokenRes.status === 201 && genTokenData.success && genTokenData.data.token.startsWith('wa_live_'),
      'POST /api/tokens/generate with Admin Key creates secure wa_live_ client token'
    );
    const createdToken = genTokenData.data.token;
    const createdTokenId = genTokenData.data.id;

    // 6. Privilege Isolation: Client Token CANNOT generate or delete tokens
    const clientGenTokenRes = await fetch(`${baseUrl}/api/tokens/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': createdToken },
      body: JSON.stringify({ name: 'Unauthorized Key' })
    });
    assert(clientGenTokenRes.status === 403, 'POST /api/tokens/generate rejects Client Token with 403 (Admin privilege required)');

    const clientRevokeRes = await fetch(`${baseUrl}/api/tokens/${createdTokenId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': createdToken }
    });
    assert(clientRevokeRes.status === 403, 'DELETE /api/tokens/:id rejects Client Token with 403 (Cannot delete keys)');

    // 7. Token Listing with Admin Key
    const listTokenRes = await fetch(`${baseUrl}/api/tokens`, { headers: adminHeaders });
    const listTokenData = await listTokenRes.json();
    assert(
      listTokenRes.status === 200 && listTokenData.count >= 1 && listTokenData.hasKeys === true,
      'GET /api/tokens with Admin Key lists active tokens with masked secrets'
    );

    const clientAuthHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': createdToken
    };

    // 8. Auth Middleware with valid Client Token on Messaging API
    const invalidSendRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: clientAuthHeaders,
      body: JSON.stringify({ message: 'Hello' })
    });
    const invalidSendData = await invalidSendRes.json();
    assert(
      invalidSendRes.status === 400 && invalidSendData.success === false,
      'POST /api/messages/send accepts valid client token and validates phone number'
    );

    // 9. Auth Middleware with invalid token on Messaging API
    const badKeyRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'invalid_secret_key' },
      body: JSON.stringify({ number: testPhoneNumber, message: 'Hello' })
    });
    assert(badKeyRes.status === 403, 'POST /api/messages/send rejects invalid token with 403 Forbidden');

    // 10. Media Messaging validation with Client Token
    const mediaRes = await fetch(`${baseUrl}/api/messages/send-media`, {
      method: 'POST',
      headers: clientAuthHeaders,
      body: JSON.stringify({ number: testPhoneNumber })
    });
    const mediaData = await mediaRes.json();
    assert(
      mediaRes.status === 400 && mediaData.error.includes('Either "mediaUrl" or "mediaBase64"'),
      'POST /api/messages/send-media validates required mediaUrl/mediaBase64'
    );

    // 11. OTP Endpoint validation with Client Token
    const otpRes = await fetch(`${baseUrl}/api/otp/send`, {
      method: 'POST',
      headers: clientAuthHeaders,
      body: JSON.stringify({})
    });
    assert(otpRes.status === 400, 'POST /api/otp/send validates missing phone number');

    // 12. Activity Feed Security & Admin Access
    const unauthActRes = await fetch(`${baseUrl}/api/activity?page=1&limit=10`);
    assert(unauthActRes.status === 401, 'GET /api/activity blocks unauthenticated callers with 401');

    const clientActRes = await fetch(`${baseUrl}/api/activity?page=1&limit=10`, { headers: clientAuthHeaders });
    assert(clientActRes.status === 403, 'GET /api/activity blocks Client Tokens with 403');

    const actRes = await fetch(`${baseUrl}/api/activity?page=1&limit=10`, { headers: adminHeaders });
    const actData = await actRes.json();
    assert(
      actRes.status === 200 && Array.isArray(actData.data) && actData.stats && actData.pagination,
      'GET /api/activity with Admin Key returns dispatch history with pagination metadata'
    );

    // 13. Activity Deletion & Clear with Admin Key
    const delActRes = await fetch(`${baseUrl}/api/activity/non_existent_id`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(delActRes.status === 404, 'DELETE /api/activity/:id returns 404 for unknown record with Admin Key');

    const clearActRes = await fetch(`${baseUrl}/api/activity/clear`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    const clearActData = await clearActRes.json();
    assert(clearActRes.status === 200 && clearActData.success === true, 'DELETE /api/activity/clear clears activity audit storage');

    // 14. Instance QR & Pairing Code Protection
    const unauthQrRes = await fetch(`${baseUrl}/api/instance/qr`);
    assert(unauthQrRes.status === 401, 'GET /api/instance/qr blocks unauthenticated callers with 401');

    const unauthPairRes = await fetch(`${baseUrl}/api/instance/pairing-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: testPhoneNumber })
    });
    assert(unauthPairRes.status === 401, 'POST /api/instance/pairing-code blocks unauthenticated callers with 401');

    // 15. Instance Status (Accepts Admin Key or Client Key)
    const statusRes = await fetch(`${baseUrl}/api/instance/status`, { headers: adminHeaders });
    const statusData = await statusRes.json();
    assert(
      statusRes.status === 200 && statusData.instance && statusData.whitelistPhone === testPhoneNumber,
      'GET /api/instance/status returns instance info and whitelistPhone for authenticated caller'
    );

    // 16. Webhooks Security
    const unauthWhRes = await fetch(`${baseUrl}/api/webhooks/status`);
    assert(unauthWhRes.status === 401, 'GET /api/webhooks/status blocks unauthenticated callers with 401');

    const whRes = await fetch(`${baseUrl}/api/webhooks/status`, { headers: adminHeaders });
    const whData = await whRes.json();
    assert(whRes.status === 200 && whData.success, 'GET /api/webhooks/status returns webhook configuration with Admin Key');

    // 17. Token Revocation with Admin Key
    const revokeRes = await fetch(`${baseUrl}/api/tokens/${createdTokenId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    const revokeData = await revokeRes.json();
    assert(revokeRes.status === 200 && revokeData.success, 'DELETE /api/tokens/:id with Admin Key successfully revokes token');

    // 18. Revoked Token Rejection
    const revokedSendRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': createdToken },
      body: JSON.stringify({ number: testPhoneNumber, message: 'Hello' })
    });
    assert(revokedSendRes.status === 403, 'POST /api/messages/send rejects revoked token with 403 Forbidden');

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
