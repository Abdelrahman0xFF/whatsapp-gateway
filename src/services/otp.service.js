import crypto from 'node:crypto';
import { whatsappService } from './whatsapp.service.js';

class OtpService {
  constructor() {
    this.store = new Map();
    this.DEFAULT_EXPIRATION_MS = 5 * 60 * 1000;
    this.MAX_ATTEMPTS = 3;

    setInterval(() => this.cleanupExpired(), 2 * 60 * 1000).unref();
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [phone, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(phone);
      }
    }
  }

  generateCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  async requestOtp(phoneNumber, appName = 'My App', length = 6, expiresInMinutes = 5) {
    const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      throw new Error(`Invalid phone number "${phoneNumber}". Provide a valid phone number with country code.`);
    }

    const code = this.generateCode(length);
    const expirationMs = expiresInMinutes * 60 * 1000;
    const expiresAt = Date.now() + expirationMs;

    this.store.set(cleanNumber, {
      code,
      expiresAt,
      attempts: 0,
      appName
    });

    const message = 
`🔐 *${appName} Verification*

Your one-time verification code is:
👉 *${code}* 👈

⏱️ This code will expire in *${expiresInMinutes} minutes*.
⚠️ *Security Notice:* Never share this code with anyone.`;

    const sendResult = await whatsappService.sendTextMessage(cleanNumber, message);

    return {
      success: true,
      phoneNumber: cleanNumber,
      expiresInSeconds: expiresInMinutes * 60,
      messageId: sendResult.messageId
    };
  }

  verifyOtp(phoneNumber, userCode) {
    const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
    const record = this.store.get(cleanNumber);

    if (!record) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: 'No active verification code found for this phone number. Please request a new one.'
      };
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(cleanNumber);
      return {
        success: false,
        status: 'EXPIRED',
        message: 'The verification code has expired. Please request a new one.'
      };
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(cleanNumber);
      return {
        success: false,
        status: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum attempts exceeded. This code is invalidated. Please request a new code.'
      };
    }

    if (record.code === userCode.toString().trim()) {
      this.store.delete(cleanNumber);
      return {
        success: true,
        status: 'VERIFIED',
        message: 'Phone number verified successfully!'
      };
    }

    record.attempts += 1;
    const attemptsLeft = this.MAX_ATTEMPTS - record.attempts;

    return {
      success: false,
      status: 'INVALID_CODE',
      attemptsLeft,
      message: `Incorrect verification code. You have ${attemptsLeft} attempt(s) remaining.`
    };
  }
}

export const otpService = new OtpService();
