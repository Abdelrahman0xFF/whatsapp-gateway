import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { validateSendMessage, validateSendMedia } from '../middlewares/validator.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { messageRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/send', apiKeyAuth, messageRateLimiter, validateSendMessage, (req, res, next) => {
  messageController.sendMessage(req, res, next);
});

router.post('/send-media', apiKeyAuth, messageRateLimiter, validateSendMedia, (req, res, next) => {
  messageController.sendMedia(req, res, next);
});

router.post('/send-bulk', apiKeyAuth, messageRateLimiter, (req, res, next) => {
  messageController.sendBulk(req, res, next);
});

export default router;
