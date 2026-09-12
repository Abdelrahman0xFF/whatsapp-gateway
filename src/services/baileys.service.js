import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { ENV } from '../config/env.js';
import { activityService } from './activity.service.js';
import { webhookService } from './webhook.service.js';

class BaileysService {
  constructor() {
    this.authFolder = path.resolve(ENV.SESSION_DATA_PATH);
    this.sock = null;
    this.qrString = null;
    this.qrImageBase64 = null;
    this.connectionState = 'disconnected';
    this.isReconnecting = false;
    this.pairingCode = null;
    this.logger = pino({ level: 'silent' });
    this.watchdogStarted = false;
  }

  _cleanupCurrentSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners();
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
  }

  _startWatchdog() {
    if (this.watchdogStarted) return;
    this.watchdogStarted = true;

    setInterval(async () => {
      if (this.connectionState === 'disconnected' && !this.isReconnecting) {
        console.log('[WhatsApp Watchdog] Reconnecting disconnected WhatsApp socket...');
        try {
          await this.init();
        } catch (err) {
          console.error('[WhatsApp Watchdog] Reconnection attempt failed:', err.message);
        }
      }
    }, 45000).unref();
  }

  async init() {
    this._startWatchdog();

    if (this.sock && this.connectionState === 'open') {
      return;
    }

    this._cleanupCurrentSocket();

    try {
      if (!fs.existsSync(this.authFolder)) {
        fs.mkdirSync(this.authFolder, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1043857760]
      }));

      this.connectionState = 'connecting';

      const createSocket = makeWASocket.default || makeWASocket;
      this.sock = createSocket({
        version,
        logger: this.logger,
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        generateHighQualityLinkPreview: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Incoming messages webhook
      this.sock.ev.on('messages.upsert', async (upsert) => {
        webhookService.dispatch('messages.upsert', upsert);
      });

      // Message delivery & read receipts webhook
      this.sock.ev.on('messages.update', async (updates) => {
        webhookService.dispatch('messages.update', updates);
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrString = qr;
          try {
            this.qrImageBase64 = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
          } catch (err) {
            console.error('[WhatsApp Engine] QR Image generation error:', err);
          }
        }

        if (connection === 'close') {
          this.connectionState = 'disconnected';
          webhookService.dispatch('connection.update', { connection: 'close', state: 'disconnected' });

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isRestartRequired = statusCode === DisconnectReason.restartRequired;

          console.log(`[WhatsApp Engine] Connection closed. Code: ${statusCode}. Logged out: ${isLoggedOut}`);

          if (isLoggedOut) {
            this.qrString = null;
            this.qrImageBase64 = null;
            this.pairingCode = null;
            await this.clearAuthFolder();
            setTimeout(() => this.init(), 1000);
          } else {
            const reconnectDelay = isRestartRequired ? 200 : 2000;
            if (!this.isReconnecting) {
              this.isReconnecting = true;
              setTimeout(() => {
                this.isReconnecting = false;
                this.init();
              }, reconnectDelay);
            }
          }
        } else if (connection === 'open') {
          this.connectionState = 'open';
          this.qrString = null;
          this.qrImageBase64 = null;
          this.pairingCode = null;
          console.log('✅ [WhatsApp Engine] WhatsApp device linked successfully!');
          webhookService.dispatch('connection.update', {
            connection: 'open',
            state: 'open',
            user: this.sock?.user ? { id: this.sock.user.id, name: this.sock.user.name } : null
          });
        }
      });
    } catch (err) {
      console.error('[WhatsApp Engine] Initialization error:', err);
      this.connectionState = 'disconnected';
    }
  }

  async checkConnection() {
    const connected = this.connectionState === 'open';
    return {
      engine: 'embedded-baileys',
      instance: 'embedded',
      state: this.connectionState,
      connected,
      user: this.sock?.user ? { id: this.sock.user.id, name: this.sock.user.name } : null
    };
  }

  async getQrCode() {
    if (this.connectionState === 'open') {
      return {
        success: true,
        engine: 'embedded-baileys',
        state: 'open',
        connected: true,
        qr: null,
        message: 'WhatsApp is already connected and authenticated.'
      };
    }

    return {
      success: true,
      engine: 'embedded-baileys',
      state: this.connectionState,
      connected: false,
      qr: this.qrImageBase64,
      code: this.qrString,
      pairingCode: this.pairingCode,
      message: this.qrImageBase64 ? 'QR code available for scan.' : 'Generating QR code...'
    };
  }

  async requestPairingCode(phoneNumber) {
    if (this.connectionState === 'open') {
      throw new Error('WhatsApp is already connected.');
    }

    const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      throw new Error('Please provide a valid phone number with country code (e.g. 201012345678).');
    }

    if (!this.sock) {
      await this.init();
      await new Promise(r => setTimeout(r, 1000));
    }

    try {
      const rawCode = await this.sock.requestPairingCode(cleanNumber);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      this.pairingCode = formattedCode;

      return {
        success: true,
        phoneNumber: cleanNumber,
        pairingCode: formattedCode,
        instructions: [
          'Open WhatsApp on your phone',
          'Tap Settings > Linked Devices > Link a Device',
          'Tap "Link with phone number instead"',
          `Enter the 8-digit code: ${formattedCode}`
        ]
      };
    } catch (err) {
      throw new Error(`Failed to generate pairing code: ${err.message}`);
    }
  }

  async sendTextMessage(number, text) {
    if (this.connectionState !== 'open' || !this.sock) {
      throw new Error(
        'WhatsApp is not connected. Please open the dashboard to link your WhatsApp account.'
      );
    }

    const cleanNumber = number.toString().replace(/\D/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;
    const startTime = Date.now();

    try {
      const sent = await this.sock.sendMessage(jid, { text });
      const durationMs = Date.now() - startTime;

      activityService.log({
        type: 'TEXT',
        recipient: cleanNumber,
        status: 'SENT',
        messageId: sent?.key?.id || null,
        preview: text,
        durationMs
      });

      return {
        success: true,
        recipient: cleanNumber,
        messageId: sent?.key?.id || null,
        status: 'SENT',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      activityService.log({
        type: 'TEXT',
        recipient: cleanNumber,
        status: 'FAILED',
        preview: text,
        error: err.message,
        durationMs
      });
      throw new Error(`Failed to send WhatsApp message: ${err.message}`);
    }
  }

  async sendMediaMessage({ number, type = 'image', mediaUrl, mediaBase64, caption, fileName, mimetype, ptt }) {
    if (this.connectionState !== 'open' || !this.sock) {
      throw new Error(
        'WhatsApp is not connected. Please open the dashboard to link your WhatsApp account.'
      );
    }

    const cleanNumber = number.toString().replace(/\D/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;
    const mediaType = (type || 'image').toLowerCase();
    const startTime = Date.now();

    let buffer;
    if (mediaBase64) {
      const cleanBase64 = mediaBase64.replace(/^data:([a-zA-Z0-9/+-]+);base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else if (mediaUrl) {
      try {
        const response = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
          throw new Error(`Failed to download media from URL (HTTP ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        if (!mimetype) {
          mimetype = response.headers.get('content-type') || undefined;
        }
      } catch (e) {
        throw new Error(`Could not fetch media from URL: ${e.message}`);
      }
    } else {
      throw new Error('Either "mediaUrl" or "mediaBase64" is required to send media.');
    }

    if (buffer.length > 25 * 1024 * 1024) {
      throw new Error('Media file exceeds maximum size limit of 25MB.');
    }

    let payload = {};
    if (mediaType === 'image') {
      payload = {
        image: buffer,
        caption: caption || undefined,
        mimetype: mimetype || 'image/jpeg'
      };
    } else if (mediaType === 'document') {
      payload = {
        document: buffer,
        caption: caption || undefined,
        mimetype: mimetype || 'application/pdf',
        fileName: fileName || 'document.pdf'
      };
    } else if (mediaType === 'audio') {
      payload = {
        audio: buffer,
        mimetype: mimetype || 'audio/mp4',
        ptt: Boolean(ptt)
      };
    } else if (mediaType === 'video') {
      payload = {
        video: buffer,
        caption: caption || undefined,
        mimetype: mimetype || 'video/mp4'
      };
    } else {
      throw new Error(`Unsupported media type "${type}". Allowed: image, document, audio, video.`);
    }

    try {
      const sent = await this.sock.sendMessage(jid, payload);
      const durationMs = Date.now() - startTime;

      activityService.log({
        type: 'MEDIA',
        recipient: cleanNumber,
        status: 'SENT',
        messageId: sent?.key?.id || null,
        preview: `${mediaType.toUpperCase()}: ${caption || fileName || 'media attachment'}`,
        durationMs
      });

      return {
        success: true,
        recipient: cleanNumber,
        type: mediaType,
        messageId: sent?.key?.id || null,
        status: 'SENT',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      activityService.log({
        type: 'MEDIA',
        recipient: cleanNumber,
        status: 'FAILED',
        preview: `${mediaType.toUpperCase()}: ${caption || fileName || 'media attachment'}`,
        error: err.message,
        durationMs
      });
      throw new Error(`Failed to send WhatsApp media message: ${err.message}`);
    }
  }

  async logoutInstance() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {}

    await this.clearAuthFolder();
    this.connectionState = 'disconnected';
    this.qrString = null;
    this.qrImageBase64 = null;
    this.pairingCode = null;

    setTimeout(() => this.init(), 1000);

    return {
      success: true,
      message: 'Logged out successfully. Generating fresh pairing credentials...'
    };
  }

  async clearAuthFolder() {
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        fs.mkdirSync(this.authFolder, { recursive: true });
      }
    } catch (err) {
      console.error('[WhatsApp Engine] Error clearing auth folder:', err);
    }
  }
}

export const baileysService = new BaileysService();
