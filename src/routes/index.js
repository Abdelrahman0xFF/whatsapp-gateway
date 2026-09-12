import { Router } from 'express';
import messageRoutes from './message.routes.js';
import otpRoutes from './otp.routes.js';
import instanceRoutes from './instance.routes.js';
import healthRoutes from './health.routes.js';
import tokenRoutes from './token.routes.js';
import activityRoutes from './activity.routes.js';
import webhookRoutes from './webhook.routes.js';
import adminRoutes from './admin.routes.js';
import { messageController } from '../controllers/message.controller.js';
import { validateSendMessage } from '../middlewares/validator.middleware.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';
import { messageRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/messages', messageRoutes);
router.use('/otp', otpRoutes);
router.use('/instance', instanceRoutes);
router.use('/health', healthRoutes);
router.use('/tokens', tokenRoutes);
router.use('/activity', activityRoutes);
router.use('/webhooks', webhookRoutes);

// Convenience legacy alias
router.post('/send-message', apiKeyAuth, messageRateLimiter, validateSendMessage, (req, res, next) => {
  messageController.sendMessage(req, res, next);
});

export default router;
