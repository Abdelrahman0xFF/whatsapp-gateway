import app from './src/app.js';
import { ENV } from './src/config/env.js';

const TEST_PORT = 7865;

async function runTests() {
  console.log('🧪 Starting WhatsApp REST Gateway Test Suite...\n');

  const server = app.listen(TEST_PORT, '127.0.0.1');
  let testsPassed = 0;
  let testsTotal = 0;
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(ENV.GATEWAY_API_KEY ? { 'x-api-key': ENV.GATEWAY_API_KEY.split(',')[0].trim() } : {})
  };

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

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /api/health returns 200 OK');

    const webRes = await fetch(`${baseUrl}/`);
    const webHtml = await webRes.text();
    assert(webRes.status === 200 && webHtml.includes('WhatsApp REST Gateway'), 'GET / serves Web Dashboard HTML');

    const invalidSendRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ message: 'Hello' })
    });
    const invalidSendData = await invalidSendRes.json();
    assert(
      invalidSendRes.status === 400 && invalidSendData.success === false,
      'POST /api/messages/send rejects request missing phone number'
    );

    const badPhoneRes = await fetch(`${baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ number: '123', message: 'Hello' })
    });
    const badPhoneData = await badPhoneRes.json();
    assert(
      badPhoneRes.status === 400 && badPhoneData.error.includes('Invalid phone number'),
      'POST /api/messages/send rejects short/invalid phone number'
    );

    const directRes = await fetch(`${baseUrl}/api/send-message`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ message: 'Hello' })
    });
    assert(directRes.status === 400, 'POST /api/send-message convenience endpoint responds and validates');

    const otpRes = await fetch(`${baseUrl}/api/otp/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({})
    });
    assert(otpRes.status === 400, 'POST /api/otp/send validates missing phone number');

    const statusRes = await fetch(`${baseUrl}/api/instance/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.instance, 'GET /api/instance/status returns instance info');

    console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed!`);
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
