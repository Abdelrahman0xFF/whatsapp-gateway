let isConnected = false;

const statusBadge = document.getElementById('status-badge');
const badgeText = document.getElementById('badge-text');
const qrSection = document.getElementById('qr-section');
const connectedSection = document.getElementById('connected-section');
const connectedUserText = document.getElementById('connected-user-text');
const qrImage = document.getElementById('qr-image');
const qrLoadingText = document.getElementById('qr-loading-text');
const apiKeyInput = document.getElementById('api-key-input');

const btnTabQr = document.getElementById('btn-tab-qr');
const btnTabCode = document.getElementById('btn-tab-code');
const subtabQr = document.getElementById('subtab-qr');
const subtabCode = document.getElementById('subtab-code');
const pairPhoneInput = document.getElementById('pair-phone');
const btnGetPairingCode = document.getElementById('btn-get-pairing-code');
const pairingCodeDisplay = document.getElementById('pairing-code-display');
const pairingCodeText = document.getElementById('pairing-code-text');

const sendMsgBtn = document.getElementById('btn-send-msg');
const msgPhoneInput = document.getElementById('msg-phone');
const msgTextInput = document.getElementById('msg-text');
const msgResponseBox = document.getElementById('msg-response');

const otpPhoneInput = document.getElementById('otp-phone');
const otpAppNameInput = document.getElementById('otp-app-name');
const btnRequestOtp = document.getElementById('btn-request-otp');
const otpInputsContainer = document.getElementById('otp-inputs-container');
const otpDigitInputs = document.querySelectorAll('.otp-digit');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const otpResponseBox = document.getElementById('otp-response');

function switchPairingTab(tab) {
  if (tab === 'qr') {
    btnTabQr.classList.add('active');
    btnTabCode.classList.remove('active');
    subtabQr.style.display = 'block';
    subtabCode.style.display = 'none';
    loadQrCode();
  } else {
    btnTabQr.classList.remove('active');
    btnTabCode.classList.add('active');
    subtabQr.style.display = 'none';
    subtabCode.style.display = 'block';
  }
}

let pollTimer = null;

function scheduleNextCheck(ms) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    await checkStatus();
  }, ms);
}

async function checkStatus() {
  try {
    const res = await fetch('/api/instance/status');
    const data = await res.json();

    if (data.connected || data.state === 'open') {
      isConnected = true;
      statusBadge.className = 'badge badge-connected';
      const user = data.user?.name || data.user?.id ? ` (${data.user?.id?.split(':')[0] || data.user?.id})` : '';
      badgeText.innerText = `WhatsApp Connected${user}`;
      qrSection.style.display = 'none';
      connectedSection.style.display = 'block';
      if (connectedUserText && data.user?.id) {
        connectedUserText.innerText = `Connected as: ${data.user.id.split('@')[0]}. All API messages will be dispatched immediately.`;
      }
      scheduleNextCheck(30000);
    } else {
      isConnected = false;
      statusBadge.className = 'badge badge-disconnected';
      badgeText.innerText = `WhatsApp Disconnected (${data.state || 'offline'})`;
      connectedSection.style.display = 'none';
      qrSection.style.display = 'block';

      if (subtabQr && subtabQr.style.display !== 'none') {
        loadQrCode();
      }
      scheduleNextCheck(4000);
    }
  } catch (err) {
    statusBadge.className = 'badge badge-disconnected';
    badgeText.innerText = 'Service Unreachable';
    scheduleNextCheck(6000);
  }
}

async function loadQrCode(force = false) {
  try {
    const res = await fetch('/api/instance/qr');
    const data = await res.json();

    if (data.qr) {
      qrImage.src = data.qr;
      qrImage.style.display = 'block';
      if (qrLoadingText) qrLoadingText.style.display = 'none';
    } else if (force) {
      if (qrLoadingText) {
        qrLoadingText.innerText = 'Generating fresh QR code...';
        qrLoadingText.style.display = 'block';
        qrImage.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Failed to load QR code:', err);
  }
}

async function handleRequestPairingCode() {
  const phone = pairPhoneInput.value.trim();
  if (!phone) {
    alert('Please enter your WhatsApp phone number with country code (e.g. 201012345678).');
    return;
  }

  btnGetPairingCode.disabled = true;
  btnGetPairingCode.innerText = 'Requesting Pairing Code...';

  try {
    const res = await fetch('/api/instance/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to get pairing code.');
    }

    pairingCodeText.innerText = data.pairingCode;
    pairingCodeDisplay.style.display = 'block';
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btnGetPairingCode.disabled = false;
    btnGetPairingCode.innerText = 'Generate Pairing Code';
  }
}

async function handleLogout() {
  if (!confirm('Are you sure you want to unlink and logout this WhatsApp device?')) {
    return;
  }

  try {
    const res = await fetch('/api/instance/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Logged out successfully. Reloading QR pairing screen...');
      setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    alert(`Logout failed: ${err.message}`);
  }
}

async function handleSendMessage() {
  const number = msgPhoneInput.value.trim();
  const message = msgTextInput.value.trim();
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

  if (!number) {
    alert('Please enter a destination phone number with country code.');
    return;
  }
  if (!message) {
    alert('Please enter a message to send.');
    return;
  }

  sendMsgBtn.disabled = true;
  sendMsgBtn.innerText = 'Sending...';
  msgResponseBox.style.display = 'none';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, message })
    });

    const data = await res.json();
    msgResponseBox.style.display = 'block';
    msgResponseBox.innerText = JSON.stringify(data, null, 2);
    msgResponseBox.style.color = res.ok ? '#4ade80' : '#f87171';
  } catch (err) {
    msgResponseBox.style.display = 'block';
    msgResponseBox.innerText = `Network Error: ${err.message}`;
    msgResponseBox.style.color = '#f87171';
  } finally {
    sendMsgBtn.disabled = false;
    sendMsgBtn.innerText = 'Send WhatsApp Message';
  }
}

async function handleRequestOtp() {
  const number = otpPhoneInput.value.trim();
  const appName = otpAppNameInput.value.trim() || 'My App';
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

  if (!number) {
    alert('Please enter a valid phone number for OTP delivery.');
    return;
  }

  btnRequestOtp.disabled = true;
  btnRequestOtp.innerText = 'Sending Code...';
  otpResponseBox.style.display = 'none';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, appName })
    });

    const data = await res.json();
    otpResponseBox.style.display = 'block';
    otpResponseBox.innerText = JSON.stringify(data, null, 2);

    if (res.ok && data.success) {
      otpInputsContainer.style.display = 'block';
      otpDigitInputs[0].focus();
    }
  } catch (err) {
    otpResponseBox.style.display = 'block';
    otpResponseBox.innerText = `Error: ${err.message}`;
    otpResponseBox.style.color = '#f87171';
  } finally {
    btnRequestOtp.disabled = false;
    btnRequestOtp.innerText = 'Send Verification Code';
  }
}

async function handleVerifyOtp() {
  const number = otpPhoneInput.value.trim();
  const code = Array.from(otpDigitInputs).map(i => i.value).join('').trim();
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

  if (code.length < 6) {
    alert('Please enter the 6-digit code received.');
    return;
  }

  btnVerifyOtp.disabled = true;
  btnVerifyOtp.innerText = 'Verifying...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, code })
    });

    const data = await res.json();
    otpResponseBox.style.display = 'block';
    otpResponseBox.innerText = JSON.stringify(data, null, 2);
    otpResponseBox.style.color = data.success ? '#4ade80' : '#f87171';
  } catch (err) {
    otpResponseBox.style.display = 'block';
    otpResponseBox.innerText = `Error: ${err.message}`;
    otpResponseBox.style.color = '#f87171';
  } finally {
    btnVerifyOtp.disabled = false;
    btnVerifyOtp.innerText = 'Verify Code';
  }
}

otpDigitInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    if (e.target.value.length === 1 && index < otpDigitInputs.length - 1) {
      otpDigitInputs[index + 1].focus();
    }
    const fullCode = Array.from(otpDigitInputs).map(i => i.value).join('');
    if (fullCode.length === 6) {
      handleVerifyOtp();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      otpDigitInputs[index - 1].focus();
    }
  });
});

function updateSnippets() {
  const apiKey = (apiKeyInput ? apiKeyInput.value.trim() : '') || 'YOUR_API_KEY';
  const origin = window.location.origin;

  const curlCode = 
`curl -X POST "${origin}/api/messages/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "number": "201012345678",
    "message": "Hello from my project!"
  }'`;

  const pythonCode = 
`import requests

url = "${origin}/api/messages/send"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
}
payload = {
    "number": "201012345678",
    "message": "Hello from Python!"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  const jsCode = 
`const response = await fetch("${origin}/api/messages/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
  },
  body: JSON.stringify({
    number: "201012345678",
    message: "Hello from Node.js!"
  })
});

const data = await response.json();
console.log(data);`;

  document.getElementById('snippet-curl').innerText = curlCode;
  document.getElementById('snippet-python').innerText = pythonCode;
  document.getElementById('snippet-js').innerText = jsCode;
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.card .tabs:not(#qr-section .tabs) .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.card');
      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

function copyToClipboard(elementId, btn) {
  const code = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(code).then(() => {
    const orig = btn.innerText;
    btn.innerText = 'Copied!';
    setTimeout(() => btn.innerText = orig, 1500);
  });
}

sendMsgBtn.addEventListener('click', handleSendMessage);
btnRequestOtp.addEventListener('click', handleRequestOtp);
btnVerifyOtp.addEventListener('click', handleVerifyOtp);
if (apiKeyInput) {
  apiKeyInput.addEventListener('input', updateSnippets);
}

setupTabs();
updateSnippets();
checkStatus();
