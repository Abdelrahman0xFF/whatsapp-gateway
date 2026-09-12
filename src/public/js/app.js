/**
 * WhatsApp REST API Gateway — Developer Cockpit Client Application
 * Production-ready developer command center with real-time telemetry,
 * token governance, interactive playground, and paginated audit stream.
 */

// Application State
const STATE = {
  isConnected: false,
  adminKey: sessionStorage.getItem('wa_admin_key') || '',
  isAdminAuthenticated: false,
  activeLang: 'curl',
  activeMode: 'text',
  activeConsoleTab: 'response', // 'response' | 'snippets'
  pairingTab: 'qr',
  whitelistPhone: '201012345678',
  clientApiKey: '',
  pollTimer: null,
  tokens: [],
  pendingRevokeId: null,
  activity: {
    page: 1,
    limit: 10,
    type: 'ALL',
    status: 'ALL',
    search: '',
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    isLive: true,
    pollTimer: null,
    searchDebounceTimer: null
  }
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
  btnScrollActivity: document.getElementById('btn-scroll-activity'),
  headerActivityBeacon: document.getElementById('header-activity-beacon'),
  cardTokens: document.getElementById('card-tokens'),
  cardActivity: document.getElementById('card-activity'),
  btnRefreshStatus: document.getElementById('btn-refresh-status'),
  btnAdminLock: document.getElementById('btn-admin-lock'),
  adminSessionText: document.getElementById('admin-session-text'),
  adminSessionBadge: document.getElementById('admin-session-badge'),

  // Admin Security Gate Modal
  adminGateOverlay: document.getElementById('admin-gate-overlay'),
  formAdminLogin: document.getElementById('form-admin-login'),
  inputAdminKey: document.getElementById('input-admin-key'),
  btnToggleAdminKeyVis: document.getElementById('btn-toggle-admin-key-vis'),
  adminEyeIcon: document.getElementById('admin-eye-icon'),
  adminGateError: document.getElementById('admin-gate-error'),
  btnAdminUnlock: document.getElementById('btn-admin-unlock'),

  // Auth Context
  clientApiKeyInput: document.getElementById('client-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  btnClearSessionKey: document.getElementById('btn-clear-session-key'),
  authModeChip: document.getElementById('auth-mode-chip'),

  // Connection Views & Inline Confirm
  viewConnected: document.getElementById('view-connected'),
  viewDisconnected: document.getElementById('view-disconnected'),
  connectedPhoneDisplay: document.getElementById('connected-phone-display'),
  instanceJidVal: document.getElementById('instance-jid-val'),
  btnLogoutDevice: document.getElementById('btn-logout-device'),
  unlinkConfirmDrawer: document.getElementById('unlink-confirm-drawer'),
  btnCancelUnlink: document.getElementById('btn-cancel-unlink'),
  btnConfirmUnlink: document.getElementById('btn-confirm-unlink'),

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

  // Playground Modes & Forms
  tabModeText: document.getElementById('tab-mode-text'),
  tabModeMedia: document.getElementById('tab-mode-media'),
  tabModeOtp: document.getElementById('tab-mode-otp'),
  paneSendText: document.getElementById('pane-send-text'),
  paneSendMedia: document.getElementById('pane-send-media'),
  paneSendOtp: document.getElementById('pane-send-otp'),

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

  // Integrated Console Panel
  tabConsoleResponse: document.getElementById('tab-console-response'),
  tabConsoleSnippets: document.getElementById('tab-console-snippets'),
  paneConsoleResponse: document.getElementById('pane-console-response'),
  paneConsoleSnippets: document.getElementById('pane-console-snippets'),
  snippetLangSelector: document.getElementById('snippet-lang-selector'),
  btnCopyResponse: document.getElementById('btn-copy-response'),
  btnCopySnippet: document.getElementById('btn-copy-snippet'),
  responseStatusBadge: document.getElementById('response-status-badge'),
  responseLatencyBadge: document.getElementById('response-latency-badge'),
  responseOutputBox: document.getElementById('response-output-box'),
  codeSnippetBox: document.getElementById('code-snippet-box'),
  langTabs: document.querySelectorAll('.lang-tab'),

  // Live Dispatch & Audit Feed
  activityTableBody: document.getElementById('activity-table-body'),
  activityStatsSummary: document.getElementById('activity-stats-summary'),
  activityLiveToggle: document.getElementById('activity-live-toggle'),
  liveToggleLabel: document.getElementById('live-toggle-label'),
  btnRefreshActivity: document.getElementById('btn-refresh-activity'),
  btnClearActivity: document.getElementById('btn-clear-activity'),
  clearConfirmDrawer: document.getElementById('clear-confirm-drawer'),
  btnCancelClearActivity: document.getElementById('btn-cancel-clear-activity'),
  btnConfirmClearActivity: document.getElementById('btn-confirm-clear-activity'),

  activitySearchInput: document.getElementById('activity-search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  activityTypeFilter: document.getElementById('activity-type-filter'),
  activityStatusFilter: document.getElementById('activity-status-filter'),
  activityPageSize: document.getElementById('activity-page-size'),

  activityPaginationInfo: document.getElementById('activity-pagination-info'),
  btnFirstPage: document.getElementById('btn-first-page'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  btnLastPage: document.getElementById('btn-last-page'),
  activityPageNumbers: document.getElementById('activity-page-numbers')
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
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = String(text);
  return div.innerHTML;
}

function updatePhonePlaceholders(phone) {
  if (!phone) return;
  STATE.whitelistPhone = phone;
  if (DOM.textMsgPhone) DOM.textMsgPhone.placeholder = `e.g. ${phone} (country code + digits)`;
  if (DOM.mediaMsgPhone) DOM.mediaMsgPhone.placeholder = `e.g. ${phone}`;
  if (DOM.otpRecipientPhone) DOM.otpRecipientPhone.placeholder = `e.g. ${phone}`;
  if (DOM.inputPairingPhone) DOM.inputPairingPhone.placeholder = `e.g. ${phone} or 15551234567`;
  updateSnippets();
}

/* ==========================================================================
   TELEMETRY & CONNECTION MONITORING
   ========================================================================== */
async function checkStatus() {
  try {
    const res = await fetch('/api/instance/status', { headers: getAdminHeaders() });
    const data = await res.json();

    const healthRes = await fetch('/api/health');
    const healthData = await healthRes.json().catch(() => ({}));

    const whitelistPhone = data.whitelistPhone || healthData.whitelistPhone;
    if (whitelistPhone) {
      updatePhonePlaceholders(whitelistPhone);
    }

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
    const res = await fetch('/api/instance/qr', { headers: getAdminHeaders() });
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
      headers: getAdminHeaders(),
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
  DOM.btnConfirmUnlink.disabled = true;
  DOM.btnConfirmUnlink.innerText = 'Unlinking...';

  try {
    const headers = getAdminHeaders();
    const res = await fetch('/api/instance/logout', { method: 'POST', headers });
    const data = await res.json();

    if (data.success) {
      showToast('Device unlinked. Session reset.', 'info');
      DOM.unlinkConfirmDrawer.style.display = 'none';
      checkStatus();
    } else {
      showToast(data.error || 'Logout failed.', 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    DOM.btnConfirmUnlink.disabled = false;
    DOM.btnConfirmUnlink.innerText = 'Confirm Unlink';
  }
}

/* ==========================================================================
   API TOKEN STUDIO
   ========================================================================== */
async function loadTokens() {
  try {
    const res = await fetch('/api/tokens', { headers: getAdminHeaders() });
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

    const isPendingRevoke = STATE.pendingRevokeId === t.id;

    let actionsHtml = '';
    if (isPendingRevoke) {
      actionsHtml = `
        <span class="inline-revoke-confirm">
          <span>Revoke?</span>
          <button class="btn btn-danger btn-xs" onclick="executeRevokeToken('${t.id}')">Yes</button>
          <button class="btn btn-ghost btn-xs" onclick="cancelRevokeToken()">No</button>
        </span>
      `;
    } else {
      actionsHtml = `
        <button class="btn btn-ghost btn-xs" title="Apply to active cockpit session" onclick="useTokenInSession('${t.maskedToken}')">
          Use
        </button>
        <button class="btn btn-ghost btn-xs btn-ghost-danger" title="Revoke API key" onclick="promptRevokeToken('${t.id}')">
          Revoke
        </button>
      `;
    }

    return `
      <tr>
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td><code class="code-inline">${escapeHtml(t.maskedToken)}</code></td>
        <td class="tabular-num">${dateFormatted}</td>
        <td class="text-right">
          <div class="row-actions-cell">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function promptRevokeToken(id) {
  STATE.pendingRevokeId = id;
  renderTokensTable(STATE.tokens);
}

function cancelRevokeToken() {
  STATE.pendingRevokeId = null;
  renderTokensTable(STATE.tokens);
}

async function executeRevokeToken(id) {
  STATE.pendingRevokeId = null;
  try {
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
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

function useTokenInSession(maskedOrFullToken) {
  DOM.clientApiKeyInput.value = maskedOrFullToken;
  DOM.clientApiKeyInput.type = 'text';
  updateAuthModeStatus();
  updateSnippets();
  showToast(`Token applied to active cockpit session!`, 'success');
}

async function handleGenerateToken() {
  const name = DOM.tokenLabelInput.value.trim();
  if (!name) return;

  DOM.formCreateToken.querySelector('button').disabled = true;

  try {
    const res = await fetch('/api/tokens/generate', {
      method: 'POST',
      headers: getAdminHeaders(),
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

/* ==========================================================================
   SESSION AUTH STATE
   ========================================================================== */
function updateAuthModeStatus() {
  const key = DOM.clientApiKeyInput.value.trim();
  if (key) {
    DOM.authModeChip.className = 'auth-mode-chip auth-mode-active';
    DOM.authModeChip.innerText = '● Authenticated Session';
    DOM.btnClearSessionKey.style.display = 'flex';
  } else {
    DOM.authModeChip.className = 'auth-mode-chip auth-mode-open';
    DOM.authModeChip.innerText = 'Open Dev Mode';
    DOM.btnClearSessionKey.style.display = 'none';
  }
}

function clearSessionKey() {
  DOM.clientApiKeyInput.value = '';
  updateAuthModeStatus();
  updateSnippets();
  showToast('Reverted session to open mode.', 'info');
}

function getAdminHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = STATE.adminKey || sessionStorage.getItem('wa_admin_key') || '';
  if (key) {
    headers['x-admin-key'] = key;
  }
  return headers;
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const clientKey = DOM.clientApiKeyInput?.value?.trim();
  const adminKey = STATE.adminKey || sessionStorage.getItem('wa_admin_key') || '';
  const key = clientKey || adminKey;
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
}

/* ==========================================================================
   ADMIN SECURITY GATE & SESSION GOVERNANCE
   ========================================================================== */
async function initAdminAuth() {
  const storedKey = sessionStorage.getItem('wa_admin_key');
  if (storedKey) {
    STATE.adminKey = storedKey;
    const ok = await verifyAdminKey(storedKey, true);
    if (ok) {
      unlockCockpit();
      return;
    }
  }
  lockCockpit();
}

async function verifyAdminKey(key, silent = false) {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success;
  } catch (err) {
    if (!silent) console.error('Admin verification error:', err);
    return false;
  }
}

async function handleAdminUnlock() {
  if (!DOM.inputAdminKey) return;
  const key = DOM.inputAdminKey.value.trim();
  if (!key) {
    DOM.inputAdminKey.focus();
    return;
  }

  if (DOM.btnAdminUnlock) DOM.btnAdminUnlock.disabled = true;
  if (DOM.adminGateError) DOM.adminGateError.style.display = 'none';

  try {
    const ok = await verifyAdminKey(key);
    if (ok) {
      STATE.adminKey = key;
      sessionStorage.setItem('wa_admin_key', key);
      unlockCockpit();
      showToast('Admin session verified successfully!', 'success');
    } else {
      if (DOM.adminGateError) {
        DOM.adminGateError.innerText = 'Invalid Master Admin Key. Please check your credentials.';
        DOM.adminGateError.style.display = 'block';
      }
    }
  } finally {
    if (DOM.btnAdminUnlock) DOM.btnAdminUnlock.disabled = false;
  }
}

function unlockCockpit() {
  STATE.isAdminAuthenticated = true;
  if (DOM.adminGateOverlay) DOM.adminGateOverlay.style.display = 'none';
  if (DOM.adminSessionBadge) {
    DOM.adminSessionBadge.className = 'badge-count badge-unlocked';
    DOM.adminSessionBadge.innerText = 'Unlocked';
  }
  if (DOM.btnAdminLock) DOM.btnAdminLock.title = 'Admin session active — Click to lock cockpit';

  // Load telemetry and resources
  checkStatus();
  loadTokens();
  loadActivity();
  startActivityPolling();
}

function lockCockpit() {
  STATE.isAdminAuthenticated = false;
  STATE.adminKey = '';
  sessionStorage.removeItem('wa_admin_key');

  if (STATE.pollTimer) clearTimeout(STATE.pollTimer);
  if (STATE.activity.pollTimer) clearInterval(STATE.activity.pollTimer);

  if (DOM.adminSessionBadge) {
    DOM.adminSessionBadge.className = 'badge-count badge-locked';
    DOM.adminSessionBadge.innerText = 'Locked';
  }
  if (DOM.btnAdminLock) DOM.btnAdminLock.title = 'Cockpit is locked — Click to unlock';
  if (DOM.adminGateOverlay) DOM.adminGateOverlay.style.display = 'flex';
  if (DOM.inputAdminKey) {
    DOM.inputAdminKey.value = '';
    DOM.inputAdminKey.focus();
  }
  if (DOM.adminGateError) DOM.adminGateError.style.display = 'none';
}

function toggleAdminLock() {
  if (STATE.isAdminAuthenticated) {
    lockCockpit();
    showToast('Admin session locked.', 'info');
  } else {
    if (DOM.adminGateOverlay) DOM.adminGateOverlay.style.display = 'flex';
    if (DOM.inputAdminKey) DOM.inputAdminKey.focus();
  }
}

function toggleAdminKeyVisibility() {
  if (!DOM.inputAdminKey) return;
  const isPass = DOM.inputAdminKey.type === 'password';
  DOM.inputAdminKey.type = isPass ? 'text' : 'password';
  if (DOM.adminEyeIcon) {
    DOM.adminEyeIcon.innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
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

function switchConsoleTab(tab) {
  STATE.activeConsoleTab = tab;

  if (tab === 'response') {
    DOM.tabConsoleResponse.classList.add('active');
    DOM.tabConsoleSnippets.classList.remove('active');
    DOM.paneConsoleResponse.style.display = 'block';
    DOM.paneConsoleSnippets.style.display = 'none';
    DOM.snippetLangSelector.style.display = 'none';
    DOM.btnCopyResponse.style.display = 'inline-flex';
    DOM.btnCopySnippet.style.display = 'none';
  } else {
    DOM.tabConsoleResponse.classList.remove('active');
    DOM.tabConsoleSnippets.classList.add('active');
    DOM.paneConsoleResponse.style.display = 'none';
    DOM.paneConsoleSnippets.style.display = 'block';
    DOM.snippetLangSelector.style.display = 'flex';
    DOM.btnCopyResponse.style.display = 'none';
    DOM.btnCopySnippet.style.display = 'inline-flex';
  }
}

function inspectResponse(status, latencyMs, payload) {
  // Ensure we switch to the response tab to show the feedback immediately
  switchConsoleTab('response');

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
      showToast('WhatsApp message dispatched successfully!', 'success');
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
  const defaultPhone = STATE.whitelistPhone || '201012345678';
  let code = '';

  let endpoint = '/api/messages/send';
  let payloadObj = {
    number: DOM.textMsgPhone.value.trim() || defaultPhone,
    message: DOM.textMsgBody.value.trim() || 'Hello from WhatsApp REST Gateway!'
  };

  if (mode === 'media') {
    endpoint = '/api/messages/send-media';
    payloadObj = {
      number: DOM.mediaMsgPhone.value.trim() || defaultPhone,
      type: DOM.mediaMsgType.value || 'image',
      mediaUrl: DOM.mediaMsgUrl.value.trim() || 'https://example.com/sample.jpg',
      caption: DOM.mediaMsgCaption.value.trim() || 'Monthly Statement'
    };
  } else if (mode === 'otp') {
    endpoint = '/api/otp/send';
    payloadObj = {
      number: DOM.otpRecipientPhone.value.trim() || defaultPhone,
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
   LIVE DISPATCH AUDIT FEED (PAGINATED & SEARCHABLE)
   ========================================================================== */
async function loadActivity() {
  const { page, limit, type, status, search } = STATE.activity;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (type && type !== 'ALL') params.append('type', type);
  if (status && status !== 'ALL') params.append('status', status);
  if (search && search.trim()) params.append('search', search.trim());

  try {
    const res = await fetch(`/api/activity?${params.toString()}`, { headers: getAdminHeaders() });
    const data = await res.json();

    if (data.success) {
      if (data.stats) {
        DOM.activityStatsSummary.innerText = `${data.stats.total} total (${data.stats.successRate} success)`;
      }

      if (data.pagination) {
        STATE.activity.total = data.pagination.total;
        STATE.activity.totalPages = data.pagination.totalPages;
        STATE.activity.page = data.pagination.page;
        STATE.activity.hasNext = data.pagination.hasNext;
        STATE.activity.hasPrev = data.pagination.hasPrev;
      }

      renderActivityTable(data.data || []);
      renderPaginationControls();
    }
  } catch (err) {
    console.error('Failed to load activity:', err);
  }
}

function renderActivityTable(activities) {
  if (!DOM.activityTableBody) return;

  if (activities.length === 0) {
    const isFiltered = STATE.activity.search || STATE.activity.type !== 'ALL' || STATE.activity.status !== 'ALL';
    DOM.activityTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty-row">
          ${isFiltered 
            ? 'No dispatches match your search or filter criteria. <button class="btn btn-ghost btn-xs" onclick="resetActivityFilters()">Reset Filters</button>'
            : 'No dispatches recorded in this session. Dispatch your first message from the studio above.'
          }
        </td>
      </tr>
    `;
    return;
  }

  DOM.activityTableBody.innerHTML = activities.map(a => {
    const dateObj = new Date(a.timestamp);
    const timeFormatted = dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const fullIso = dateObj.toISOString();

    let statusPillClass = 'pill-sent';
    if (a.status === 'FAILED') statusPillClass = 'pill-failed';
    if (a.status === 'VERIFIED') statusPillClass = 'pill-verified';

    const rawSummary = a.preview || a.error || '—';
    const escapedSummary = escapeHtml(rawSummary);

    return `
      <tr>
        <td class="tabular-num" title="${fullIso}">${timeFormatted}</td>
        <td><strong class="code-inline">${escapeHtml(a.type)}</strong></td>
        <td><span class="mono-val">${a.recipient ? `+${escapeHtml(a.recipient)}` : '—'}</span></td>
        <td><span class="table-status-pill ${statusPillClass}">${escapeHtml(a.status)}</span></td>
        <td>
          <div class="activity-summary-cell" title="${escapedSummary}">${escapedSummary}</div>
        </td>
        <td class="text-right">
          <button class="btn btn-ghost btn-xs btn-ghost-danger" title="Delete record" onclick="handleDeleteActivity('${a.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPaginationControls() {
  const { page, limit, total, totalPages, hasNext, hasPrev } = STATE.activity;

  // Info label
  if (total === 0) {
    DOM.activityPaginationInfo.innerText = 'Showing 0 of 0 dispatches';
  } else {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    DOM.activityPaginationInfo.innerText = `Showing ${start}–${end} of ${total} dispatches`;
  }

  // Nav buttons state
  DOM.btnFirstPage.disabled = page <= 1;
  DOM.btnPrevPage.disabled = !hasPrev;
  DOM.btnNextPage.disabled = !hasNext;
  DOM.btnLastPage.disabled = page >= totalPages;

  // Render numbered page buttons
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  let html = '';
  if (startPage > 1) {
    html += `<button class="btn-page-number" onclick="goToActivityPage(1)">1</button>`;
    if (startPage > 2) html += `<span class="pagination-ellipsis">&hellip;</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="btn-page-number ${i === page ? 'active' : ''}" onclick="goToActivityPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">&hellip;</span>`;
    html += `<button class="btn-page-number" onclick="goToActivityPage(${totalPages})">${totalPages}</button>`;
  }

  DOM.activityPageNumbers.innerHTML = html;
}

function goToActivityPage(page) {
  STATE.activity.page = page;
  loadActivity();
}

function resetActivityFilters() {
  STATE.activity.page = 1;
  STATE.activity.search = '';
  STATE.activity.type = 'ALL';
  STATE.activity.status = 'ALL';
  DOM.activitySearchInput.value = '';
  DOM.btnClearSearch.style.display = 'none';
  DOM.activityTypeFilter.value = 'ALL';
  DOM.activityStatusFilter.value = 'ALL';
  loadActivity();
}

async function handleDeleteActivity(id) {
  try {
    const res = await fetch(`/api/activity/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
    const data = await res.json();
    if (data.success) {
      showToast('Activity record removed.', 'info');
      loadActivity();
    }
  } catch (err) {
    showToast(`Failed to delete record: ${err.message}`, 'error');
  }
}

async function handleClearActivity() {
  DOM.btnConfirmClearActivity.disabled = true;
  DOM.btnConfirmClearActivity.innerText = 'Clearing...';

  try {
    await fetch('/api/activity/clear', { method: 'DELETE', headers: getAdminHeaders() });
    showToast('Activity feed cleared.', 'info');
    DOM.clearConfirmDrawer.style.display = 'none';
    STATE.activity.page = 1;
    loadActivity();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.btnConfirmClearActivity.disabled = false;
    DOM.btnConfirmClearActivity.innerText = 'Confirm Clear';
  }
}

function toggleLiveActivityPolling() {
  STATE.activity.isLive = !STATE.activity.isLive;

  if (STATE.activity.isLive) {
    DOM.activityLiveToggle.classList.add('active');
    DOM.liveToggleLabel.innerText = 'Live Polling';
    DOM.headerActivityBeacon.classList.add('active');
    startActivityPolling();
    showToast('Live activity polling resumed.', 'info');
  } else {
    DOM.activityLiveToggle.classList.remove('active');
    DOM.liveToggleLabel.innerText = 'Polling Paused';
    DOM.headerActivityBeacon.classList.remove('active');
    if (STATE.activity.pollTimer) clearInterval(STATE.activity.pollTimer);
    showToast('Live polling paused.', 'info');
  }
}

function startActivityPolling() {
  if (STATE.activity.pollTimer) clearInterval(STATE.activity.pollTimer);
  STATE.activity.pollTimer = setInterval(() => {
    if (STATE.activity.isLive) {
      loadActivity();
    }
  }, 6000);
}

/* ==========================================================================
   CLIPBOARD UTILITY
   ========================================================================== */
function copyText(text, successMsg = 'Copied to clipboard!') {
  if (!text) return;
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
  // Global Header navigation
  DOM.btnToggleTokens.addEventListener('click', () => {
    DOM.cardTokens.scrollIntoView({ behavior: 'smooth' });
    DOM.tokenLabelInput.focus();
  });

  DOM.btnScrollActivity.addEventListener('click', () => {
    DOM.cardActivity.scrollIntoView({ behavior: 'smooth' });
    DOM.activitySearchInput.focus();
  });

  DOM.btnRefreshStatus.addEventListener('click', () => {
    showToast('Refreshing status...', 'info');
    checkStatus();
  });

  // Device Unlink with Inline Confirmation
  DOM.btnLogoutDevice.addEventListener('click', () => {
    DOM.unlinkConfirmDrawer.style.display = 'flex';
  });
  DOM.btnCancelUnlink.addEventListener('click', () => {
    DOM.unlinkConfirmDrawer.style.display = 'none';
  });
  DOM.btnConfirmUnlink.addEventListener('click', handleLogoutDevice);

  // Pairing Hub
  DOM.tabBtnQr.addEventListener('click', () => switchPairingTab('qr'));
  DOM.tabBtnPhone.addEventListener('click', () => switchPairingTab('phone'));
  DOM.btnForceQr.addEventListener('click', () => loadQrCode(true));
  DOM.btnRequestPairingCode.addEventListener('click', handleRequestPairingCode);
  DOM.btnCopyPairingCode.addEventListener('click', () => copyText(DOM.displayPairingCode.innerText, 'Pairing code copied!'));

  // Auth Key Bar
  DOM.btnToggleKeyVisibility.addEventListener('click', () => {
    const isPass = DOM.clientApiKeyInput.type === 'password';
    DOM.clientApiKeyInput.type = isPass ? 'text' : 'password';
    const eye = document.getElementById('eye-icon');
    if (eye) {
      eye.innerHTML = isPass
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
  });
  DOM.clientApiKeyInput.addEventListener('input', () => {
    updateAuthModeStatus();
    updateSnippets();
  });
  DOM.btnClearSessionKey.addEventListener('click', clearSessionKey);

  // Tokens Studio
  DOM.btnCopyNewToken.addEventListener('click', () => copyText(DOM.newTokenVal.innerText, 'API Key copied!'));
  DOM.btnUseNewToken.addEventListener('click', () => {
    useTokenInSession(DOM.newTokenVal.innerText);
  });

  // Playground Modes
  DOM.tabModeText.addEventListener('click', () => switchPlaygroundMode('text'));
  DOM.tabModeMedia.addEventListener('click', () => switchPlaygroundMode('media'));
  DOM.tabModeOtp.addEventListener('click', () => switchPlaygroundMode('otp'));

  // Live Snippet auto-updating on input
  DOM.textMsgPhone.addEventListener('input', updateSnippets);
  DOM.textMsgBody.addEventListener('input', updateSnippets);
  DOM.mediaMsgPhone.addEventListener('input', updateSnippets);
  DOM.mediaMsgType.addEventListener('change', updateSnippets);
  DOM.mediaMsgUrl.addEventListener('input', updateSnippets);
  DOM.mediaMsgCaption.addEventListener('input', updateSnippets);
  DOM.otpRecipientPhone.addEventListener('input', updateSnippets);
  DOM.otpAppTitle.addEventListener('input', updateSnippets);

  // Playground Form Dispatches
  DOM.btnSubmitText.addEventListener('click', handleSendText);
  DOM.btnSubmitMedia.addEventListener('click', handleSendMedia);
  DOM.btnSubmitOtp.addEventListener('click', handleSendOtp);
  DOM.btnSubmitVerifyOtp.addEventListener('click', handleVerifyOtp);

  // Integrated Console Tabs
  DOM.tabConsoleResponse.addEventListener('click', () => switchConsoleTab('response'));
  DOM.tabConsoleSnippets.addEventListener('click', () => switchConsoleTab('snippets'));
  DOM.langTabs.forEach(btn => {
    btn.addEventListener('click', () => switchLangTab(btn.getAttribute('data-lang')));
  });
  DOM.btnCopyResponse.addEventListener('click', () => copyText(DOM.responseOutputBox.innerText, 'Response JSON copied!'));
  DOM.btnCopySnippet.addEventListener('click', () => copyText(DOM.codeSnippetBox.innerText, 'Code snippet copied!'));

  // Live Activity Feed Actions
  DOM.activityLiveToggle.addEventListener('click', toggleLiveActivityPolling);
  DOM.btnRefreshActivity.addEventListener('click', () => {
    showToast('Refreshing activity feed...', 'info');
    loadActivity();
  });

  // Clear Activity with Inline Confirmation
  DOM.btnClearActivity.addEventListener('click', () => {
    DOM.clearConfirmDrawer.style.display = 'flex';
  });
  DOM.btnCancelClearActivity.addEventListener('click', () => {
    DOM.clearConfirmDrawer.style.display = 'none';
  });
  DOM.btnConfirmClearActivity.addEventListener('click', handleClearActivity);

  // Search Input with Debounce & Clear
  DOM.activitySearchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    DOM.btnClearSearch.style.display = val ? 'block' : 'none';
    if (STATE.activity.searchDebounceTimer) clearTimeout(STATE.activity.searchDebounceTimer);
    STATE.activity.searchDebounceTimer = setTimeout(() => {
      STATE.activity.search = val;
      STATE.activity.page = 1;
      loadActivity();
    }, 280);
  });

  DOM.btnClearSearch.addEventListener('click', () => {
    DOM.activitySearchInput.value = '';
    DOM.btnClearSearch.style.display = 'none';
    STATE.activity.search = '';
    STATE.activity.page = 1;
    loadActivity();
  });

  // Filters & Page Size
  DOM.activityTypeFilter.addEventListener('change', (e) => {
    STATE.activity.type = e.target.value;
    STATE.activity.page = 1;
    loadActivity();
  });

  DOM.activityStatusFilter.addEventListener('change', (e) => {
    STATE.activity.status = e.target.value;
    STATE.activity.page = 1;
    loadActivity();
  });

  DOM.activityPageSize.addEventListener('change', (e) => {
    STATE.activity.limit = parseInt(e.target.value, 10) || 10;
    STATE.activity.page = 1;
    loadActivity();
  });

  // Pagination navigation buttons
  DOM.btnFirstPage.addEventListener('click', () => goToActivityPage(1));
  DOM.btnPrevPage.addEventListener('click', () => goToActivityPage(STATE.activity.page - 1));
  DOM.btnNextPage.addEventListener('click', () => goToActivityPage(STATE.activity.page + 1));
  DOM.btnLastPage.addEventListener('click', () => goToActivityPage(STATE.activity.totalPages));

  // Admin Security Gate & Session Controls
  if (DOM.btnAdminLock) DOM.btnAdminLock.addEventListener('click', toggleAdminLock);
  if (DOM.btnToggleAdminKeyVis) DOM.btnToggleAdminKeyVis.addEventListener('click', toggleAdminKeyVisibility);
  if (DOM.formAdminLogin) {
    DOM.formAdminLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAdminUnlock();
    });
  }
}

// Global scope bindings for inline HTML handlers
window.handleGenerateToken = handleGenerateToken;
window.promptRevokeToken = promptRevokeToken;
window.cancelRevokeToken = cancelRevokeToken;
window.executeRevokeToken = executeRevokeToken;
window.useTokenInSession = useTokenInSession;
window.goToActivityPage = goToActivityPage;
window.resetActivityFilters = resetActivityFilters;
window.handleDeleteActivity = handleDeleteActivity;
window.handleAdminUnlock = handleAdminUnlock;
window.toggleAdminLock = toggleAdminLock;
window.toggleAdminKeyVisibility = toggleAdminKeyVisibility;

// Bootstrap Application
initEventListeners();
updateAuthModeStatus();
updateSnippets();
initAdminAuth();
