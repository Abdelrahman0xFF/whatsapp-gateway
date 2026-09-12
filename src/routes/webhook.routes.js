import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { apiKeyAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status', (req, res) => {
  webhookController.getStatus(req, res);
});

router.post('/configure', apiKeyAuth, (req, res) => {
  webhookController.updateWebhook(req, res);
});

router.post('/test', apiKeyAuth, (req, res) => {
  webhookController.testWebhook(req, res);
});

export default router;
