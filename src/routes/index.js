import { Router } from 'express';
import messageRoutes from './message.routes.js';
import otpRoutes from './otp.routes.js';
import instanceRoutes from './instance.routes.js';
import healthRoutes from './health.routes.js';
import { messageController } from '../controllers/message.controller.js';
import { validateSendMessage } from '../middlewares/validator.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { messageRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use('/messages', messageRoutes);
router.use('/otp', otpRoutes);
router.use('/instance', instanceRoutes);
router.use('/health', healthRoutes);

router.post('/send-message', apiKeyAuth, messageRateLimiter, validateSendMessage, (req, res, next) => {
  messageController.sendMessage(req, res, next);
});

export default router;
