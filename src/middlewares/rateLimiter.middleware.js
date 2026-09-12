import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

export const messageRateLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down to prevent WhatsApp spam flags.'
  }
});

export const adminRateLimiter = rateLimit({
  windowMs: ENV.ADMIN_RATE_LIMIT_WINDOW_MS,
  max: ENV.ADMIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many administrative authorization attempts. Please wait before retrying.',
    code: 'ERR_ADMIN_RATE_LIMITED'
  }
});

