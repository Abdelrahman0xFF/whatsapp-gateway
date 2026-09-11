import { Router } from 'express';
import { otpController } from '../controllers/otp.controller.js';
import { validateRequestOtp, validateVerifyOtp } from '../middlewares/validator.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { messageRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/send', apiKeyAuth, messageRateLimiter, validateRequestOtp, (req, res, next) => {
  otpController.requestOtp(req, res, next);
});

router.post('/request', apiKeyAuth, messageRateLimiter, validateRequestOtp, (req, res, next) => {
  otpController.requestOtp(req, res, next);
});

router.post('/verify', apiKeyAuth, validateVerifyOtp, (req, res, next) => {
  otpController.verifyOtp(req, res, next);
});

export default router;
