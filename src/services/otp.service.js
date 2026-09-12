import crypto from 'node:crypto';
import { whatsappService } from './whatsapp.service.js';
import { activityService } from './activity.service.js';

class OtpService {
  constructor() {
    this.store = new Map();
    this.cooldowns = new Map();
    this.DEFAULT_EXPIRATION_MS = 5 * 60 * 1000;
    this.MAX_ATTEMPTS = 3;
    this.COOLDOWN_MS = 45 * 1000; // 45 seconds between requests for same number

    setInterval(() => this.cleanupExpired(), 2 * 60 * 1000).unref();
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [phone, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(phone);
      }
    }
    for (const [phone, timestamp] of this.cooldowns.entries()) {
      if (now > timestamp + this.COOLDOWN_MS) {
        this.cooldowns.delete(phone);
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

    const lastRequest = this.cooldowns.get(cleanNumber);
    if (lastRequest && (Date.now() - lastRequest) < this.COOLDOWN_MS) {
      const waitSec = Math.ceil((this.COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
      throw new Error(`Please wait ${waitSec} second(s) before requesting another OTP for this phone number.`);
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
    this.cooldowns.set(cleanNumber, Date.now());

    const message = 
`🔐 *${appName} Verification*

Your one-time verification code is:
👉 *${code}* 👈

⏱️ This code will expire in *${expiresInMinutes} minutes*.
⚠️ *Security Notice:* Never share this code with anyone.`;

    const startTime = Date.now();
    try {
      const sendResult = await whatsappService.sendTextMessage(cleanNumber, message);

      activityService.log({
        type: 'OTP_REQUEST',
        recipient: cleanNumber,
        status: 'SENT',
        messageId: sendResult.messageId,
        preview: `OTP dispatched for ${appName} (expires in ${expiresInMinutes}m)`,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        phoneNumber: cleanNumber,
        expiresInSeconds: expiresInMinutes * 60,
        messageId: sendResult.messageId
      };
    } catch (err) {
      activityService.log({
        type: 'OTP_REQUEST',
        recipient: cleanNumber,
        status: 'FAILED',
        preview: `OTP dispatch failed for ${appName}`,
        error: err.message,
        durationMs: Date.now() - startTime
      });
      throw err;
    }
  }

  verifyOtp(phoneNumber, userCode) {
    const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
    const record = this.store.get(cleanNumber);

    if (!record) {
      const result = {
        success: false,
        status: 'NOT_FOUND',
        message: 'No active verification code found for this phone number. Please request a new one.'
      };
      activityService.log({
        type: 'OTP_VERIFY',
        recipient: cleanNumber,
        status: 'FAILED',
        error: result.message
      });
      return result;
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(cleanNumber);
      const result = {
        success: false,
        status: 'EXPIRED',
        message: 'The verification code has expired. Please request a new one.'
      };
      activityService.log({
        type: 'OTP_VERIFY',
        recipient: cleanNumber,
        status: 'EXPIRED',
        error: result.message
      });
      return result;
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(cleanNumber);
      const result = {
        success: false,
        status: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum attempts exceeded. This code is invalidated. Please request a new code.'
      };
      activityService.log({
        type: 'OTP_VERIFY',
        recipient: cleanNumber,
        status: 'FAILED',
        error: result.message
      });
      return result;
    }

    const candidateStr = String(userCode || '').trim();
    const isMatch = () => {
      const bufA = Buffer.from(record.code);
      const bufB = Buffer.from(candidateStr);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    };

    if (isMatch()) {
      this.store.delete(cleanNumber);
      const result = {
        success: true,
        status: 'VERIFIED',
        message: 'Phone number verified successfully!'
      };
      activityService.log({
        type: 'OTP_VERIFY',
        recipient: cleanNumber,
        status: 'VERIFIED',
        preview: `Phone ${cleanNumber} verified`
      });
      return result;
    }

    record.attempts += 1;
    const attemptsLeft = this.MAX_ATTEMPTS - record.attempts;

    const result = {
      success: false,
      status: 'INVALID_CODE',
      attemptsLeft,
      message: `Incorrect verification code. You have ${attemptsLeft} attempt(s) remaining.`
    };
    activityService.log({
      type: 'OTP_VERIFY',
      recipient: cleanNumber,
      status: 'FAILED',
      error: `Incorrect code entered (${attemptsLeft} tries left)`
    });
    return result;
  }
}

export const otpService = new OtpService();
