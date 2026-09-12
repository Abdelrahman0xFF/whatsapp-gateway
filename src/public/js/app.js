/**
 * WhatsApp REST API Gateway — Developer Cockpit Client Application
 */

// Application State
const STATE = {
  isConnected: false,
  activeLang: 'curl',
  activeMode: 'text',
  pairingTab: 'qr',
  clientApiKey: '',
  pollTimer: null,
  tokens: []
};

// DOM References Cache
const DOM = {
  // Global & Telemetry
  toastContainer: document.getElementById('toast-container'),
  connectionBadge: document.getElementById('connection-badge'),
  connectionStatusText: document.getElementById('connection-status-text'),
  uptimeBadge: document.getElementById('uptime-badge'),
  engineBadge: document.getElementById('engine-badge'),
  headerTokenCount: document.getElementById('header-token-count'),
  btnToggleTokens: document.getElementById('btn-toggle-tokens'),
  cardTokens: document.getElementById('card-tokens'),
  btnRefreshStatus: document.getElementById('btn-refresh-status'),

  // Auth Context
  clientApiKeyInput: document.getElementById('client-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),

  // Connection Views
  viewConnected: document.getElementById('view-connected'),
  viewDisconnected: document.getElementById('view-disconnected'),
  connectedPhoneDisplay: document.getElementById('connected-phone-display'),
  instanceJidVal: document.getElementById('instance-jid-val'),
  btnLogoutDevice: document.getElementById('btn-logout-device'),

  // Pairing Hub
  tabBtnQr: document.getElementById('tab-btn-qr'),
  tabBtnPhone: document.getElementById('tab-btn-phone'),
  paneQr: document.getElementById('pane-qr'),
  panePhone: document.getElementById('pane-phone'),
  qrDisplayImage: document.getElementById('qr-display-image'),
  qrSkeleton: document.getElementById('qr-skeleton'),
  qrStatusMsg: document.getElementById('qr-status-msg'),
  btnForceQr: document.getElementById('btn-force-qr'),
  inputPairingPhone: document.getElementById('input-pairing-phone'),
  btnRequestPairingCode: document.getElementById('btn-request-pairing-code'),
  pairingCodeResult: document.getElementById('pairing-code-result'),
  displayPairingCode: document.getElementById('display-pairing-code'),
  btnCopyPairingCode: document.getElementById('btn-copy-pairing-code'),

  // Token Studio
  tokenLabelInput: document.getElementById('token-label-input'),
  formCreateToken: document.getElementById('form-create-token'),
  newTokenAlert: document.getElementById('new-token-alert'),
  newTokenVal: document.getElementById('new-token-val'),
  btnCopyNewToken: document.getElementById('btn-copy-new-token'),
  btnUseNewToken: document.getElementById('btn-use-new-token'),
  tokensTableBody: document.getElementById('tokens-table-body'),

  // Playground Modes
  tabModeText: document.getElementById('tab-mode-text'),
  tabModeMedia: document.getElementById('tab-mode-media'),
  tabModeOtp: document.getElementById('tab-mode-otp'),
  paneSendText: document.getElementById('pane-send-text'),
  paneSendMedia: document.getElementById('pane-send-media'),
  paneSendOtp: document.getElementById('pane-send-otp'),

  // Form Controls
  textMsgPhone: document.getElementById('text-msg-phone'),
  textMsgBody: document.getElementById('text-msg-body'),
  btnSubmitText: document.getElementById('btn-submit-text'),

  mediaMsgPhone: document.getElementById('media-msg-phone'),
  mediaMsgType: document.getElementById('media-msg-type'),
  mediaMsgUrl: document.getElementById('media-msg-url'),
  mediaMsgCaption: document.getElementById('media-msg-caption'),
  btnSubmitMedia: document.getElementById('btn-submit-media'),

  otpRecipientPhone: document.getElementById('otp-recipient-phone'),
  otpAppTitle: document.getElementById('otp-app-title'),
  btnSubmitOtp: document.getElementById('btn-submit-otp'),
  otpVerifyStage: document.getElementById('otp-verify-stage'),
  pinDigits: document.querySelectorAll('.pin-digit'),
  btnSubmitVerifyOtp: document.getElementById('btn-submit-verify-otp'),

  // Inspector & Code
  responseStatusBadge: document.getElementById('response-status-badge'),
  responseLatencyBadge: document.getElementById('response-latency-badge'),
  responseOutputBox: document.getElementById('response-output-box'),
  btnCopyResponse: document.getElementById('btn-copy-response'),
  codeSnippetBox: document.getElementById('code-snippet-box'),
  btnCopySnippet: document.getElementById('btn-copy-snippet'),
  langTabs: document.querySelectorAll('.lang-tab'),

  // Activity Feed
  activityTableBody: document.getElementById('activity-table-body'),
  btnRefreshActivity: document.getElementById('btn-refresh-activity'),
  btnClearActivity: document.getElementById('btn-clear-activity')
};

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showToast(message, type = 'info', durationMs = 3500) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute('role', 'alert');

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

/* ==========================================================================
   TELEMETRY & CONNECTION MONITORING
   ========================================================================== */
async function checkStatus() {
  try {
    const res = await fetch('/api/instance/status');
    const data = await res.json();

    const healthRes = await fetch('/api/health');
    const healthData = await healthRes.json().catch(() => ({}));

    if (healthData.uptime) {
      DOM.uptimeBadge.innerText = healthData.uptime;
    }
    if (healthData.engine) {
      DOM.engineBadge.innerText = healthData.engine.toUpperCase();
    }

    if (data.connected || data.state === 'open') {
      STATE.isConnected = true;
      DOM.connectionBadge.className = 'connection-status-pill status-connected';
      
      const userPhone = data.user?.id ? data.user.id.split('@')[0].split(':')[0] : 'Device';
      const userName = data.user?.name ? ` (${data.user.name})` : '';
      DOM.connectionStatusText.innerText = `Connected: ${userPhone}${userName}`;

      DOM.viewDisconnected.style.display = 'none';
      DOM.viewConnected.style.display = 'flex';
      DOM.connectedPhoneDisplay.innerText = `WhatsApp account +${userPhone} is active and listening. Messages dispatch instantly.`;
      DOM.instanceJidVal.innerText = data.user?.id || 'baileys-session';

      scheduleStatusPoll(30000);
    } else {
      STATE.isConnected = false;
      DOM.connectionBadge.className = 'connection-status-pill status-disconnected';
      DOM.connectionStatusText.innerText = `WhatsApp Disconnected (${data.state || 'offline'})`;

      DOM.viewConnected.style.display = 'none';
      DOM.viewDisconnected.style.display = 'flex';

      if (STATE.pairingTab === 'qr') {
        loadQrCode();
      }

      scheduleStatusPoll(4000);
    }
  } catch (err) {
    STATE.isConnected = false;
    DOM.connectionBadge.className = 'connection-status-pill status-disconnected';
    DOM.connectionStatusText.innerText = 'Service Unreachable';
    scheduleStatusPoll(8000);
  }
}

function scheduleStatusPoll(ms) {
  if (STATE.pollTimer) clearTimeout(STATE.pollTimer);
  STATE.pollTimer = setTimeout(checkStatus, ms);
}

/* ==========================================================================
   PAIRING & QR HANDLING
   ========================================================================== */
function switchPairingTab(tab) {
  STATE.pairingTab = tab;
  if (tab === 'qr') {
    DOM.tabBtnQr.classList.add('active');
    DOM.tabBtnPhone.classList.remove('active');
    DOM.paneQr.style.display = 'block';
    DOM.panePhone.style.display = 'none';
    loadQrCode();
  } else {
    DOM.tabBtnQr.classList.remove('active');
    DOM.tabBtnPhone.classList.add('active');
    DOM.paneQr.style.display = 'none';
    DOM.panePhone.style.display = 'block';
  }
}

async function loadQrCode(force = false) {
  try {
    const res = await fetch('/api/instance/qr');
    const data = await res.json();

    if (data.qr) {
      DOM.qrDisplayImage.src = data.qr;
      DOM.qrDisplayImage.style.display = 'block';
      DOM.qrSkeleton.style.display = 'none';
    } else {
      DOM.qrDisplayImage.style.display = 'none';
      DOM.qrSkeleton.style.display = 'flex';
      DOM.qrStatusMsg.innerText = force ? 'Regenerating fresh QR code...' : 'Generating QR code...';
    }
  } catch (err) {
    DOM.qrStatusMsg.innerText = 'Failed to load QR code.';
  }
}

async function handleRequestPairingCode() {
  const phone = DOM.inputPairingPhone.value.trim().replace(/\D/g, '');
  if (!phone || phone.length < 7) {
    showToast('Enter a valid phone number with country code (e.g. 201012345678).', 'error');
    DOM.inputPairingPhone.focus();
    return;
  }

  DOM.btnRequestPairingCode.disabled = true;
  DOM.btnRequestPairingCode.innerHTML = '<span>Requesting Code...</span>';

  try {
    const res = await fetch('/api/instance/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate pairing code.');
    }

    DOM.displayPairingCode.innerText = data.pairingCode;
    DOM.pairingCodeResult.style.display = 'block';
    showToast('Pairing code generated! Type it in WhatsApp.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.btnRequestPairingCode.disabled = false;
    DOM.btnRequestPairingCode.innerHTML = '<span>Generate 8-Digit Code</span>';
  }
}

async function handleLogoutDevice() {
  if (!window.confirm('Are you sure you want to unlink and disconnect this WhatsApp device?')) {
    return;
  }

  DOM.btnLogoutDevice.disabled = true;
  try {
    const headers = getAuthHeaders();
    const res = await fetch('/api/instance/logout', { method: 'POST', headers });
    const data = await res.json();

    if (data.success) {
      showToast('Device unlinked. Session reset.', 'info');
      checkStatus();
    } else {
      showToast(data.error || 'Logout failed.', 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    DOM.btnLogoutDevice.disabled = false;
  }
}

/* ==========================================================================
   API TOKEN STUDIO
   ========================================================================== */
async function loadTokens() {
  try {
    const res = await fetch('/api/tokens');
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      STATE.tokens = data.data;
      DOM.headerTokenCount.innerText = data.data.length;
      renderTokensTable(data.data);
    }
  } catch (err) {
    console.error('Failed to load tokens:', err);
  }
}

function renderTokensTable(tokens) {
  if (!DOM.tokensTableBody) return;

  if (tokens.length === 0) {
    DOM.tokensTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="table-empty-row">No active API tokens found. Generate one above or use open mode.</td>
      </tr>
    `;
    return;
  }

  DOM.tokensTableBody.innerHTML = tokens.map(t => {
    const dateFormatted = new Date(t.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td><code class="code-inline">${escapeHtml(t.maskedToken)}</code></td>
        <td class="tabular-num">${dateFormatted}</td>
        <td class="text-right">
          <button class="btn btn-ghost btn-xs btn-ghost-danger" onclick="handleRevokeToken('${t.id}')">
            Revoke
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleGenerateToken() {
  const name = DOM.tokenLabelInput.value.trim();
  if (!name) return;

  DOM.formCreateToken.querySelector('button').disabled = true;

  try {
    const res = await fetch('/api/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate token.');
    }

    DOM.tokenLabelInput.value = '';
    DOM.newTokenVal.innerText = data.data.token;
    DOM.newTokenAlert.style.display = 'block';
    
    showToast(`Token "${name}" created!`, 'success');
    loadTokens();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.formCreateToken.querySelector('button').disabled = false;
  }
}

async function handleRevokeToken(id) {
  if (!window.confirm('Are you sure you want to revoke this API token? Any services using it will be rejected.')) {
    return;
  }

  try {
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showToast('API token revoked.', 'info');
      loadTokens();
    } else {
      showToast(data.error || 'Failed to revoke token.', 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

/* ==========================================================================
   INTERACTIVE API TESTING STUDIO
   ========================================================================== */
function switchPlaygroundMode(mode) {
  STATE.activeMode = mode;

  DOM.tabModeText.classList.toggle('active', mode === 'text');
  DOM.tabModeMedia.classList.toggle('active', mode === 'media');
  DOM.tabModeOtp.classList.toggle('active', mode === 'otp');

  DOM.paneSendText.style.display = mode === 'text' ? 'block' : 'none';
  DOM.paneSendMedia.style.display = mode === 'media' ? 'block' : 'none';
  DOM.paneSendOtp.style.display = mode === 'otp' ? 'block' : 'none';

  updateSnippets();
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = DOM.clientApiKeyInput.value.trim();
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
}

function inspectResponse(status, latencyMs, payload) {
  DOM.responseStatusBadge.style.display = 'inline-block';
  DOM.responseStatusBadge.innerText = `${status}`;
  DOM.responseStatusBadge.className = `response-status-pill ${status >= 200 && status < 300 ? 'status-2xx' : 'status-err'}`;

  DOM.responseLatencyBadge.style.display = 'inline-block';
  DOM.responseLatencyBadge.innerText = `${latencyMs}ms`;

  DOM.responseOutputBox.innerText = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

// 1. Send Text
async function handleSendText() {
  const phone = DOM.textMsgPhone.value.trim().replace(/\D/g, '');
  const message = DOM.textMsgBody.value.trim();

  if (!phone) {
    showToast('Please enter recipient phone number.', 'error');
    DOM.textMsgPhone.focus();
    return;
  }
  if (!message) {
    showToast('Please enter message text.', 'error');
    DOM.textMsgBody.focus();
    return;
  }

  DOM.btnSubmitText.disabled = true;
  DOM.btnSubmitText.innerHTML = '<span>Dispatching...</span>';

  const startTime = Date.now();
  try {
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ number: phone, message })
    });

    const latency = Date.now() - startTime;
    const data = await res.json();
    inspectResponse(res.status, latency, data);

    if (res.ok && data.success) {
      showToast('WhatsApp message sent successfully!', 'success');
      loadActivity();
    } else {
      showToast(data.error || 'Failed to dispatch message.', 'error');
    }
  } catch (err) {
    inspectResponse(500, Date.now() - startTime, { error: err.message });
    showToast(`Network Error: ${err.message}`, 'error');
  } finally {
    DOM.btnSubmitText.disabled = false;
    DOM.btnSubmitText.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      <span>Dispatch Text Message</span>
    `;
  }
}

// 2. Send Media
async function handleSendMedia() {
  const phone = DOM.mediaMsgPhone.value.trim().replace(/\D/g, '');
  const type = DOM.mediaMsgType.value;
  const url = DOM.mediaMsgUrl.value.trim();
  const caption = DOM.mediaMsgCaption.value.trim();

  if (!phone) {
    showToast('Please enter recipient phone number.', 'error');
    DOM.mediaMsgPhone.focus();
    return;
  }
  if (!url) {
    showToast('Please enter media file URL.', 'error');
    DOM.mediaMsgUrl.focus();
    return;
  }

  DOM.btnSubmitMedia.disabled = true;
  DOM.btnSubmitMedia.innerHTML = '<span>Dispatching Media...</span>';

  const startTime = Date.now();
  try {
    const res = await fetch('/api/messages/send-media', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        number: phone,
        type,
        mediaUrl: url,
        caption
      })
    });

    const latency = Date.now() - startTime;
    const data = await res.json();
    inspectResponse(res.status, latency, data);

    if (res.ok && data.success) {
      showToast(`WhatsApp ${type} dispatched successfully!`, 'success');
      loadActivity();
    } else {
      showToast(data.error || 'Failed to send media.', 'error');
    }
  } catch (err) {
    inspectResponse(500, Date.now() - startTime, { error: err.message });
    showToast(`Network Error: ${err.message}`, 'error');
  } finally {
    DOM.btnSubmitMedia.disabled = false;
    DOM.btnSubmitMedia.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
      <span>Dispatch Media Attachment</span>
    `;
  }
}

// 3. Send OTP
async function handleSendOtp() {
  const phone = DOM.otpRecipientPhone.value.trim().replace(/\D/g, '');
  const appName = DOM.otpAppTitle.value.trim() || 'My Project';

  if (!phone) {
    showToast('Please enter recipient phone number.', 'error');
    DOM.otpRecipientPhone.focus();
    return;
  }

  DOM.btnSubmitOtp.disabled = true;
  DOM.btnSubmitOtp.innerHTML = '<span>Sending OTP...</span>';

  const startTime = Date.now();
  try {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ number: phone, appName })
    });

    const latency = Date.now() - startTime;
    const data = await res.json();
    inspectResponse(res.status, latency, data);

    if (res.ok && data.success) {
      showToast('OTP dispatched! Enter 6 digits below.', 'success');
      DOM.otpVerifyStage.style.display = 'block';
      DOM.pinDigits[0].focus();
      loadActivity();
    } else {
      showToast(data.error || 'Failed to send OTP.', 'error');
    }
  } catch (err) {
    inspectResponse(500, Date.now() - startTime, { error: err.message });
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    DOM.btnSubmitOtp.disabled = false;
    DOM.btnSubmitOtp.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <span>Send One-Time Passcode</span>
    `;
  }
}

// 4. Verify OTP
async function handleVerifyOtp() {
  const phone = DOM.otpRecipientPhone.value.trim().replace(/\D/g, '');
  const code = Array.from(DOM.pinDigits).map(i => i.value).join('').trim();

  if (code.length < 6) {
    showToast('Please enter full 6-digit code.', 'error');
    return;
  }

  DOM.btnSubmitVerifyOtp.disabled = true;
  DOM.btnSubmitVerifyOtp.innerText = 'Verifying...';

  const startTime = Date.now();
  try {
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ number: phone, code })
    });

    const latency = Date.now() - startTime;
    const data = await res.json();
    inspectResponse(res.status, latency, data);

    if (res.ok && data.success) {
      showToast('Passcode verified successfully!', 'success');
      loadActivity();
    } else {
      showToast(data.message || 'Verification failed.', 'error');
    }
  } catch (err) {
    inspectResponse(500, Date.now() - startTime, { error: err.message });
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    DOM.btnSubmitVerifyOtp.disabled = false;
    DOM.btnSubmitVerifyOtp.innerText = 'Verify Passcode';
  }
}

// Auto-advance OTP PIN Digits
DOM.pinDigits.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    if (e.target.value.length === 1 && idx < DOM.pinDigits.length - 1) {
      DOM.pinDigits[idx + 1].focus();
    }
    const full = Array.from(DOM.pinDigits).map(i => i.value).join('');
    if (full.length === 6) {
      handleVerifyOtp();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && idx > 0) {
      DOM.pinDigits[idx - 1].focus();
    }
  });
});

/* ==========================================================================
   CODE SNIPPETS GENERATOR
   ========================================================================== */
function switchLangTab(lang) {
  STATE.activeLang = lang;
  DOM.langTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-lang') === lang));
  updateSnippets();
}

function updateSnippets() {
  const origin = window.location.origin;
  const apiKey = DOM.clientApiKeyInput.value.trim() || 'YOUR_API_KEY';
  const mode = STATE.activeMode;
  let code = '';

  let endpoint = '/api/messages/send';
  let payloadObj = {
    number: DOM.textMsgPhone.value.trim() || '201012345678',
    message: DOM.textMsgBody.value.trim() || 'Hello from WhatsApp REST Gateway!'
  };

  if (mode === 'media') {
    endpoint = '/api/messages/send-media';
    payloadObj = {
      number: DOM.mediaMsgPhone.value.trim() || '201012345678',
      type: DOM.mediaMsgType.value || 'image',
      mediaUrl: DOM.mediaMsgUrl.value.trim() || 'https://example.com/sample.jpg',
      caption: DOM.mediaMsgCaption.value.trim() || 'Monthly Statement'
    };
  } else if (mode === 'otp') {
    endpoint = '/api/otp/send';
    payloadObj = {
      number: DOM.otpRecipientPhone.value.trim() || '201012345678',
      appName: DOM.otpAppTitle.value.trim() || 'My SaaS'
    };
  }

  const payloadJson = JSON.stringify(payloadObj, null, 2);

  if (STATE.activeLang === 'curl') {
    code = `curl -X POST "${origin}${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '${payloadJson}'`;
  } else if (STATE.activeLang === 'python') {
    code = `import requests

url = "${origin}${endpoint}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
}
payload = ${payloadJson.replace(/"/g, "'")}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
  } else if (STATE.activeLang === 'nodejs') {
    code = `const response = await fetch("${origin}${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
  },
  body: JSON.stringify(${payloadJson})
});

const data = await response.json();
console.log(data);`;
  } else if (STATE.activeLang === 'go') {
    code = `package main

import (
    "bytes"
    "fmt"
    "net/http"
    "io"
)

func main() {
    url := "${origin}${endpoint}"
    payload := []byte(\`${payloadJson}\`)

    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "${apiKey}")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil { panic(err) }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;
  }

  DOM.codeSnippetBox.innerText = code;
}

/* ==========================================================================
   ACTIVITY FEED
   ========================================================================== */
async function loadActivity() {
  try {
    const res = await fetch('/api/activity?limit=30');
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      renderActivityTable(data.data);
    }
  } catch (err) {
    console.error('Failed to load activity:', err);
  }
}

function renderActivityTable(activities) {
  if (!DOM.activityTableBody) return;

  if (activities.length === 0) {
    DOM.activityTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-row">No dispatches recorded in this session.</td>
      </tr>
    `;
    return;
  }

  DOM.activityTableBody.innerHTML = activities.map(a => {
    const timeFormatted = new Date(a.timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let statusPillClass = 'pill-sent';
    if (a.status === 'FAILED') statusPillClass = 'pill-failed';
    if (a.status === 'VERIFIED') statusPillClass = 'pill-verified';

    return `
      <tr>
        <td class="tabular-num">${timeFormatted}</td>
        <td><strong class="code-inline">${escapeHtml(a.type)}</strong></td>
        <td>${a.recipient ? `+${escapeHtml(a.recipient)}` : '—'}</td>
        <td><span class="table-status-pill ${statusPillClass}">${escapeHtml(a.status)}</span></td>
        <td>${escapeHtml(a.preview || a.error || '—')}</td>
      </tr>
    `;
  }).join('');
}

async function handleClearActivity() {
  try {
    await fetch('/api/activity/clear', { method: 'DELETE' });
    showToast('Activity feed cleared.', 'info');
    loadActivity();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   CLIPBOARD UTILITY
   ========================================================================== */
function copyText(text, successMsg = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg, 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

/* ==========================================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================================== */
function initEventListeners() {
  // Connection Refresh & Logout
  DOM.btnRefreshStatus.addEventListener('click', () => {
    showToast('Refreshing status...', 'info');
    checkStatus();
  });
  DOM.btnLogoutDevice.addEventListener('click', handleLogoutDevice);

  // Pairing Mode Tabs
  DOM.tabBtnQr.addEventListener('click', () => switchPairingTab('qr'));
  DOM.tabBtnPhone.addEventListener('click', () => switchPairingTab('phone'));
  DOM.btnForceQr.addEventListener('click', () => loadQrCode(true));
  DOM.btnRequestPairingCode.addEventListener('click', handleRequestPairingCode);
  DOM.btnCopyPairingCode.addEventListener('click', () => copyText(DOM.displayPairingCode.innerText, 'Pairing code copied!'));

  // Tokens
  DOM.btnToggleTokens.addEventListener('click', () => {
    DOM.cardTokens.scrollIntoView({ behavior: 'smooth' });
    DOM.tokenLabelInput.focus();
  });
  DOM.btnCopyNewToken.addEventListener('click', () => copyText(DOM.newTokenVal.innerText, 'API Key copied!'));
  DOM.btnUseNewToken.addEventListener('click', () => {
    DOM.clientApiKeyInput.value = DOM.newTokenVal.innerText;
    DOM.clientApiKeyInput.type = 'text';
    updateSnippets();
    showToast('API Key applied to active cockpit session!', 'success');
  });

  // Client Key Visibility
  DOM.btnToggleKeyVisibility.addEventListener('click', () => {
    const isPass = DOM.clientApiKeyInput.type === 'password';
    DOM.clientApiKeyInput.type = isPass ? 'text' : 'password';
  });
  DOM.clientApiKeyInput.addEventListener('input', updateSnippets);

  // Playground Mode Switcher
  DOM.tabModeText.addEventListener('click', () => switchPlaygroundMode('text'));
  DOM.tabModeMedia.addEventListener('click', () => switchPlaygroundMode('media'));
  DOM.tabModeOtp.addEventListener('click', () => switchPlaygroundMode('otp'));

  // Form Submissions
  DOM.btnSubmitText.addEventListener('click', handleSendText);
  DOM.btnSubmitMedia.addEventListener('click', handleSendMedia);
  DOM.btnSubmitOtp.addEventListener('click', handleSendOtp);
  DOM.btnSubmitVerifyOtp.addEventListener('click', handleVerifyOtp);

  // Live snippet updating on form changes
  DOM.textMsgPhone.addEventListener('input', updateSnippets);
  DOM.textMsgBody.addEventListener('input', updateSnippets);
  DOM.mediaMsgPhone.addEventListener('input', updateSnippets);
  DOM.mediaMsgType.addEventListener('change', updateSnippets);
  DOM.mediaMsgUrl.addEventListener('input', updateSnippets);
  DOM.mediaMsgCaption.addEventListener('input', updateSnippets);
  DOM.otpRecipientPhone.addEventListener('input', updateSnippets);
  DOM.otpAppTitle.addEventListener('input', updateSnippets);

  // Snippet tabs
  DOM.langTabs.forEach(btn => {
    btn.addEventListener('click', () => switchLangTab(btn.getAttribute('data-lang')));
  });

  DOM.btnCopySnippet.addEventListener('click', () => copyText(DOM.codeSnippetBox.innerText, 'Code snippet copied!'));
  DOM.btnCopyResponse.addEventListener('click', () => copyText(DOM.responseOutputBox.innerText, 'Response JSON copied!'));

  // Activity Refresh & Clear
  DOM.btnRefreshActivity.addEventListener('click', () => {
    showToast('Refreshing activity feed...', 'info');
    loadActivity();
  });
  DOM.btnClearActivity.addEventListener('click', handleClearActivity);
}

// Start application
window.handleRevokeToken = handleRevokeToken;
initEventListeners();
checkStatus();
loadTokens();
loadActivity();
updateSnippets();
