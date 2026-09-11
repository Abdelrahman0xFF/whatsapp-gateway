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
