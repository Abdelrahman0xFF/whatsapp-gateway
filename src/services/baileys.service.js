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

  async init() {
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
        'WhatsApp is not connected. Please open http://localhost:7860 to link your WhatsApp account.'
      );
    }

    const cleanNumber = number.toString().replace(/\D/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;

    try {
      const sent = await this.sock.sendMessage(jid, { text });
      return {
        success: true,
        recipient: cleanNumber,
        messageId: sent?.key?.id || null,
        status: 'SENT',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Failed to send WhatsApp message: ${err.message}`);
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
